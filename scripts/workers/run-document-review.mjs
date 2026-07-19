import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { reviewOpportunityDocuments } from "./document-review-contract.mjs";
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

async function claim(supabase) {
  const { data: queued, error: queueError } = await supabase.from("tenant_agent_runs")
    .select("id, tenant_id, opportunity_id, opportunity_version_id, requested_by")
    .eq("agent_key", "document_review").eq("status", "queued")
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const { data, error } = await supabase.from("tenant_agent_runs")
    .update({ status: "preparing_context", started_at: new Date().toISOString(), updated_at: new Date().toISOString(), error: null })
    .eq("id", queued.id).eq("status", "queued").select("id").maybeSingle();
  if (error) throw error;
  return data ? queued : null;
}

async function loadVersion(supabase, run) {
  const [agentResult, versionResult] = await Promise.all([
    supabase.from("tenant_agent_configs").select("status, enabled")
      .eq("tenant_id", run.tenant_id).eq("agent_key", "document_review").maybeSingle(),
    supabase.from("platform_opportunity_versions").select(`
      id, content_hash, source_url, official_url, bases_url, deadline_text, deadline_confidence,
      eligibility_text, criteria_text, required_documents_text, submission_channel_text, version_status
    `).eq("id", run.opportunity_version_id).single()
  ]);
  if (agentResult.error) throw agentResult.error;
  if (versionResult.error) throw versionResult.error;
  if (agentResult.data?.status !== "ready" || !agentResult.data.enabled) throw new Error("Revisión documental no habilitada.");
  if (versionResult.data.version_status !== "current") throw new Error("La versión de convocatoria ya no está vigente.");
  const version = versionResult.data;
  return {
    id: version.id, contentHash: version.content_hash, sourceUrl: version.source_url,
    officialUrl: version.official_url, basesUrl: version.bases_url,
    deadlineText: version.deadline_text, deadlineConfidence: version.deadline_confidence,
    eligibilityText: version.eligibility_text, criteriaText: version.criteria_text,
    requiredDocumentsText: version.required_documents_text,
    submissionChannelText: version.submission_channel_text
  };
}

async function main() {
  await prepareEnv();
  const supabase = client();
  const run = await claim(supabase);
  if (!run) return console.log(JSON.stringify({ mode: "idle", message: "No hay revisiones documentales en cola." }, null, 2));
  await recordAgentRunAudit(supabase, run, "document_review.started", "document-review-worker");
  try {
    const version = await loadVersion(supabase, run);
    const review = reviewOpportunityDocuments(version);
    const now = new Date().toISOString();
    const { data: stored, error: storeError } = await supabase.from("tenant_document_reviews").upsert({
      tenant_id: run.tenant_id, opportunity_id: run.opportunity_id,
      opportunity_version_id: run.opportunity_version_id, agent_run_id: run.id,
      requirements_json: review.requirements, risks_json: review.risks,
      source_manifest_json: review.sourceManifest, human_review_status: "pending",
      reviewed_by: null, reviewed_at: null, updated_at: now
    }, { onConflict: "tenant_id,opportunity_version_id" }).select("id").single();
    if (storeError) throw storeError;
    const { error: runError } = await supabase.from("tenant_agent_runs").update({
      status: "review_required", provider: "deterministic_document_review",
      context_manifest_json: review.sourceManifest,
      output_json: { documentReviewId: stored.id, requirementCount: review.requirements.length, riskCount: review.risks.length, humanReviewRequired: true },
      usage_json: { external_ai_calls: 0 }, finished_at: now, updated_at: now
    }).eq("id", run.id);
    if (runError) throw runError;
    await supabase.from("audit_events").insert({
      tenant_id: run.tenant_id, actor_user_id: run.requested_by, actor_label: "document-review-worker",
      action: "document_review.generated_for_review", target_type: "agent_run", target_id: run.id,
      detail_json: { requirements: review.requirements.length, risks: review.risks.length, external_ai_calls: 0 }
    });
    console.log(JSON.stringify({ mode: "reviewed", runId: run.id, reviewId: stored.id, requirements: review.requirements.length }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await supabase.from("tenant_agent_runs").update({ status: "failed", error: message.slice(0, 4000), finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
    await recordAgentRunAudit(supabase, run, "document_review.failed", "document-review-worker", { error: message.slice(0, 500) }).catch(() => {});
    throw error;
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
