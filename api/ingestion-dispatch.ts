import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));

  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    const { sourceConnectionId } = req.body || {};
    if (!sourceConnectionId || typeof sourceConnectionId !== "string") {
      return res.status(400).json(fail("Falta sourceConnectionId"));
    }

    const supabase = getSupabaseAdmin();
    const { data: source, error: sourceError } = await supabase
      .from("source_connections")
      .select("id, label, kind, status")
      .eq("id", sourceConnectionId)
      .eq("tenant_id", actor.tenantId)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!source) return res.status(404).json(fail("Fuente no encontrada"));
    if (source.status !== "active") return res.status(409).json(fail("La fuente no esta activa"));

    const { data: run, error: runError } = await supabase
      .from("ingestion_runs")
      .insert({
        tenant_id: actor.tenantId,
        source_connection_id: source.id,
        status: "queued",
        requested_by: actor.userId
      })
      .select("id, status, created_at")
      .single();

    if (runError) throw runError;

    return res.status(202).json(ok({
      run,
      message: "Ingesta encolada. El worker se conectara a la fuente y actualizara el estado."
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
