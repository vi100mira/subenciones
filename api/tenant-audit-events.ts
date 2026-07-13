import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function shortText(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!["GET", "POST"].includes(req.method || "")) return res.status(405).json(fail("Method Not Allowed"));
    const permission = req.method === "POST" ? "sources:write" : "sources:read";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase.from("audit_events")
        .select("id, actor_label, action, target_type, target_id, detail_json, created_at")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.body?.action !== "record_export") return res.status(400).json(fail("Acción de auditoría no válida"));
    const count = Math.max(0, Math.min(Number(req.body?.count) || 0, 500));
    const filters = req.body?.filters || {};
    const { error } = await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.role,
      action: "audit.exported",
      target_type: "audit_events",
      target_id: actor.tenantId,
      detail_json: {
        format: "excel_csv",
        exported_rows: count,
        filters: { search: shortText(filters.search), actor: shortText(filters.actor), date: shortText(filters.date, 10) }
      }
    });
    if (error) throw error;
    return res.status(201).json(ok({ recorded: true }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
