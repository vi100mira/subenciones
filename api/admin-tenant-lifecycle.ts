import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "PATCH") return res.status(405).json(fail("Method Not Allowed"));
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const { action, tenantId, slug, reason } = req.body || {};
    if (!new Set(["activate", "archive", "restore"]).has(action)) return res.status(400).json(fail("Acción de ciclo de vida inválida"));
    if (typeof reason !== "string" || reason.trim().length < 5) return res.status(400).json(fail("Motivo obligatorio"));
    if ((!tenantId || typeof tenantId !== "string") && (!slug || typeof slug !== "string")) {
      return res.status(400).json(fail("Falta tenantId o slug"));
    }

    const supabase = getSupabaseAdmin();
    let query = supabase.from("organizations").select("id, name, slug, tenant_configs(status)");
    query = tenantId ? query.eq("id", tenantId) : query.eq("slug", slug);
    const { data: organization, error: organizationError } = await query.maybeSingle();
    if (organizationError) throw organizationError;
    if (!organization) return res.status(404).json(fail("Entidad no encontrada"));
    const now = new Date().toISOString();

    if (action === "archive") {
      const { error: configError } = await supabase.from("tenant_configs")
        .update({ status: "archived", updated_at: now }).eq("tenant_id", organization.id);
      if (configError) throw configError;
      const { error: agentsError } = await supabase.from("tenant_agent_configs").update({
        status: "paused", enabled: false, status_reason: "Tenant archivado", updated_at: now
      }).eq("tenant_id", organization.id).neq("status", "disabled");
      if (agentsError) throw agentsError;
      const { error: runsError } = await supabase.from("tenant_agent_runs").update({
        status: "cancelled", error: "Tenant archivado", finished_at: now, updated_at: now
      }).eq("tenant_id", organization.id).in("status", ["queued", "preparing_context", "awaiting_provider", "generating"]);
      if (runsError) throw runsError;
    } else if (action === "restore") {
      const { error: configError } = await supabase.from("tenant_configs")
        .update({ status: "active", updated_at: now }).eq("tenant_id", organization.id).eq("status", "archived");
      if (configError) throw configError;
      const { error: agentsError } = await supabase.from("tenant_agent_configs").update({
        status: "requested", enabled: false, status_reason: "Restauración solicitada", updated_at: now
      }).eq("tenant_id", organization.id).eq("status", "paused").eq("status_reason", "Tenant archivado");
      if (agentsError) throw agentsError;
    } else {
      const currentConfig = Array.isArray(organization.tenant_configs) ? organization.tenant_configs[0] : organization.tenant_configs;
      if (currentConfig?.status !== "onboarding") return res.status(409).json(fail("Solo puede activarse una entidad en onboarding"));
      const { error: configError } = await supabase.from("tenant_configs")
        .update({ status: "active", updated_at: now }).eq("tenant_id", organization.id).eq("status", "onboarding");
      if (configError) throw configError;
    }

    const { data: agents, error: reconcileError } = await supabase.rpc("reconcile_tenant_agent_suite", {
      target_tenant_id: organization.id
    });
    if (reconcileError) throw reconcileError;
    await supabase.from("audit_events").insert({
      tenant_id: organization.id,
      actor_user_id: actor.userId,
      actor_label: actor.email,
      action: `tenant.${action}d`,
      target_type: "organization",
      target_id: organization.id,
      detail_json: { reason: reason.trim(), reversible: true, hard_delete: false }
    });
    return res.status(200).json(ok({ organization: { id: organization.id, name: organization.name, slug: organization.slug }, status: action === "archive" ? "archived" : "active", agents }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
