import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { fail, ok } from "../src/apiResponse.js";
import { isEditableDraft } from "../src/draftDocumentVersion.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

const ACTIVE_STAGES = ["documents_pending", "documents_ready", "active"];
const MAX_ACTIVE_DOCUMENTS = 20;

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function clean(value: unknown, maximum = 300) {
  return String(value || "").trim().slice(0, maximum);
}

function editableParagraphs(value: unknown, fallback: string) {
  const source = String(value || "").trim().slice(0, 25_000);
  const parts = source.split(/\n\s*\n/).map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean).slice(0, 28).map((item) => item.slice(0, 5_000));
  return parts.length ? parts : [fallback];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    const recommendationId = clean(req.body?.recommendationId, 100);
    const sourceDocumentId = clean(req.body?.sourceDocumentId, 100);
    if (!recommendationId || !sourceDocumentId) return res.status(400).json(fail("Falta la candidatura o el documento"));
    const supabase = getSupabaseAdmin();
    await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
    const [candidate, source] = await Promise.all([
      supabase.from("tenant_opportunity_recommendations")
        .select("id, decision_status, candidacy_stage, opportunity_id, opportunity_version_id")
        .eq("id", recommendationId).eq("tenant_id", actor.tenantId).maybeSingle(),
      supabase.from("source_documents")
        .select("id, title, mime_type, data_class, source_sha256, extracted_text, metadata_json")
        .eq("id", sourceDocumentId).eq("tenant_id", actor.tenantId).maybeSingle()
    ]);
    if (candidate.error) throw candidate.error;
    if (source.error) throw source.error;
    if (!candidate.data || candidate.data.decision_status !== "preselected"
      || !ACTIVE_STAGES.includes(candidate.data.candidacy_stage)) {
      return res.status(409).json(fail("La candidatura elegida no está activa"));
    }
    if (!source.data || source.data.data_class !== "internal"
      || source.data.metadata_json?.review_status !== "approved") {
      return res.status(409).json(fail("Solo puede adaptarse un documento interno aprobado de esta entidad"));
    }
    const [opportunity, version] = await Promise.all([
      supabase.from("platform_opportunities").select("canonical_key, title")
        .eq("id", candidate.data.opportunity_id).maybeSingle(),
      supabase.from("platform_opportunity_versions").select("id, version_status")
        .eq("id", candidate.data.opportunity_version_id).maybeSingle()
    ]);
    if (opportunity.error) throw opportunity.error;
    if (version.error) throw version.error;
    if (!opportunity.data || version.data?.version_status !== "current") {
      return res.status(409).json(fail("La candidatura no conserva una versión vigente de la convocatoria"));
    }
    const previousRun = await supabase.from("tenant_agent_runs").select("id, output_json")
      .eq("tenant_id", actor.tenantId).eq("agent_key", "draft_agent")
      .eq("opportunity_version_id", candidate.data.opportunity_version_id).eq("status", "review_required")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (previousRun.error) throw previousRun.error;
    const previousOutput = previousRun.data?.output_json;
    const previousContent = isEditableDraft(previousOutput) ? previousOutput : null;
    const documentRef = `adapted-document:${randomUUID()}`;
    const evidenceRefs = [`source-document:${source.data.id}`, `sha256:${source.data.source_sha256}`];
    const title = `${source.data.title} · copia para candidatura`;
    const adaptedDocument = { documentRef, title, documentType: "candidature_adaptation", role: "supporting_draft",
      requirementRefs: [], evidenceRefs, missingInputs: [], sections: [
        { title: "Contenido adaptado para esta candidatura",
          paragraphs: editableParagraphs(source.data.extracted_text, `Copia de trabajo basada en «${source.data.title}». Completa aquí el contenido que deba adaptarse a esta candidatura.`), evidenceRefs },
        { title: "Cambios y decisiones del expediente", paragraphs: ["Pendiente de completar por la entidad."], evidenceRefs }
      ] };
    const content = {
      title: previousContent?.title || `Adaptación documental · ${opportunity.data.title}`,
      humanReviewRequired: true, submissionAllowed: false,
      evidenceRefs: [...new Set([...(previousContent?.evidenceRefs || []), ...evidenceRefs])],
      uncertainties: [...new Set([...(previousContent?.uncertainties || []), "La copia debe revisarse y consolidarse antes de utilizarla."])],
      documents: [...(previousContent?.documents || []), adaptedDocument],
      documentPlan: [...(previousContent?.documentPlan || []), { title, category: "generated_draft", preparation: "drafted_in_proposal",
        requirementRefs: [], evidenceRefs, missingInputs: [], draftDocumentRefs: [documentRef] }]
    };
    if (!isEditableDraft(content)) throw new Error("No se pudo construir una copia editable segura");
    const existingLink = await supabase.from("tenant_candidature_documents").select("id, selection_status")
      .eq("tenant_id", actor.tenantId).eq("recommendation_id", recommendationId)
      .eq("source_document_id", sourceDocumentId).maybeSingle();
    if (existingLink.error) throw existingLink.error;
    if (!existingLink.data || existingLink.data.selection_status === "excluded") {
      const activeCount = await supabase.from("tenant_candidature_documents")
        .select("id", { count: "exact", head: true }).eq("tenant_id", actor.tenantId)
        .eq("recommendation_id", recommendationId).neq("selection_status", "excluded");
      if (activeCount.error) throw activeCount.error;
      if ((activeCount.count || 0) >= MAX_ACTIVE_DOCUMENTS) {
        return res.status(409).json(fail(`La candidatura admite como máximo ${MAX_ACTIVE_DOCUMENTS} documentos activos`));
      }
    }
    const now = new Date().toISOString();
    const run = await supabase.from("tenant_agent_runs").insert({
      tenant_id: actor.tenantId, agent_key: "draft_agent", opportunity_id: candidate.data.opportunity_id,
      opportunity_version_id: candidate.data.opportunity_version_id, status: "review_required",
      use_approved_internal_facts: true, provider: "human_editor", model: "common_document_adaptation_v1",
      requested_by: actor.userId,
      input_manifest_json: { canonicalKey: opportunity.data.canonical_key, recommendationId, sourceDocumentId,
        mode: "common_document_adaptation", supersedesRunId: previousRun.data?.id || null,
        externalAiCalls: 0, allowedDataClasses: ["internal_approved"],
        humanReviewRequired: true, externalSubmissionAllowed: false },
      context_manifest_json: { sourceDocumentId, sourceSha256: source.data.source_sha256, externalAiCalls: 0 },
      output_json: content, usage_json: { input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_eur: 0 },
      started_at: now, finished_at: now
    }).select("id, status, provider, model, input_manifest_json, context_manifest_json, output_json, usage_json, created_at, updated_at, finished_at").single();
    if (run.error) throw run.error;
    if (!existingLink.data) {
      const link = await supabase.from("tenant_candidature_documents").insert({
        tenant_id: actor.tenantId, recommendation_id: recommendationId, source_document_id: sourceDocumentId,
        selection_origin: "human_added", selection_status: "confirmed",
        reason_text: "Original vinculado como procedencia de una copia editable específica de la candidatura.",
        evidence_json: evidenceRefs, proposed_by: actor.userId, reviewed_by: actor.userId, reviewed_at: now, updated_at: now
      });
      if (link.error) throw link.error;
    } else if (existingLink.data.selection_status !== "confirmed") {
      const link = await supabase.from("tenant_candidature_documents").update({
        selection_status: "confirmed", reason_text: "Original vinculado como procedencia de una copia editable específica de la candidatura.",
        evidence_json: evidenceRefs, reviewed_by: actor.userId, reviewed_at: now, updated_at: now
      }).eq("id", existingLink.data.id).eq("tenant_id", actor.tenantId);
      if (link.error) throw link.error;
    }
    const audit = await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: "candidature_documents.adaptation_created", target_type: "agent_run", target_id: run.data.id,
      detail_json: { recommendation_id: recommendationId, source_document_id: sourceDocumentId,
        source_sha256: source.data.source_sha256, document_ref: documentRef, external_ai_calls: 0,
        original_modified: false, content_copied_to_audit: false, submission_allowed: false }
    });
    if (audit.error) throw audit.error;
    return res.status(201).json(ok({ run: { ...run.data, human_review: null }, documentRef,
      canonicalKey: opportunity.data.canonical_key, originalModified: false }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
