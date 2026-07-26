import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { fail, ok } from "../src/apiResponse.js";
import { allDraftDocumentsConsolidated, applyDraftEdits, consolidateDraftDocument, consolidatedDocumentRefs,
  draftContentHash, isEditableDraft, type DraftDocumentEdit } from "../src/draftDocumentVersion.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function missingVersionSchema(error: any) {
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(String(error?.code || ""))
    || /tenant_draft_versions|draft_version_id/i.test(String(error?.message || ""));
}

async function tenantRun(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, runId: string) {
  const result = await supabase.from("tenant_agent_runs")
    .select("id, tenant_id, opportunity_version_id, status, output_json, input_manifest_json")
    .eq("id", runId).eq("tenant_id", tenantId).eq("agent_key", "draft_agent").maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

function limitedStrings(value: unknown, maximum = 100, length = 500) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim().slice(0, length)).filter(Boolean).slice(0, maximum) : [];
}

async function createManualDraft(supabase: ReturnType<typeof getSupabaseAdmin>, actor: any, canonicalKey: string,
                                 seed: any, targetDocumentRef: string) {
  await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
  const opportunity = await supabase.from("platform_opportunities").select("id, canonical_key, title")
    .eq("canonical_key", canonicalKey).maybeSingle();
  if (opportunity.error) throw opportunity.error;
  if (!opportunity.data) throw new Error("Oportunidad no encontrada");
  const recommendation = await supabase.from("tenant_opportunity_recommendations").select("id")
    .eq("tenant_id", actor.tenantId).eq("opportunity_id", opportunity.data.id).limit(1).maybeSingle();
  if (recommendation.error) throw recommendation.error;
  if (!recommendation.data) throw new Error("La oportunidad no pertenece a una candidatura de esta entidad");
  const version = await supabase.from("platform_opportunity_versions").select("id")
    .eq("opportunity_id", opportunity.data.id).eq("version_status", "current").maybeSingle();
  if (version.error) throw version.error;
  if (!version.data) throw new Error("La oportunidad no tiene una versión vigente");
  const sourceDocuments = Array.isArray(seed?.documents) ? seed.documents.slice(0, 30) : [];
  if (!sourceDocuments.length || sourceDocuments.some((document: any) => !Array.isArray(document?.sections) || !document.sections.length)) {
    throw new Error("La plantilla manual no contiene documentos editables válidos");
  }
  const refMap = new Map<string, string>();
  const documents = sourceDocuments.map((sourceDocument: any) => {
    const documentRef = `manual-document:${randomUUID()}`;
    refMap.set(String(sourceDocument.documentRef || ""), documentRef);
    const evidenceRefs = limitedStrings(sourceDocument.evidenceRefs, 100, 180);
    const sections = sourceDocument.sections.slice(0, 30).map((section: any) => ({
      title: String(section?.title || "Apartado").trim().slice(0, 200),
      paragraphs: limitedStrings(section?.paragraphs, 30, 5000), evidenceRefs: limitedStrings(section?.evidenceRefs, 100, 180)
    }));
    if (sections.some((section: any) => !section.paragraphs.length)) throw new Error("Todos los apartados deben tener contenido inicial");
    return { documentRef, title: String(sourceDocument.title || "Documento manual").trim().slice(0, 300),
      documentType: String(sourceDocument.documentType || "manual_template").slice(0, 100), role: "supporting_draft",
      requirementRefs: limitedStrings(sourceDocument.requirementRefs, 100, 180), evidenceRefs,
      missingInputs: limitedStrings(sourceDocument.missingInputs, 100, 500), sections };
  });
  const evidenceRefs = [...new Set(documents.flatMap((document: any) => document.evidenceRefs))];
  const content = { title: String(seed?.title || opportunity.data.title).trim().slice(0, 300), humanReviewRequired: true,
    submissionAllowed: false, evidenceRefs, uncertainties: limitedStrings(seed?.uncertainties, 100, 500), documents,
    documentPlan: documents.map((document: any) => ({ title: document.title, category: "generated_draft",
      preparation: "drafted_in_proposal", requirementRefs: document.requirementRefs, evidenceRefs: document.evidenceRefs,
      missingInputs: document.missingInputs, draftDocumentRefs: [document.documentRef] })) };
  if (!isEditableDraft(content)) throw new Error("La plantilla manual no cumple el contrato de edición segura");
  const now = new Date().toISOString();
  const run = await supabase.from("tenant_agent_runs").insert({ tenant_id: actor.tenantId, agent_key: "draft_agent",
    opportunity_id: opportunity.data.id, opportunity_version_id: version.data.id, status: "review_required",
    use_approved_internal_facts: false, provider: "human_editor", model: "manual_template_v1", requested_by: actor.userId,
    input_manifest_json: { canonicalKey, mode: "manual_template", externalAiCalls: 0,
      allowedDataClasses: ["public", "human_entered_internal"], humanReviewRequired: true, externalSubmissionAllowed: false },
    context_manifest_json: { mode: "manual_template", externalAiCalls: 0 }, output_json: content,
    usage_json: { input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_eur: 0 }, started_at: now, finished_at: now
  }).select("id, status, provider, model, input_manifest_json, context_manifest_json, output_json, usage_json, created_at, updated_at, finished_at").single();
  if (run.error) throw run.error;
  const audit = await supabase.from("audit_events").insert({ tenant_id: actor.tenantId, actor_user_id: actor.userId,
    actor_label: actor.email, action: "draft_document.manual_seed_created", target_type: "agent_run", target_id: run.data.id,
    detail_json: { canonical_key: canonicalKey, document_count: documents.length,
      opened_document_ref: refMap.get(targetDocumentRef) || documents[0].documentRef, external_ai_calls: 0,
      content_copied_to_audit: false, submission_allowed: false } });
  if (audit.error) throw audit.error;
  return { run: { ...run.data, human_review: null }, documentRef: refMap.get(targetDocumentRef) || documents[0].documentRef };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!["GET", "POST", "PATCH"].includes(req.method || "")) return res.status(405).json(fail("Method Not Allowed"));
    const actor = await requireSourcePermission(req.headers.authorization,
      req.method === "GET" ? "sources:read" : "sources:write", requestedTenant(req));
    const supabase = getSupabaseAdmin();
    const runId = String(req.method === "GET" ? req.query.runId : req.body?.runId || "").trim();
    if (req.method === "POST" && !runId && req.body?.seedContent) {
      const canonicalKey = String(req.body?.canonicalKey || "").trim();
      if (!canonicalKey) return res.status(400).json(fail("Falta canonicalKey"));
      return res.status(201).json(ok(await createManualDraft(supabase, actor, canonicalKey, req.body.seedContent,
        String(req.body?.targetDocumentRef || ""))));
    }
    if (!runId) return res.status(400).json(fail("Falta runId"));
    const run = await tenantRun(supabase, actor.tenantId, runId);
    if (!run) return res.status(404).json(fail("Borrador no encontrado para esta entidad"));
    if (run.status !== "review_required" || !isEditableDraft(run.output_json)) {
      return res.status(409).json(fail("El borrador todavía no está preparado para edición humana"));
    }

    if (req.method === "GET") {
      const history = await supabase.from("tenant_draft_versions")
        .select("id, version_number, status, content_json, content_hash, change_note, created_by, reviewed_by, reviewed_at, created_at")
        .eq("tenant_id", actor.tenantId).eq("agent_run_id", run.id)
        .order("version_number", { ascending: false }).limit(30);
      if (history.error) throw history.error;
      const versions = history.data || [];
      return res.status(200).json(ok({ runId: run.id,
        canonicalKey: run.input_manifest_json?.canonicalKey || null,
        currentContent: versions[0]?.content_json || run.output_json,
        currentVersionId: versions[0]?.id || null,
        versions }));
    }

    if (req.method === "POST") {
      await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
      const latest = await supabase.from("tenant_draft_versions")
        .select("id, version_number, content_json").eq("tenant_id", actor.tenantId).eq("agent_run_id", run.id)
        .order("version_number", { ascending: false }).limit(1).maybeSingle();
      if (latest.error) throw latest.error;
      const edits = Array.isArray(req.body?.edits) ? req.body.edits as DraftDocumentEdit[] : [];
      if (!edits.length) return res.status(400).json(fail("No hay cambios documentales que guardar"));
      const now = new Date().toISOString();
      const versionNumber = Number(latest.data?.version_number || 0) + 1;
      const consolidateDocumentRef = String(req.body?.consolidateDocumentRef || "").trim();
      if (consolidateDocumentRef && !edits.some((edit) => edit.documentRef === consolidateDocumentRef)) {
        return res.status(400).json(fail("El documento consolidado debe formar parte de esta edición"));
      }
      let content = applyDraftEdits(latest.data?.content_json || run.output_json, edits, actor.userId, now);
      if (consolidateDocumentRef) content = consolidateDraftDocument(content, consolidateDocumentRef, actor.userId, now);
      const packageApproved = allDraftDocumentsConsolidated(content);
      const documentRefs = consolidatedDocumentRefs(content);
      const inserted = await supabase.from("tenant_draft_versions").insert({
        tenant_id: actor.tenantId, agent_run_id: run.id, opportunity_version_id: run.opportunity_version_id,
        base_version_id: latest.data?.id || null, version_number: versionNumber, status: packageApproved ? "approved" : "editing",
        content_json: content, content_hash: draftContentHash(content),
        change_note: String(req.body?.changeNote || "Edición humana del borrador").trim().slice(0, 1000),
        created_by: actor.userId, reviewed_by: packageApproved ? actor.userId : null, reviewed_at: packageApproved ? now : null
      }).select("id, version_number, status, content_json, content_hash, change_note, created_at").single();
      if (inserted.error?.code === "23505") return res.status(409).json(fail("Otra persona guardó una versión; actualiza antes de continuar"));
      if (inserted.error) throw inserted.error;
      const pendingReview = await supabase.from("tenant_draft_reviews").upsert({
        tenant_id: actor.tenantId, agent_run_id: run.id, opportunity_version_id: run.opportunity_version_id,
        draft_version_id: inserted.data.id, status: packageApproved ? "approved" : "pending", output_hash: inserted.data.content_hash,
        review_note: null, reviewed_by: packageApproved ? actor.userId : null, reviewed_at: packageApproved ? now : null, updated_at: now,
        docx_blob_path: null, docx_sha256: null, pdf_blob_path: null, pdf_sha256: null,
        validation_json: { draftVersionId: inserted.data.id, draftVersionNumber: versionNumber,
          humanEdited: true, consolidatedDocumentRefs: documentRefs, totalDocuments: content.documents.length,
          allDocumentsConsolidated: packageApproved, submissionAllowed: false }
      }, { onConflict: "agent_run_id" }).select("id, status, output_hash, validation_json").single();
      if (pendingReview.error) throw pendingReview.error;
      const audit = await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.email,
        action: consolidateDocumentRef ? "draft_document.document_consolidated" : "draft_document.version_created",
        target_type: "tenant_draft_version", target_id: inserted.data.id,
        detail_json: { agent_run_id: run.id, version_number: versionNumber,
          document_ref: consolidateDocumentRef || null, consolidated_document_refs: documentRefs,
          all_documents_consolidated: packageApproved, content_hash: inserted.data.content_hash, submission_allowed: false }
      });
      if (audit.error) throw audit.error;
      return res.status(201).json(ok({ version: inserted.data, review: pendingReview.data,
        consolidatedDocumentRef: consolidateDocumentRef || null, allDocumentsConsolidated: packageApproved }));
    }

    const versionId = String(req.body?.versionId || "").trim();
    const action = String(req.body?.action || "");
    const note = String(req.body?.note || "").trim().slice(0, 3000);
    if (!versionId || !["approved", "rejected"].includes(action)) return res.status(400).json(fail("Decisión de versión inválida"));
    if (action === "rejected" && !note) return res.status(400).json(fail("Indica el motivo del rechazo"));
    const version = await supabase.from("tenant_draft_versions")
      .select("id, agent_run_id, opportunity_version_id, version_number, status, content_hash, content_json")
      .eq("id", versionId).eq("tenant_id", actor.tenantId).eq("agent_run_id", run.id).maybeSingle();
    if (version.error) throw version.error;
    if (!version.data) return res.status(404).json(fail("Versión documental no encontrada"));
    if (action === "approved" && version.data.status !== "approved" && !allDraftDocumentsConsolidated(version.data.content_json)) {
      return res.status(409).json(fail("Consolida cada documento antes de aprobar el paquete completo"));
    }
    const now = new Date().toISOString();
    const decided = await supabase.from("tenant_draft_versions").update({
      status: action, reviewed_by: actor.userId, reviewed_at: now
    }).eq("id", version.data.id).eq("tenant_id", actor.tenantId)
      .select("id, version_number, status, content_json, content_hash, reviewed_at").single();
    if (decided.error) throw decided.error;
    const review = await supabase.from("tenant_draft_reviews").upsert({
      tenant_id: actor.tenantId, agent_run_id: run.id, opportunity_version_id: run.opportunity_version_id,
      draft_version_id: version.data.id, status: action, output_hash: version.data.content_hash,
      review_note: note, reviewed_by: actor.userId, reviewed_at: now, updated_at: now,
      docx_blob_path: null, docx_sha256: null, pdf_blob_path: null, pdf_sha256: null,
      validation_json: { draftVersionId: version.data.id, draftVersionNumber: version.data.version_number,
        humanEdited: true, submissionAllowed: false }
    }, { onConflict: "agent_run_id" }).select("id, status, output_hash, reviewed_at, validation_json").single();
    if (review.error) throw review.error;
    const audit = await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.email,
      action: `draft_document.${action}`, target_type: "tenant_draft_version", target_id: version.data.id,
      detail_json: { agent_run_id: run.id, version_number: version.data.version_number,
        content_hash: version.data.content_hash, export_allowed: action === "approved", submission_allowed: false }
    });
    if (audit.error) throw audit.error;
    return res.status(200).json(ok({ version: decided.data, review: review.data }));
  } catch (error) {
    if (missingVersionSchema(error)) return res.status(503).json(fail("La edición versionada todavía no está activada en este entorno"));
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401
      : message.includes("no encontrado") ? 404 : message.includes("todavía") || message.includes("Otra persona") ? 409 : 400;
    return res.status(status).json(fail(message));
  }
}
