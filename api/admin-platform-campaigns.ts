import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("platform_ingestion_campaigns")
        .select("id, campaign_key, status, scanned, changed, vectorized, skipped, failed, error, created_at, platform_sources(label, kind)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "POST") {
      const { platformSourceId } = req.body || {};
      if (!platformSourceId || typeof platformSourceId !== "string") {
        return res.status(400).json(fail("Falta platformSourceId"));
      }

      const { data: source, error: sourceError } = await supabase
        .from("platform_sources")
        .select("id, status")
        .eq("id", platformSourceId)
        .maybeSingle();

      if (sourceError) throw sourceError;
      if (!source) return res.status(404).json(fail("Fuente de plataforma no encontrada"));
      if (source.status !== "active") return res.status(409).json(fail("La fuente de plataforma no esta activa"));

      const { data, error } = await supabase
        .from("platform_ingestion_campaigns")
        .insert({ platform_source_id: source.id, status: "queued", requested_by: actor.userId })
        .select("id, status, created_at")
        .single();

      if (error) throw error;
      return res.status(202).json(ok({ campaign: data, message: "Campana publica encolada para worker." }));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
