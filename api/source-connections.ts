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
      const { data, error } = await supabase
        .from("source_connections")
        .select("id, label, kind, status, scope, priority, health_status, last_synced_at, created_at, updated_at")
        .eq("tenant_id", actor.tenantId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "POST") {
      const { label, kind, scope, config } = req.body || {};
      if (!label || !kind || !scope) return res.status(400).json(fail("Faltan label, kind o scope"));
      if (scope === "platform_public") {
        return res.status(403).json(fail("Las fuentes de plataforma se gestionan desde consola superadmin"));
      }

      const { data, error } = await supabase
        .from("source_connections")
        .insert({
          tenant_id: actor.tenantId,
          label,
          kind,
          scope,
          config_json: config || {},
          status: "pending_approval",
          health_status: "unknown",
          created_by: actor.userId
        })
        .select("id, label, kind, status, scope, priority, health_status, created_at")
        .single();

      if (error) throw error;
      return res.status(201).json(ok(data));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
