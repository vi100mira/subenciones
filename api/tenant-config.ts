import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin";

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
        .from("tenant_configs")
        .select("tenant_id, display_name, logo_url, primary_color, status, profile_json, motivations_json, updated_at")
        .eq("tenant_id", actor.tenantId)
        .single();

      if (error) throw error;
      return res.status(200).json(ok(data));
    }

    if (req.method === "PATCH") {
      const { displayName, logoUrl, primaryColor, profile, motivations, status } = req.body || {};
      const patch = {
        ...(displayName ? { display_name: displayName } : {}),
        ...(logoUrl !== undefined ? { logo_url: logoUrl } : {}),
        ...(primaryColor ? { primary_color: primaryColor } : {}),
        ...(profile ? { profile_json: profile } : {}),
        ...(motivations ? { motivations_json: motivations } : {}),
        ...(status ? { status } : {}),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("tenant_configs")
        .update(patch)
        .eq("tenant_id", actor.tenantId)
        .select("tenant_id, display_name, logo_url, primary_color, status, profile_json, motivations_json, updated_at")
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
