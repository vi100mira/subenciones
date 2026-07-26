import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { fail, ok } from "../src/apiResponse.js";
import { draftContentHash, draftDocumentIsConsolidated, isEditableDraft } from "../src/draftDocumentVersion.js";
import { renderProposalPdf } from "../src/proposalPdf.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function clean(value: unknown, maximum = 120) {
  return String(value || "").trim().slice(0, maximum);
}

function safeKey(value: unknown) {
  return clean(value, 100).toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "documento";
}

async function reusableSource(supabase: ReturnType<typeof getSupabaseAdmin>, actor: any) {
  const existing = await supabase.from("source_connections").select("id")
    .eq("tenant_id", actor.tenantId).eq("scope", "tenant_private").neq("status", "deleted")
    .contains("config_json", { systemPurpose: "candidature_reuse" }).limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;
  const consent = await supabase.from("tenant_data_consents").select("id")
    .eq("tenant_id", actor.tenantId).eq("consent_type", "manual_upload").eq("status", "granted")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (consent.error) throw consent.error;
  if (!consent.data) throw new Error("Autoriza primero la gestión de documentos privados de la entidad");
  const now = new Date().toISOString();
  const created = await supabase.from("source_connections").insert({
    tenant_id: actor.tenantId, label: "Documentos reutilizables de candidaturas", kind: "manual_upload",
    scope: "tenant_private", status: "active", health_status: "healthy", priority: 80,
    config_json: { connector: "manual_upload", rootLabel: "Candidaturas consolidadas", readOnly: true,
      externalTransfer: false, includePersonalData: false, includeSensitiveData: false,
      systemPurpose: "candidature_reuse" },
    created_by: actor.userId, approved_by: actor.userId, approved_at: now
  }).select("id").single();
  if (created.error) throw created.error;
  return created.data.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json(fail("El almacén privado no está configurado"));
    const runId = clean(req.body?.runId, 100);
    const versionId = clean(req.body?.versionId, 100);
    const documentRef = clean(req.body?.documentRef, 180);
    if (!runId || !versionId || !documentRef) return res.status(400).json(fail("Falta la versión consolidada"));
    const supabase = getSupabaseAdmin();
    await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
    const [run, version] = await Promise.all([
      supabase.from("tenant_agent_runs").select("id, opportunity_id, input_manifest_json")
        .eq("id", runId).eq("tenant_id", actor.tenantId).eq("agent_key", "draft_agent").maybeSingle(),
      supabase.from("tenant_draft_versions").select("id, agent_run_id, content_json, content_hash")
        .eq("id", versionId).eq("tenant_id", actor.tenantId).eq("agent_run_id", runId).maybeSingle()
    ]);
    if (run.error) throw run.error;
    if (version.error) throw version.error;
    if (!run.data || !version.data || !isEditableDraft(version.data.content_json)
      || version.data.content_hash !== draftContentHash(version.data.content_json)) {
      return res.status(409).json(fail("La versión no es íntegra o no pertenece a esta candidatura"));
    }
    const document = version.data.content_json.documents.find((item: any) => item.documentRef === documentRef);
    if (!document || !draftDocumentIsConsolidated(document)) {
      return res.status(409).json(fail("Consolida el documento antes de proponerlo a Base común"));
    }
    const recommendationId = clean(run.data.input_manifest_json?.recommendationId, 100);
    const sourceId = await reusableSource(supabase, actor);
    const pdf = await renderProposalPdf(document.title,
      document.sections.map((section: any) => ({ title: section.title, lines: section.paragraphs })), []);
    const sha256 = createHash("sha256").update(pdf.buffer).digest("hex");
    const pathname = `tenants/${actor.tenantId}/common-knowledge/candidatures/${safeKey(runId)}/${safeKey(documentRef)}/${sha256.slice(0, 12)}.pdf`;
    const blob = await put(pathname, pdf.buffer, { access: "private", addRandomSuffix: false, contentType: "application/pdf" });
    const now = new Date().toISOString();
    const extractedText = document.sections.flatMap((section: any) => [section.title, ...(section.paragraphs || [])]).join("\n\n");
    const externalId = `candidature:${runId}:${documentRef}`;
    const stored = await supabase.from("source_documents").upsert({
      tenant_id: actor.tenantId, source_connection_id: sourceId, external_id: externalId,
      title: document.title, path: `insertia://candidatures/${recommendationId || run.data.opportunity_id}/documents/${documentRef}`,
      mime_type: "application/pdf", data_class: "internal", blob_url: null, blob_path: blob.pathname,
      source_sha256: sha256, source_size_bytes: pdf.buffer.byteLength, modified_at: now,
      extracted_text: extractedText.slice(0, 100_000), extraction_status: "ready",
      metadata_json: { document_candidate: true, review_status: "pending", recommendation: "reference_only_filled",
        candidature_generated: true, source_run_id: runId, source_version_id: versionId,
        source_document_ref: documentRef, recommendation_id: recommendationId || null,
        promoted_by: actor.userId, promoted_at: now, ai_allowed: false, embeddings_allowed: false }, updated_at: now
    }, { onConflict: "tenant_id,source_connection_id,external_id" })
      .select("id, title, mime_type, data_class, source_connection_id, source_sha256, blob_path, metadata_json, updated_at").single();
    if (stored.error) throw stored.error;
    const audit = await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: "common_knowledge.candidature_document_proposed", target_type: "source_document", target_id: stored.data.id,
      detail_json: { agent_run_id: runId, draft_version_id: versionId, document_ref: documentRef,
        recommendation_id: recommendationId || null, source_sha256: sha256, review_status: "pending",
        private_blob: true, content_copied_to_audit: false, submission_allowed: false }
    });
    if (audit.error) throw audit.error;
    return res.status(201).json(ok({ ...stored.data, stored: true, reviewStatus: "pending" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
