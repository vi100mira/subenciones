import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin";

const ALERT_STATUSES = new Set(["new", "seen", "reviewing", "resolved", "dismissed"]);

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const status = typeof req.query.status === "string" ? req.query.status : "";
      let query = supabase
        .from("tenant_change_alerts")
        .select("id, severity, status, title, message, recommended_action, safe_channel_summary, channel_status, metadata_json, created_at, seen_at, resolved_at, platform_opportunities(id, canonical_key, title, funder_name), platform_opportunity_change_events(id, change_type, confidence, summary, previous_value, new_value, detected_at)")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (ALERT_STATUSES.has(status)) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "PATCH") {
      const { alertId, status } = req.body || {};
      if (typeof alertId !== "string" || !alertId) return res.status(400).json(fail("Falta alertId"));
      if (typeof status !== "string" || !ALERT_STATUSES.has(status)) return res.status(400).json(fail("Estado de alerta no valido"));

      const now = new Date().toISOString();
      const patch = {
        status,
        ...(status === "seen" || status === "reviewing" ? { seen_at: now } : {}),
        ...(status === "resolved" || status === "dismissed" ? { resolved_at: now } : {})
      };

      const { data, error } = await supabase
        .from("tenant_change_alerts")
        .update(patch)
        .eq("id", alertId)
        .eq("tenant_id", actor.tenantId)
        .select("id, severity, status, title, recommended_action, seen_at, resolved_at")
        .single();

      if (error) throw error;
      return res.status(200).json(ok(data));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
