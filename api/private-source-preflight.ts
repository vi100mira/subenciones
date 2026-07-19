import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorMessage, fail, ok } from "../src/apiResponse.js";
import { assessPrivateSourceManifest } from "../src/privateSourcePreflight.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    const { sourceConnectionId, manifest, acceptLimited } = req.body || {};
    if (typeof sourceConnectionId !== "string" || !sourceConnectionId) return res.status(400).json(fail("Falta sourceConnectionId"));
    if (acceptLimited !== undefined && typeof acceptLimited !== "boolean") return res.status(400).json(fail("Confirmación limitada inválida"));

    const supabase = getSupabaseAdmin();
    const { data: source, error: sourceError } = await supabase.from("source_connections")
      .select("id, kind, config_json").eq("id", sourceConnectionId).eq("tenant_id", actor.tenantId)
      .eq("scope", "tenant_private").in("kind", ["local_simulation", "manual_upload", "vercel_blob", "google_drive", "microsoft_graph"])
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source) return res.status(404).json(fail("Fuente privada no encontrada"));

    const assessment = assessPrivateSourceManifest(manifest, acceptLimited === true);
    const checkedAt = new Date().toISOString();
    const preflight = { ...assessment, checked_at: checkedAt };
    const config = source.config_json && typeof source.config_json === "object" && !Array.isArray(source.config_json)
      ? source.config_json as Record<string, unknown> : {};
    const { error: updateError } = await supabase.from("source_connections")
      .update({ config_json: { ...config, preflight }, updated_at: checkedAt })
      .eq("id", source.id).eq("tenant_id", actor.tenantId);
    if (updateError) throw updateError;

    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: `private_source.preflight_${assessment.status}`, target_type: "source_connection", target_id: source.id,
      detail_json: { source_kind: source.kind, ...assessment.manifest, ai_calls: 0, accepted_limited: acceptLimited === true }
    });
    return res.status(200).json(ok(preflight));
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
