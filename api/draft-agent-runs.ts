import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";
import { loadApprovedBases } from "../src/platformBases.js";
import { privateFactSourceTypes, retrieveApprovedFacts } from "../src/privateFactRetrieval.mjs";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hasReviewableOutput(output: any) {
  return Array.isArray(output?.documents) && output.documents.length > 0
    && Array.isArray(output?.documentPlan) && output.documentPlan.length > 0
    && output.humanReviewRequired === true && output.submissionAllowed === false;
}

function isMissingDraftReviewSchema(error: any) {
  return ["42P01", "PGRST205"].includes(String(error?.code || ""))
    || /tenant_draft_reviews.*(?:not exist|schema cache)/i.test(String(error?.message || ""));
}

async function dispatchDraftWorker() {
  const token = process.env.DRAFT_WORKER_GITHUB_TOKEN;
  const repository = process.env.DRAFT_WORKER_GITHUB_REPOSITORY;
  const ref = process.env.DRAFT_WORKER_GITHUB_REF || "main";
  if (!token || !repository) return { status: "fallback_cron" as const };
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    return { status: "fallback_cron" as const };
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/workers-alojados.yml/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "subvenciones-draft-orchestrator",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({ ref, inputs: { proceso: "redactor" } })
    });
    return { status: response.status === 204 ? "requested" as const : "fallback_cron" as const };
  } catch {
    return { status: "fallback_cron" as const };
  }
}

async function approvedFactIds(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, enabled: boolean, queryParts: unknown[]) {
  if (!enabled) return { refs: [], candidateCount: 0 };
  const { data: consent, error: consentError } = await supabase.from("tenant_data_consents")
    .select("id").eq("tenant_id", tenantId).eq("consent_type", "ai_processing").eq("status", "granted")
    .order("granted_at", { ascending: false }).limit(1).maybeSingle();
  if (consentError) throw consentError;
  if (!consent) throw new Error("Falta consentimiento vigente para usar hechos internos con IA");
  const { data, error } = await supabase.from("tenant_profile_suggestions")
    .select("id, field_key, suggested_value, source_type, confidence, reviewed_at, metadata_json")
    .eq("tenant_id", tenantId).eq("status", "approved").in("source_type", privateFactSourceTypes)
    .order("reviewed_at", { ascending: false }).limit(200);
  if (error) throw error;
  return { refs: retrieveApprovedFacts(data || [], queryParts), candidateCount: (data || []).length };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requireSourcePermission(req.headers.authorization, req.method === "GET" ? "sources:read" : "sources:write", requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase.from("tenant_agent_runs")
        .select("id, agent_key, status, provider, model, error, use_approved_internal_facts, input_manifest_json, context_manifest_json, output_json, usage_json, created_at, updated_at, finished_at")
        .eq("tenant_id", actor.tenantId).eq("agent_key", "draft_agent")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      const approvedKnowledge = await supabase.from("tenant_profile_suggestions")
        .select("reviewed_at", { count: "exact" })
        .eq("tenant_id", actor.tenantId).eq("status", "approved").in("source_type", privateFactSourceTypes)
        .order("reviewed_at", { ascending: false }).limit(1);
      if (approvedKnowledge.error) throw approvedKnowledge.error;
      const runIds = (data || []).map((run) => run.id);
      const reviews = runIds.length ? await supabase.from("tenant_draft_reviews")
        .select("id, agent_run_id, status, review_note, reviewed_at, docx_blob_path, pdf_blob_path, validation_json")
        .eq("tenant_id", actor.tenantId).in("agent_run_id", runIds) : { data: [], error: null };
      if (reviews.error && !isMissingDraftReviewSchema(reviews.error)) throw reviews.error;
      const reviewByRun = new Map((reviews.data || []).map((review) => [review.agent_run_id, review]));
      return res.status(200).json(ok({
        runs: (data || []).map((run) => ({ ...run, human_review: reviewByRun.get(run.id) || null })),
        approvedKnowledge: {
          factCount: approvedKnowledge.count || 0,
          latestApprovedAt: approvedKnowledge.data?.[0]?.reviewed_at || null
        }
      }));
    }

    if (req.method === "PATCH") {
      const { runId, reviewStatus, note = "" } = req.body || {};
      if (typeof runId !== "string" || !runId) return res.status(400).json(fail("Falta runId"));
      if (!new Set(["approved", "rejected"]).has(reviewStatus)) return res.status(400).json(fail("reviewStatus invalido"));
      if (reviewStatus === "rejected" && !String(note || "").trim()) return res.status(400).json(fail("Indica el motivo del rechazo"));
      const { data: run, error: runError } = await supabase.from("tenant_agent_runs")
        .select("id, opportunity_version_id, status, output_json").eq("id", runId).eq("tenant_id", actor.tenantId)
        .eq("agent_key", "draft_agent").maybeSingle();
      if (runError) throw runError;
      if (!run) return res.status(404).json(fail("Borrador no encontrado"));
      if (run.status !== "review_required") return res.status(409).json(fail("El borrador aun no esta listo para revision humana"));
      if (!hasReviewableOutput(run.output_json)) return res.status(409).json(fail("Borrador incompleto: no contiene documentos y plan documental revisables"));
      const editedVersion = await supabase.from("tenant_draft_versions").select("id")
        .eq("tenant_id", actor.tenantId).eq("agent_run_id", run.id).limit(1).maybeSingle();
      if (editedVersion.error && !["42P01", "PGRST205"].includes(String(editedVersion.error.code || ""))) throw editedVersion.error;
      if (editedVersion.data) return res.status(409).json(fail("Este borrador tiene versiones humanas: revísalo y apruébalo desde el editor documental"));
      const outputHash = digest(run.output_json);
      const now = new Date().toISOString();
      const { data: review, error } = await supabase.from("tenant_draft_reviews").upsert({
        tenant_id: actor.tenantId, agent_run_id: run.id, opportunity_version_id: run.opportunity_version_id,
        status: reviewStatus, output_hash: outputHash, review_note: String(note || "").trim().slice(0, 3000),
        reviewed_by: actor.userId, reviewed_at: now, updated_at: now
      }, { onConflict: "agent_run_id" }).select("id, agent_run_id, status, review_note, reviewed_at").single();
      if (error) throw error;
      await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.email,
        action: `draft_agent.${reviewStatus}`, target_type: "draft_review", target_id: review.id,
        detail_json: { agent_run_id: run.id, output_hash: outputHash, export_allowed: reviewStatus === "approved", submission_allowed: false }
      });
      return res.status(200).json(ok({ review, message: reviewStatus === "approved"
        ? "Expediente aprobado para generar el ZIP documental, DOCX y PDF privados; la presentacion sigue prohibida."
        : "Borrador rechazado. No puede exportarse." }));
    }

    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
    const { canonicalKey, useApprovedInternalFacts = false } = req.body || {};
    if (typeof canonicalKey !== "string" || !canonicalKey) return res.status(400).json(fail("Falta canonicalKey"));
    if (typeof useApprovedInternalFacts !== "boolean") return res.status(400).json(fail("useApprovedInternalFacts debe ser booleano"));

    const { data: opportunity, error: opportunityError } = await supabase.from("platform_opportunities")
      .select("id, canonical_key, title, status").eq("canonical_key", canonicalKey).maybeSingle();
    if (opportunityError) throw opportunityError;
    if (!opportunity) return res.status(404).json(fail("Oportunidad no encontrada"));
    if (opportunity.status !== "open") return res.status(409).json(fail("La oportunidad no está abierta"));

    const { data: version, error: versionError } = await supabase.from("platform_opportunity_versions")
      .select("id, content_hash, source_url, deadline_status, evidence_json, eligibility_text, criteria_text, required_documents_text, amount_text").eq("opportunity_id", opportunity.id)
      .eq("version_status", "current").maybeSingle();
    if (versionError) throw versionError;
    if (!version) return res.status(409).json(fail("La oportunidad no tiene versión oficial vigente"));
    if (version.deadline_status !== "open") return res.status(409).json(fail("El plazo vigente no está confirmado como abierto"));

    const approvedBases = await loadApprovedBases(supabase, version.id, actor.tenantId);
    if (approvedBases.requirementsContract.documentaryGate !== "requirements_approved") {
      return res.status(409).json(fail("Redaccion bloqueada: faltan bases aprobadas sobre beneficiarios, actuaciones, documentos o presentacion"));
    }
    const constraints = approvedBases.proposalConstraints?.draftingGate === "constraints_verified"
      ? approvedBases.proposalConstraints : version.evidence_json?.proposal_constraints;
    if (constraints?.draftingGate !== "constraints_verified") {
      return res.status(409).json(fail("Redacción bloqueada: faltan límites oficiales verificados"));
    }
    const retrieval = await approvedFactIds(supabase, actor.tenantId, useApprovedInternalFacts, [
      opportunity.title, version.eligibility_text, version.criteria_text, version.required_documents_text, version.amount_text
    ]);
    const manifest = {
      canonicalKey: opportunity.canonical_key,
      title: opportunity.title,
      sourceUrl: version.source_url,
      versionContentHash: version.content_hash,
      proposalConstraintsHash: digest(constraints),
      requirementsContractHash: digest(approvedBases.requirementsContract),
      basesInterpretationIds: approvedBases.approvedInterpretationIds,
      approvedFactRefs: retrieval.refs,
      privateRetrieval: useApprovedInternalFacts ? {
        mode: "approved_fact_hybrid_v1", candidateCount: retrieval.candidateCount,
        selectedCount: retrieval.refs.length,
        queryHash: digest([opportunity.title, version.eligibility_text, version.criteria_text, version.required_documents_text, version.amount_text])
      } : null,
      allowedDataClasses: useApprovedInternalFacts ? ["public", "internal_approved"] : ["public"],
      humanReviewRequired: true,
      externalSubmissionAllowed: false
    };
    const { data: run, error: runError } = await supabase.from("tenant_agent_runs").insert({
      tenant_id: actor.tenantId,
      agent_key: "draft_agent",
      opportunity_id: opportunity.id,
      opportunity_version_id: version.id,
      status: "queued",
      use_approved_internal_facts: useApprovedInternalFacts,
      input_manifest_json: manifest,
      requested_by: actor.userId
    }).select("id, status, input_manifest_json, created_at").single();
    if (runError?.code === "23505") return res.status(409).json(fail("Ya existe una ejecución activa del redactor para esta oportunidad"));
    if (runError) throw runError;
    const dispatch = await dispatchDraftWorker();
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.email,
      action: "draft_agent.queued", target_type: "agent_run", target_id: run.id,
      detail_json: { opportunity: canonicalKey, use_approved_internal_facts: useApprovedInternalFacts,
        private_retrieval_mode: manifest.privateRetrieval?.mode || null, fact_candidates: retrieval.candidateCount,
        facts_selected: retrieval.refs.length, retrieval_query_hash: manifest.privateRetrieval?.queryHash || null,
        constraints_hash: manifest.proposalConstraintsHash, worker_dispatch: dispatch.status }
    });
    return res.status(202).json(ok({ run, message: "Redactor encolado con evidencia y revisión humana obligatoria." }));
  } catch (error) {
    if (isMissingDraftReviewSchema(error)) return res.status(503).json(fail("La revision final de borradores aun no esta activada en este entorno"));
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") || message.includes("no incluido") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : message.includes("consentimiento") ? 409 : 400;
    return res.status(status).json(fail(message));
  }
}
