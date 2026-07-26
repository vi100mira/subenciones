import type { VercelRequest, VercelResponse } from "@vercel/node";
import { get } from "@vercel/blob";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";
import { buildProjectFolder, currentFolderContent } from "../src/candidatureProjectFolder.js";
import { buildWorkingDownload } from "../src/candidatureWorkingPackage.js";
import type { DraftDocumentPlanItem, GeneratedDraftDocument } from "../src/candidatureDocx.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function text(value: unknown, maximum = 160) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function missingWorkingExportTable(error: any) {
  return ["42P01", "PGRST205"].includes(String(error?.code || ""));
}

async function loadState(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, recommendationId: string) {
  const recommendation = await supabase.from("tenant_opportunity_recommendations")
    .select("id, opportunity_id, opportunity_version_id, candidacy_stage, decision_status")
    .eq("tenant_id", tenantId).eq("id", recommendationId).maybeSingle();
  if (recommendation.error) throw recommendation.error;
  if (!recommendation.data) throw new Error("Candidatura no encontrada");
  const opportunity = await supabase.from("platform_opportunities")
    .select("canonical_key, title, funder_name").eq("id", recommendation.data.opportunity_id).maybeSingle();
  if (opportunity.error) throw opportunity.error;
  if (!opportunity.data) throw new Error("Oportunidad no encontrada");
  const runResult = await supabase.from("tenant_agent_runs")
    .select("id, output_json, created_at, updated_at")
    .eq("tenant_id", tenantId).eq("agent_key", "draft_agent").eq("opportunity_id", recommendation.data.opportunity_id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (runResult.error) throw runResult.error;
  const run = runResult.data || null;
  const [reviewResult, versionResult, selectionsResult, exportsResult, tenantResult] = await Promise.all([
    run ? supabase.from("tenant_draft_reviews").select("id, status, draft_version_id")
      .eq("tenant_id", tenantId).eq("agent_run_id", run.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    run ? supabase.from("tenant_draft_versions").select("id, version_number, content_json, created_at")
      .eq("tenant_id", tenantId).eq("agent_run_id", run.id).order("version_number", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("tenant_candidature_documents")
      .select("id, source_document_id, selection_status, selection_origin, evidence_json, updated_at")
      .eq("tenant_id", tenantId).eq("recommendation_id", recommendationId).order("created_at", { ascending: true }),
    supabase.from("tenant_candidature_working_exports").select("scope, scope_ref, snapshot_hash")
      .eq("tenant_id", tenantId).eq("recommendation_id", recommendationId).order("created_at", { ascending: false }).limit(200),
    supabase.from("organizations").select("name").eq("id", tenantId).maybeSingle()
  ]);
  if (reviewResult.error) throw reviewResult.error;
  if (versionResult.error) throw versionResult.error;
  if (selectionsResult.error) throw selectionsResult.error;
  if (exportsResult.error && !missingWorkingExportTable(exportsResult.error)) throw exportsResult.error;
  if (tenantResult.error) throw tenantResult.error;
  const sourceIds = (selectionsResult.data || []).map((selection: any) => selection.source_document_id);
  const documentsResult = sourceIds.length ? await supabase.from("source_documents")
    .select("id, title, mime_type, data_class, source_connection_id, source_sha256, blob_path")
    .eq("tenant_id", tenantId).in("id", sourceIds) : { data: [], error: null };
  if (documentsResult.error) throw documentsResult.error;
  const documentById = new Map((documentsResult.data || []).map((document: any) => [document.id, document]));
  const selections = (selectionsResult.data || []).map((selection: any) => {
    const document = documentById.get(selection.source_document_id) as any;
    return { ...selection, document: document ? { id: document.id, title: document.title, mime_type: document.mime_type,
      data_class: document.data_class, source_connection_id: document.source_connection_id, source_sha256: document.source_sha256,
      stored: Boolean(document.blob_path) } : null };
  });
  const draftVersion = versionResult.data || null;
  const rawReview = reviewResult.data || null;
  const review = rawReview?.status === "approved"
    && ((rawReview.draft_version_id && rawReview.draft_version_id === draftVersion?.id) || (!rawReview.draft_version_id && !draftVersion))
    ? rawReview : rawReview?.status === "rejected" ? rawReview : null;
  let workingExports = exportsResult.data || [];
  if (exportsResult.error && missingWorkingExportTable(exportsResult.error)) {
    const fallback = await supabase.from("audit_events").select("detail_json")
      .eq("tenant_id", tenantId).eq("action", "candidature_project.working_exported")
      .contains("detail_json", { recommendation_id: recommendationId }).order("created_at", { ascending: false }).limit(200);
    if (fallback.error) throw fallback.error;
    workingExports = (fallback.data || []).map((event: any) => ({ scope: event.detail_json?.scope,
      scope_ref: event.detail_json?.scope_ref, snapshot_hash: event.detail_json?.snapshot_hash }));
  }
  const folder = buildProjectFolder({ recommendationId, canonicalKey: opportunity.data.canonical_key, run, review, draftVersion,
    selections, workingExports });
  return { folder, recommendation: recommendation.data, opportunity: opportunity.data, tenantName: tenantResult.data?.name || "Entidad solicitante",
    run, review: rawReview, draftVersion, selections, documents: documentsResult.data || [] };
}

async function privateFiles(state: Awaited<ReturnType<typeof loadState>>) {
  const result = new Map<string, { buffer: Buffer; mimeType: string; title: string }>();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return result;
  const selectionByDocument = new Map(state.selections.map((selection: any) => [selection.source_document_id, selection.id]));
  await Promise.all(state.documents.filter((document: any) => document.blob_path).map(async (document: any) => {
    const selectionId = selectionByDocument.get(document.id); if (!selectionId) return;
    const blob = await get(document.blob_path, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN, useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream) return;
    result.set(String(selectionId), { buffer: Buffer.from(await new Response(blob.stream).arrayBuffer()), mimeType: document.mime_type, title: document.title });
  }));
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const recommendationId = text(req.query.recommendationId || req.body?.recommendationId, 100);
    if (!recommendationId) return res.status(400).json(fail("Falta recommendationId"));
    const supabase = getSupabaseAdmin();
    const state = await loadState(supabase, actor.tenantId, recommendationId);
    if (req.method === "GET") return res.status(200).json(ok(state.folder));
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const scope = text(req.body?.scope, 20) as "document" | "check" | "all";
    const scopeRef = text(req.body?.scopeRef, 160);
    const fileId = text(req.body?.fileId, 160) || null;
    if (!new Set(["document", "check", "all"]).has(scope) || !scopeRef) return res.status(400).json(fail("Ámbito de descarga no válido"));
    if (req.body?.acknowledgeWorkingCopy !== true) return res.status(409).json(fail("Confirma la revisión para descarga de trabajo"));
    const requestedFile = state.folder.checks.flatMap((check) => check.files).find((file) => file.id === fileId);
    if (scope !== "document" || requestedFile?.kind !== "tenant") {
      await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
    }
    const content = currentFolderContent(state);
    const documents = (Array.isArray(content?.documents) ? content.documents : []) as GeneratedDraftDocument[];
    const documentPlan = (Array.isArray(content?.documentPlan) ? content.documentPlan : []) as DraftDocumentPlanItem[];
    const reviewedAt = new Date().toISOString();
    const download = await buildWorkingDownload({ title: content?.title || "Carpeta de proyecto", opportunityTitle: state.opportunity.title,
      funderName: state.opportunity.funder_name, tenantName: state.tenantName, documents, documentPlan,
      evidenceRefs: Array.isArray(content?.evidenceRefs) ? content.evidenceRefs : [], uncertainties: Array.isArray(content?.uncertainties) ? content.uncertainties : [],
      reviewedAt, reviewerLabel: actor.role, checks: state.folder.checks, scope, scopeRef, fileId, tenantFiles: await privateFiles(state) });
    const exportRow = await supabase.from("tenant_candidature_working_exports").insert({
      tenant_id: actor.tenantId, recommendation_id: recommendationId, agent_run_id: state.run?.id || null,
      draft_version_id: state.draftVersion?.id || null, scope, scope_ref: scopeRef, snapshot_hash: state.folder.snapshotHash,
      manifest_json: download.manifest, reviewed_by: actor.userId, reviewed_at: reviewedAt
    }).select("id").single();
    if (exportRow.error && !missingWorkingExportTable(exportRow.error)) throw exportRow.error;
    const exportId = exportRow.data?.id || recommendationId;
    const audit = await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: "candidature_project.working_exported", target_type: "candidature_working_export", target_id: exportId,
      detail_json: { recommendation_id: recommendationId, scope, scope_ref: scopeRef, snapshot_hash: state.folder.snapshotHash,
        artifact_count: download.artifactCount, working_copy: true, submission_allowed: false, document_content_logged: false }
    });
    if (audit.error) throw audit.error;
    res.setHeader("Content-Type", download.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${download.fileName}"`);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    return res.status(200).send(download.buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") || message.includes("no incluido") ? 403
      : message.includes("autoriz") || message.includes("Token") ? 401
        : message.includes("no encontrada") ? 404 : message.includes("no válido") || message.includes("Falta") ? 400 : 409;
    return res.status(status).json(fail(message));
  }
}
