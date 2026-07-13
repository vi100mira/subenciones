import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

function loadEnv(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function prepareEnv() {
  for (const file of [".env.local", ".env"]) {
    try { loadEnv(await fs.readFile(file, "utf8")); } catch { /* configuración local opcional */ }
  }
}

function client() {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function safeApprovedFact(value) {
  const text = String(value || "").trim();
  if (!text || text.length > 1000) return false;
  return !/(?:contrase(?:ñ|n)a|password|api[_ -]?key|token|\b(?:dni|nie)\b|historia\s+cl[ií]nica|expediente\s+personal)|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text);
}

async function claim(supabase) {
  const { data: queued, error: queueError } = await supabase.from("tenant_agent_runs")
    .select("id, tenant_id, opportunity_id, opportunity_version_id, use_approved_internal_facts, input_manifest_json, requested_by")
    .eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const { data, error } = await supabase.from("tenant_agent_runs")
    .update({ status: "preparing_context", started_at: new Date().toISOString(), updated_at: new Date().toISOString(), error: null })
    .eq("id", queued.id).eq("status", "queued").select("id").maybeSingle();
  if (error) throw error;
  return data ? queued : null;
}

async function approvedFacts(supabase, run) {
  if (!run.use_approved_internal_facts) return [];
  const { data: consent, error: consentError } = await supabase.from("tenant_data_consents")
    .select("id").eq("tenant_id", run.tenant_id).eq("consent_type", "ai_processing").eq("status", "granted")
    .order("granted_at", { ascending: false }).limit(1).maybeSingle();
  if (consentError) throw consentError;
  if (!consent) throw new Error("El consentimiento de IA ya no está vigente.");
  const ids = (run.input_manifest_json?.approvedFactRefs || []).map((item) => item.id).filter(Boolean);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("tenant_profile_suggestions")
    .select("id, field_key, suggested_value, source_type, source_ref").eq("tenant_id", run.tenant_id)
    .eq("status", "approved").in("id", ids);
  if (error) throw error;
  if ((data || []).some((fact) => !safeApprovedFact(fact.suggested_value))) {
    throw new Error("Un hecho aprobado contiene identificadores, secretos o longitud no permitida para IA externa.");
  }
  return data || [];
}

async function contextManifest(supabase, run) {
  const { data: version, error: versionError } = await supabase.from("platform_opportunity_versions")
    .select("id, source_url, content_hash, deadline_text, deadline_status, criteria_text, submission_channel_text, evidence_json")
    .eq("id", run.opportunity_version_id).eq("version_status", "current").maybeSingle();
  if (versionError) throw versionError;
  if (!version || version.deadline_status !== "open") throw new Error("La versión oficial o el plazo dejaron de estar vigentes.");
  const constraints = version.evidence_json?.proposal_constraints;
  if (constraints?.draftingGate !== "constraints_verified") throw new Error("Los límites de redacción dejaron de estar verificados.");
  const facts = await approvedFacts(supabase, run);
  return {
    opportunityVersionId: version.id,
    publicEvidence: {
      sourceUrl: version.source_url,
      contentHash: version.content_hash,
      deadlineHash: hash(version.deadline_text),
      criteriaHash: hash(version.criteria_text),
      submissionChannelHash: hash(version.submission_channel_text),
      constraints
    },
    approvedFacts: facts.map((fact) => ({ id: fact.id, fieldKey: fact.field_key, sourceType: fact.source_type, sourceRef: fact.source_ref, valueHash: hash(fact.suggested_value), characterCount: fact.suggested_value.length })),
    allowedDataClasses: facts.length ? ["public", "internal_approved"] : ["public"],
    rawPrivateTextPersisted: false,
    humanReviewRequired: true,
    externalSubmissionAllowed: false
  };
}

async function main() {
  await prepareEnv();
  const supabase = client();
  const run = await claim(supabase);
  if (!run) return console.log(JSON.stringify({ mode: "idle", message: "No hay ejecuciones del redactor en cola." }, null, 2));
  try {
    const manifest = await contextManifest(supabase, run);
    const provider = process.env.AI_DRAFT_PROVIDER || null;
    const status = "awaiting_provider";
    const { error } = await supabase.from("tenant_agent_runs").update({
      status, provider, context_manifest_json: manifest, updated_at: new Date().toISOString()
    }).eq("id", run.id);
    if (error) throw error;
    await supabase.from("audit_events").insert({
      tenant_id: run.tenant_id, actor_user_id: run.requested_by, actor_label: "draft-agent-worker",
      action: "draft_agent.context_prepared", target_type: "agent_run", target_id: run.id,
      detail_json: { status, provider, fact_count: manifest.approvedFacts.length, data_classes: manifest.allowedDataClasses, constraints: manifest.publicEvidence.constraints, raw_private_text_persisted: false }
    });
    console.log(JSON.stringify({ mode: "prepared", runId: run.id, status, provider, factCount: manifest.approvedFacts.length, constraints: manifest.publicEvidence.constraints }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await supabase.from("tenant_agent_runs").update({ status: "failed", error: message.slice(0, 4000), finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
