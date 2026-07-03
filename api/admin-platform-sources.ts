import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("platform_sources")
        .select("id, label, kind, url, status, health_status, priority, last_synced_at, updated_at")
        .order("priority", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "POST") {
      const { label, kind, url, priority, config } = req.body || {};
      if (!label || !kind) return res.status(400).json(fail("Faltan label o kind"));

      const { data, error } = await supabase
        .from("platform_sources")
        .insert({
          label,
          kind,
          url: url || null,
          priority: Number.isFinite(priority) ? priority : 50,
          config_json: config || {},
          created_by: actor.userId
        })
        .select("id, label, kind, url, status, health_status, priority, created_at")
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
