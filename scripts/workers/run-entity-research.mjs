import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { crawlPublicWebsite } from "./entity-research-contract.mjs";
import { recordAgentRunAudit } from "./agent-run-audit.mjs";

function loadEnv(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function prepareEnv() {
  for (const file of [".env.local", ".env"]) {
    try { loadEnv(await fs.readFile(file, "utf8")); } catch { /* entorno alojado */ }
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

async function claim(supabase) {
  const { data: queued, error: queueError } = await supabase.from("tenant_agent_runs")
    .select("id, tenant_id, input_manifest_json, requested_by, status")
    .eq("agent_key", "entity_research").eq("status", "queued")
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const { data, error } = await supabase.from("tenant_agent_runs")
    .update({ status: "preparing_context", started_at: new Date().toISOString(), updated_at: new Date().toISOString(), error: null })
    .eq("id", queued.id).eq("status", "queued").select("id").maybeSingle();
  if (error) throw error;
  return data ? queued : null;
}

async function loadContext(supabase, run) {
  const [agentResult, consentResult, sourceResult] = await Promise.all([
    supabase.from("tenant_agent_configs").select("status, enabled, permissions_json")
      .eq("tenant_id", run.tenant_id).eq("agent_key", "entity_research").maybeSingle(),
    supabase.from("tenant_data_consents").select("id, granted_at, scope_json")
      .eq("tenant_id", run.tenant_id).eq("consent_type", "public_web_analysis").eq("status", "granted")
      .order("granted_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("source_connections").select("id, config_json, approved_at")
      .eq("tenant_id", run.tenant_id).eq("label", "Web pública de la entidad").eq("status", "active")
      .limit(1).maybeSingle()
  ]);
  if (agentResult.error) throw agentResult.error;
  if (consentResult.error) throw consentResult.error;
  if (sourceResult.error) throw sourceResult.error;
  if (agentResult.data?.status !== "ready" || !agentResult.data?.enabled) throw new Error("El Investigador de entidad no está habilitado.");
  if (!consentResult.data) throw new Error("Falta consentimiento vigente para analizar la web pública.");
  const baseUrl = sourceResult.data?.config_json?.base_url;
  if (!sourceResult.data || typeof baseUrl !== "string") throw new Error("Falta una fuente web pública aprobada.");
  return { agent: agentResult.data, consent: consentResult.data, source: sourceResult.data, baseUrl };
}

async function persistPages(supabase, run, context, research) {
  const documents = [];
  for (const page of research.pages) {
    const urlHash = hash(page.url);
    const { data, error } = await supabase.from("source_documents").upsert({
      tenant_id: run.tenant_id,
      source_connection_id: context.source.id,
      external_id: `entity-web:${urlHash}`,
      title: page.title || page.url,
      path: `entity-web/${urlHash}.txt`,
      mime_type: "text/plain",
      data_class: "public",
      source_url: page.url,
      source_sha256: page.textSha256,
      source_size_bytes: Buffer.byteLength(page.text, "utf8"),
      extracted_text: page.text,
      extraction_status: "ready",
      metadata_json: { description: page.description, logo_candidates: page.logoCandidates, research_run_id: run.id },
      updated_at: new Date().toISOString()
    }, { onConflict: "tenant_id,source_connection_id,external_id" })
      .select("id, source_url, source_sha256").single();
    if (error) throw error;
    documents.push(data);
  }
  return documents;
}

async function persistSuggestions(supabase, run, research, documents) {
  const byUrl = new Map(documents.map((document) => [document.source_url, document]));
  const { error: supersedeError } = await supabase.from("tenant_profile_suggestions")
    .update({ status: "superseded" }).eq("tenant_id", run.tenant_id)
    .eq("source_type", "public_web").eq("status", "pending");
  if (supersedeError) throw supersedeError;
  if (!research.suggestions.length) return [];
  const rows = research.suggestions.map((suggestion) => ({
    tenant_id: run.tenant_id,
    field_key: suggestion.fieldKey,
    suggested_value: suggestion.value,
    source_type: "public_web",
    source_ref: suggestion.sourceRef,
    source_document_id: byUrl.get(suggestion.sourceRef)?.id || null,
    evidence_excerpt: suggestion.evidenceExcerpt,
    source_sha256: suggestion.sourceSha256,
    confidence: suggestion.confidence,
    status: "pending",
    metadata_json: { research_run_id: run.id, data_class: "public" }
  }));
  const { data, error } = await supabase.from("tenant_profile_suggestions").insert(rows).select("id, field_key, status");
  if (error) throw error;
  return data || [];
}

async function main() {
  await prepareEnv();
  const supabase = client();
  const run = await claim(supabase);
  if (!run) return console.log(JSON.stringify({ mode: "idle", message: "No hay investigaciones de entidad en cola." }, null, 2));
  await recordAgentRunAudit(supabase, run, "entity_research.started", "entity-research-worker");
  try {
    const context = await loadContext(supabase, run);
    const research = await crawlPublicWebsite(context.baseUrl);
    const documents = await persistPages(supabase, run, context, research);
    const suggestions = await persistSuggestions(supabase, run, research, documents);
    const manifest = {
      sourceConnectionId: context.source.id,
      consentId: context.consent.id,
      baseUrl: context.baseUrl,
      allowedDataClasses: ["public"],
      pageHashes: documents.map((document) => document.source_sha256),
      humanReviewRequired: true,
      externalSubmissionAllowed: false
    };
    const output = {
      stats: research.stats,
      documentIds: documents.map((document) => document.id),
      suggestionIds: suggestions.map((suggestion) => suggestion.id),
      reviewRequired: true
    };
    const { error } = await supabase.from("tenant_agent_runs").update({
      status: "review_required",
      provider: "deterministic_public_web",
      context_manifest_json: manifest,
      output_json: output,
      usage_json: { pages: research.stats.pages, bytes: research.stats.bytes, external_ai_calls: 0 },
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", run.id);
    if (error) throw error;
    await supabase.from("audit_events").insert({
      tenant_id: run.tenant_id,
      actor_user_id: run.requested_by,
      actor_label: "entity-research-worker",
      action: "entity_research.generated_for_review",
      target_type: "agent_run",
      target_id: run.id,
      detail_json: { pages: documents.length, suggestions: suggestions.length, public_only: true, external_ai_calls: 0 }
    });
    console.log(JSON.stringify({ mode: "researched", runId: run.id, pages: documents.length, suggestions: suggestions.length }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await supabase.from("tenant_agent_runs").update({
      status: "failed", error: message.slice(0, 4000), finished_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", run.id);
    await recordAgentRunAudit(supabase, run, "entity_research.failed", "entity-research-worker", { error: message.slice(0, 500) }).catch(() => {});
    throw error;
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
