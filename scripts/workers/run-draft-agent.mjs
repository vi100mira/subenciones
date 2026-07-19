import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { contractForConstraints, validateDraftOutput } from "./draft-agent-contract.mjs";
import { generatePublicDraft, maximumRunCostEur } from "./openai-draft-provider.mjs";
import { recordAgentRunAudit } from "./agent-run-audit.mjs";

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

async function approvedRequirements(supabase, versionId) {
  const { data, error } = await supabase.from("platform_bases_interpretations")
    .select("id, citations_verified, contract_json").eq("opportunity_version_id", versionId)
    .eq("status", "approved");
  if (error) throw error;
  const rows = (data || []).filter((row) => row.citations_verified);
  const sections = {};
  const limits = [];
  const formatRules = [];
  for (const row of rows) {
    for (const [key, clauses] of Object.entries(row.contract_json?.sections || {})) {
      sections[key] = [...(sections[key] || []), ...(clauses || [])];
    }
    limits.push(...(row.contract_json?.proposalConstraints?.limits || []));
    formatRules.push(...(row.contract_json?.proposalConstraints?.formatRules || []));
  }
  const missing = ["beneficiaries", "eligibleActivities", "requiredDocuments", "submission"]
    .filter((key) => !sections[key]?.length);
  if (!rows.length || missing.length) throw new Error(`Las bases aprobadas dejaron de estar completas: ${missing.join(", ") || "sin interpretacion aprobada"}.`);
  return { schemaVersion: 1, status: "approved", documentaryGate: "requirements_approved", sections,
    proposalConstraints: { status: limits.length ? "verified" : "not_found_requires_review",
      draftingGate: limits.length ? "constraints_verified" : "blocked_pending_constraint_review",
      requiresRenderedValidation: limits.some((item) => ["pages", "folios", "sides"].includes(item.unit)),
      limits, formatRules }, interpretationIds: rows.map((row) => row.id) };
}

async function claim(supabase, ready) {
  const statuses = ready ? ["queued", "awaiting_provider"] : ["queued"];
  const { data: queued, error: queueError } = await supabase.from("tenant_agent_runs")
    .select("id, tenant_id, opportunity_id, opportunity_version_id, use_approved_internal_facts, input_manifest_json, requested_by, status")
    .eq("agent_key", "draft_agent").in("status", statuses)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const { data, error } = await supabase.from("tenant_agent_runs")
    .update({ status: "preparing_context", started_at: new Date().toISOString(), updated_at: new Date().toISOString(), error: null })
    .eq("id", queued.id).eq("status", queued.status || statuses[0]).select("id").maybeSingle();
  if (error) throw error;
  return data ? queued : null;
}

async function approvedFactContext(supabase, run) {
  if (!run.use_approved_internal_facts) return [];
  const { data: consent, error: consentError } = await supabase.from("tenant_data_consents")
    .select("id").eq("tenant_id", run.tenant_id).eq("consent_type", "ai_processing").eq("status", "granted")
    .order("granted_at", { ascending: false }).limit(1).maybeSingle();
  if (consentError) throw consentError;
  if (!consent) throw new Error("El consentimiento para usar hechos internos con IA ya no esta vigente.");
  const selected = (run.input_manifest_json?.approvedFactRefs || []).slice(0, 20);
  const ids = selected.map((fact) => fact.id).filter(Boolean);
  const selectionById = new Map(selected.map((fact) => [fact.id, fact]));
  if (!ids.length) return [];
  const { data, error } = await supabase.from("tenant_profile_suggestions")
    .select("id, field_key, suggested_value, source_type, confidence, source_sha256")
    .eq("tenant_id", run.tenant_id).eq("status", "approved")
    .in("source_type", ["guided_interview", "manual_entry", "uploaded_document"]).in("id", ids);
  if (error) throw error;
  return (data || []).map((fact) => ({
    id: fact.id, fieldKey: String(fact.field_key || "").slice(0, 100),
    value: String(fact.suggested_value || "").slice(0, 1200), sourceType: fact.source_type,
    confidence: fact.confidence, sourceSha256: fact.source_sha256 || null,
    retrievalScore: Number(selectionById.get(fact.id)?.retrievalScore || 0),
    matchedTerms: (selectionById.get(fact.id)?.matchedTerms || []).slice(0, 8)
  }));
}

async function contextManifest(supabase, run) {
  const approvedFacts = await approvedFactContext(supabase, run);
  const { data: version, error: versionError } = await supabase.from("platform_opportunity_versions")
    .select("id, source_url, official_url, bases_url, content_hash, deadline_text, deadline_status, amount_text, eligibility_text, criteria_text, required_documents_text, submission_channel_text, evidence_json")
    .eq("id", run.opportunity_version_id).eq("version_status", "current").maybeSingle();
  if (versionError) throw versionError;
  if (!version || version.deadline_status !== "open") throw new Error("La versión oficial o el plazo dejaron de estar vigentes.");
  const requirementsContract = await approvedRequirements(supabase, version.id);
  const constraints = requirementsContract.proposalConstraints.draftingGate === "constraints_verified"
    ? requirementsContract.proposalConstraints : version.evidence_json?.proposal_constraints;
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
      constraints,
      requirementsContractHash: hash(JSON.stringify(requirementsContract)),
      basesInterpretationIds: requirementsContract.interpretationIds
    },
    approvedFactRefs: approvedFacts.map((fact) => ({ id: fact.id, sourceType: fact.sourceType, sourceSha256: fact.sourceSha256 })),
    privateRetrieval: run.input_manifest_json?.privateRetrieval || null,
    allowedDataClasses: approvedFacts.length ? ["public", "internal_approved"] : ["public"],
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
    submissionChannelText: version.submission_channel_text, constraints, requirementsContract, approvedFacts
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
  await recordAgentRunAudit(supabase, run, "draft_agent.started", "draft-agent-worker");
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
    const validation = validateDraftOutput(generated.output, prepared.publicContext.constraints, prepared.publicContext.requirementsContract);
    const status = validation.valid ? "review_required" : "failed";
    const { error } = await supabase.from("tenant_agent_runs").update({
      status, provider, model: generated.model, context_manifest_json: manifest, output_json: generated.output,
      usage_json: { ...generated.usage, validationState: validation.validationState, validationErrors: validation.errors, documentCoverage: validation.documentCoverage, generatedDocuments: validation.generatedDocuments, publicOnly: !run.use_approved_internal_facts, approvedFactCount: prepared.publicContext.approvedFacts.length, responseId: generated.responseId },
      error: validation.valid ? null : validation.errors.join(" ").slice(0, 4000), finished_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", run.id);
    if (error) throw error;
    await supabase.from("audit_events").insert({
      tenant_id: run.tenant_id, actor_user_id: run.requested_by, actor_label: "draft-agent-worker",
      action: "draft_agent.generated_for_review", target_type: "agent_run", target_id: run.id,
      detail_json: { status, provider, model: generated.model, tokens: generated.usage.total_tokens, estimated_eur: generated.usage.estimated_eur, public_only: !run.use_approved_internal_facts, approved_fact_count: prepared.publicContext.approvedFacts.length, output_hash: hash(JSON.stringify(generated.output)), validation_state: validation.validationState, document_coverage: validation.documentCoverage, generated_documents: validation.generatedDocuments }
    });
    console.log(JSON.stringify({ mode: "generated", runId: run.id, status, provider, model: generated.model, usage: generated.usage, validation: validation.validationState }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await supabase.from("tenant_agent_runs").update({ status: "failed", error: message.slice(0, 4000), finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
    await recordAgentRunAudit(supabase, run, "draft_agent.failed", "draft-agent-worker", { error: message.slice(0, 500) }).catch(() => {});
    throw error;
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
