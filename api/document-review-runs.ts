import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();
    if (req.method === "GET") {
      const { data, error } = await supabase.from("tenant_document_reviews").select(`
        id, requirements_json, risks_json, source_manifest_json, human_review_status, reviewed_at, created_at, updated_at,
        platform_opportunities(id, canonical_key, title),
        platform_opportunity_versions!inner(id, version_status, bases_url, official_url, source_url)
      `).eq("tenant_id", actor.tenantId).eq("platform_opportunity_versions.version_status", "current")
        .order("updated_at", { ascending: false }).limit(100);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }
    if (req.method === "PATCH") {
      const { reviewId, reviewStatus } = req.body || {};
      if (typeof reviewId !== "string" || !reviewId) return res.status(400).json(fail("Falta reviewId"));
      if (!new Set(["reviewed", "dismissed"]).has(reviewStatus)) return res.status(400).json(fail("reviewStatus inválido"));
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("tenant_document_reviews").update({ human_review_status: reviewStatus, reviewed_by: actor.userId, reviewed_at: now, updated_at: now })
        .eq("id", reviewId).eq("tenant_id", actor.tenantId).select("id, human_review_status, reviewed_at").single();
      if (error) throw error;
      await supabase.from("audit_events").insert({ tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role, action: `document_review.${reviewStatus}`, target_type: "document_review", target_id: reviewId, detail_json: { human_review_status: reviewStatus } });
      return res.status(200).json(ok(data));
    }
    if (req.method === "POST") return res.status(410).json(fail("Flujo retirado. Inicia el expediente desde Candidatura con bases aprobadas."));
    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
