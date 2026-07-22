import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { applyDraftEdits, draftContentHash, isEditableDraft, type DraftDocumentEdit } from "../src/draftDocumentVersion.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!["GET", "POST", "PATCH"].includes(req.method || "")) return res.status(405).json(fail("Method Not Allowed"));
    const actor = await requireSourcePermission(req.headers.authorization,
      req.method === "GET" ? "sources:read" : "sources:write", requestedTenant(req));
    const supabase = getSupabaseAdmin();
    const runId = String(req.method === "GET" ? req.query.runId : req.body?.runId || "").trim();
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
      const latest = await supabase.from("tenant_draft_versions")
        .select("id, version_number, content_json").eq("tenant_id", actor.tenantId).eq("agent_run_id", run.id)
        .order("version_number", { ascending: false }).limit(1).maybeSingle();
      if (latest.error) throw latest.error;
      const edits = Array.isArray(req.body?.edits) ? req.body.edits as DraftDocumentEdit[] : [];
      if (!edits.length) return res.status(400).json(fail("No hay cambios documentales que guardar"));
      const now = new Date().toISOString();
      const content = applyDraftEdits(latest.data?.content_json || run.output_json, edits, actor.userId, now);
      const versionNumber = Number(latest.data?.version_number || 0) + 1;
      const inserted = await supabase.from("tenant_draft_versions").insert({
        tenant_id: actor.tenantId, agent_run_id: run.id, opportunity_version_id: run.opportunity_version_id,
        base_version_id: latest.data?.id || null, version_number: versionNumber, status: "editing",
        content_json: content, content_hash: draftContentHash(content),
        change_note: String(req.body?.changeNote || "Edición humana del borrador").trim().slice(0, 1000),
        created_by: actor.userId
      }).select("id, version_number, status, content_json, content_hash, change_note, created_at").single();
      if (inserted.error?.code === "23505") return res.status(409).json(fail("Otra persona guardó una versión; actualiza antes de continuar"));
      if (inserted.error) throw inserted.error;
      const pendingReview = await supabase.from("tenant_draft_reviews").upsert({
        tenant_id: actor.tenantId, agent_run_id: run.id, opportunity_version_id: run.opportunity_version_id,
        draft_version_id: inserted.data.id, status: "pending", output_hash: inserted.data.content_hash,
        review_note: null, reviewed_by: null, reviewed_at: null, updated_at: now,
        docx_blob_path: null, docx_sha256: null, pdf_blob_path: null, pdf_sha256: null,
        validation_json: { draftVersionId: inserted.data.id, draftVersionNumber: versionNumber,
          humanEdited: true, submissionAllowed: false }
      }, { onConflict: "agent_run_id" }).select("id, status, output_hash, validation_json").single();
      if (pendingReview.error) throw pendingReview.error;
      const audit = await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.email,
        action: "draft_document.version_created", target_type: "tenant_draft_version", target_id: inserted.data.id,
        detail_json: { agent_run_id: run.id, version_number: versionNumber,
          content_hash: inserted.data.content_hash, submission_allowed: false }
      });
      if (audit.error) throw audit.error;
      return res.status(201).json(ok({ version: inserted.data, review: pendingReview.data }));
    }

    const versionId = String(req.body?.versionId || "").trim();
    const action = String(req.body?.action || "");
    const note = String(req.body?.note || "").trim().slice(0, 3000);
    if (!versionId || !["approved", "rejected"].includes(action)) return res.status(400).json(fail("Decisión de versión inválida"));
    if (action === "rejected" && !note) return res.status(400).json(fail("Indica el motivo del rechazo"));
    const version = await supabase.from("tenant_draft_versions")
      .select("id, agent_run_id, opportunity_version_id, version_number, content_hash, content_json")
      .eq("id", versionId).eq("tenant_id", actor.tenantId).eq("agent_run_id", run.id).maybeSingle();
    if (version.error) throw version.error;
    if (!version.data) return res.status(404).json(fail("Versión documental no encontrada"));
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
