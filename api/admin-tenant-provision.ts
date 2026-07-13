import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

function validBlueprint(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const blueprint = value as Record<string, unknown>;
  const entity = blueprint.entity;
  return blueprint.version === 1 && Boolean(entity) && typeof entity === "object" && !Array.isArray(entity);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const blueprint = req.body?.blueprint;
    if (!validBlueprint(blueprint)) return res.status(400).json(fail("Blueprint v1 invalido"));

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("provision_tenant_agent_suite", {
      blueprint,
      actor_user_id: actor.userId,
      actor_label: actor.email
    });
    if (error) throw error;
    return res.status(200).json(ok(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
