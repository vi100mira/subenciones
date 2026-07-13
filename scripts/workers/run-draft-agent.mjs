import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { contractForConstraints, validateDraftOutput } from "./draft-agent-contract.mjs";
import { generatePublicDraft, maximumRunCostEur } from "./openai-draft-provider.mjs";

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

function providerReady() {
  return process.env.AI_DRAFT_PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY);
}

async function claim(supabase, ready) {
  const statuses = ready ? ["queued", "awaiting_provider"] : ["queued"];
  const { data: queued, error: queueError } = await supabase.from("tenant_agent_runs")
    .select("id, tenant_id, opportunity_id, opportunity_version_id, use_approved_internal_facts, input_manifest_json, requested_by, status")
    .in("status", statuses).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const { data, error } = await supabase.from("tenant_agent_runs")
    .update({ status: "preparing_context", started_at: new Date().toISOString(), updated_at: new Date().toISOString(), error: null })
    .eq("id", queued.id).eq("status", queued.status || statuses[0]).select("id").maybeSingle();
  if (error) throw error;
  return data ? queued : null;
}

async function contextManifest(supabase, run) {
  if (run.use_approved_internal_facts) throw new Error("La fase autorizada solo permite evidencia pública; los hechos internos no se enviarán.");
  const { data: version, error: versionError } = await supabase.from("platform_opportunity_versions")
    .select("id, source_url, official_url, bases_url, content_hash, deadline_text, deadline_status, amount_text, eligibility_text, criteria_text, required_documents_text, submission_channel_text, evidence_json")
    .eq("id", run.opportunity_version_id).eq("version_status", "current").maybeSingle();
  if (versionError) throw versionError;
  if (!version || version.deadline_status !== "open") throw new Error("La versión oficial o el plazo dejaron de estar vigentes.");
  const constraints = version.evidence_json?.proposal_constraints;
  if (constraints?.draftingGate !== "constraints_verified") throw new Error("Los límites de redacción dejaron de estar verificados.");
  const { data: opportunity, error: opportunityError } = await supabase.from("platform_opportunities")
    .select("title, funder_name").eq("id", run.opportunity_id).single();
  if (opportunityError) throw opportunityError;
  return { manifest: {
    opportunityVersionId: version.id,
    publicEvidence: {
      sourceUrl: version.source_url,
      contentHash: version.content_hash,
      deadlineHash: hash(version.deadline_text),
      criteriaHash: hash(version.criteria_text),
      submissionChannelHash: hash(version.submission_channel_text),
      constraints
    },
    approvedFacts: [],
    allowedDataClasses: ["public"],
    rawPrivateTextPersisted: false,
    humanReviewRequired: true,
    externalSubmissionAllowed: false,
    outputContract: contractForConstraints(constraints)
  }, publicContext: {
    title: opportunity.title, funderName: opportunity.funder_name,
    sourceUrl: version.source_url, officialUrl: version.official_url, basesUrl: version.bases_url,
    deadlineText: version.deadline_text, amountText: version.amount_text,
    eligibilityText: version.eligibility_text, criteriaText: version.criteria_text,
    requiredDocumentsText: version.required_documents_text,
    submissionChannelText: version.submission_channel_text, constraints
  } };
}

async function currentMonthlySpend(supabase) {
  const since = new Date();
  since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase.from("tenant_agent_runs").select("usage_json")
    .eq("provider", "openai").gte("created_at", since.toISOString());
  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + Number(row.usage_json?.estimated_eur || 0), 0);
}

async function main() {
  await prepareEnv();
  const supabase = client();
  const ready = providerReady();
  const run = await claim(supabase, ready);
  if (!run) return console.log(JSON.stringify({ mode: "idle", message: "No hay ejecuciones del redactor en cola." }, null, 2));
  try {
    const prepared = await contextManifest(supabase, run);
    const manifest = prepared.manifest;
    const provider = process.env.AI_DRAFT_PROVIDER || null;
    if (!ready) {
      const status = "awaiting_provider";
      const { error } = await supabase.from("tenant_agent_runs").update({ status, provider, context_manifest_json: manifest, updated_at: new Date().toISOString() }).eq("id", run.id);
      if (error) throw error;
      console.log(JSON.stringify({ mode: "prepared", runId: run.id, status, provider }, null, 2));
      return;
    }
    const budget = Number(process.env.AI_DRAFT_MONTHLY_BUDGET_EUR || 20);
    const spent = await currentMonthlySpend(supabase);
    if (spent + maximumRunCostEur() > budget) throw new Error(`Presupuesto mensual del redactor agotado o insuficiente: ${spent.toFixed(4)} € de ${budget.toFixed(2)} €.`);
    const { error: generatingError } = await supabase.from("tenant_agent_runs").update({ status: "generating", provider, model: process.env.AI_DRAFT_MODEL || "gpt-5.6-luna", context_manifest_json: manifest, updated_at: new Date().toISOString() }).eq("id", run.id);
    if (generatingError) throw generatingError;
    const generated = await generatePublicDraft(prepared.publicContext);
    const validation = validateDraftOutput(generated.output, prepared.publicContext.constraints);
    const status = validation.valid ? "review_required" : "failed";
    const { error } = await supabase.from("tenant_agent_runs").update({
      status, provider, model: generated.model, context_manifest_json: manifest, output_json: generated.output,
      usage_json: { ...generated.usage, validationState: validation.validationState, validationErrors: validation.errors, publicOnly: true, responseId: generated.responseId },
      error: validation.valid ? null : validation.errors.join(" ").slice(0, 4000), finished_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", run.id);
    if (error) throw error;
    await supabase.from("audit_events").insert({
      tenant_id: run.tenant_id, actor_user_id: run.requested_by, actor_label: "draft-agent-worker",
      action: "draft_agent.generated_for_review", target_type: "agent_run", target_id: run.id,
      detail_json: { status, provider, model: generated.model, tokens: generated.usage.total_tokens, estimated_eur: generated.usage.estimated_eur, public_only: true, output_hash: hash(JSON.stringify(generated.output)), validation_state: validation.validationState }
    });
    console.log(JSON.stringify({ mode: "generated", runId: run.id, status, provider, model: generated.model, usage: generated.usage, validation: validation.validationState }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await supabase.from("tenant_agent_runs").update({ status: "failed", error: message.slice(0, 4000), finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
