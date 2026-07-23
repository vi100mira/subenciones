import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

type Decision = { id: string; status: "approved" | "restricted" | "rejected" };

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const sourceId = String(req.query.sourceId || req.body?.sourceId || "");
    if (!sourceId) return res.status(400).json(fail("Falta la fuente privada"));
    const supabase = getSupabaseAdmin();
    const { data: source, error: sourceError } = await supabase.from("source_connections")
      .select("id, scope, config_json").eq("id", sourceId).eq("tenant_id", actor.tenantId).maybeSingle();
    if (sourceError) throw sourceError;
    if (!source || source.scope !== "tenant_private") return res.status(404).json(fail("Fuente privada no encontrada"));

    if (req.method === "GET") {
      const runId = source.config_json?.lastInventory?.runId;
      if (!runId) return res.status(200).json(ok([]));
      const { data, error } = await supabase.from("source_documents")
        .select("id, title, mime_type, data_class, source_sha256, source_size_bytes, blob_path, extraction_status, metadata_json, updated_at")
        .eq("tenant_id", actor.tenantId).eq("source_connection_id", sourceId)
        .contains("metadata_json", { document_candidate: true, ingestion_run_id: runId })
        .order("title").limit(500);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method !== "PATCH") return res.status(405).json(fail("Method Not Allowed"));
    const reviews: Decision[] = Array.isArray(req.body?.reviews) ? req.body.reviews : [];
    if (!reviews.length || reviews.length > 100) return res.status(400).json(fail("No hay decisiones válidas"));
    if (reviews.some((item) => !item?.id || !["approved", "restricted", "rejected"].includes(item.status))) {
      return res.status(400).json(fail("Decisión documental inválida"));
    }
    const ids = reviews.map((item) => item.id);
    const { data: documents, error: documentsError } = await supabase.from("source_documents")
      .select("id, data_class, metadata_json").eq("tenant_id", actor.tenantId)
      .eq("source_connection_id", sourceId).in("id", ids);
    if (documentsError) throw documentsError;
    const byId = new Map(reviews.map((item) => [item.id, item.status]));
    const now = new Date().toISOString();
    for (const document of documents || []) {
      const status = byId.get(document.id);
      if (!status) continue;
      const restrictedClass = ["personal", "sensitive"].includes(document.data_class);
      if ((restrictedClass && status === "approved") || (!restrictedClass && status === "restricted")) {
        return res.status(400).json(fail("La decisión no corresponde con la clase de datos"));
      }
      const { error } = await supabase.from("source_documents").update({
        metadata_json: { ...(document.metadata_json || {}), review_status: status, reviewed_at: now, reviewed_by: actor.userId },
        updated_at: now
      }).eq("id", document.id).eq("tenant_id", actor.tenantId);
      if (error) throw error;
    }
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: "private_document_candidates.reviewed", target_type: "source_connection", target_id: sourceId,
      detail_json: {
        approved_ids: reviews.filter((item) => item.status === "approved").map((item) => item.id),
        restricted_ids: reviews.filter((item) => item.status === "restricted").map((item) => item.id),
        rejected_ids: reviews.filter((item) => item.status === "rejected").map((item) => item.id),
        document_content_copied: false
      }
    });
    return res.status(200).json(ok({ reviewed: documents?.length || 0 }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
