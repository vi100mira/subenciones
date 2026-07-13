import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
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
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();
    if (req.method === "GET") {
      const slug = typeof req.query.slug === "string" ? req.query.slug : "";
      if (!slug) return res.status(400).json(fail("Falta slug"));
      const { data: organization, error: organizationError } = await supabase.from("organizations").select(`
        id, name, slug,
        tenant_configs(display_name, primary_color, profile_json),
        organization_memberships(auth_user_id, role, status)
      `).eq("slug", slug).maybeSingle();
      if (organizationError) throw organizationError;
      if (!organization) return res.status(404).json(fail("Entidad no encontrada"));
      const { data: webSource, error: sourceError } = await supabase.from("source_connections")
        .select("config_json").eq("tenant_id", organization.id).eq("label", "Web pública de la entidad")
        .limit(1).maybeSingle();
      if (sourceError) throw sourceError;
      const config = Array.isArray(organization.tenant_configs) ? organization.tenant_configs[0] : organization.tenant_configs;
      const members = Array.isArray(organization.organization_memberships) ? organization.organization_memberships : [];
      const owner = members.find((member) => member.role === "owner" && member.status === "active");
      const blueprint = {
        version: 1,
        entity: {
          name: organization.name,
          slug: organization.slug,
          displayName: config?.display_name || organization.name,
          websiteUrl: webSource?.config_json?.base_url || null,
          primaryColor: config?.primary_color || "#24515a"
        },
        ...(owner?.auth_user_id ? { ownerUserId: owner.auth_user_id } : {}),
        profile: config?.profile_json || {},
        motivations: { recovery_blueprint: true }
      };
      const blueprintHash = createHash("sha256").update(JSON.stringify(blueprint)).digest("hex");
      await supabase.from("audit_events").insert({
        tenant_id: organization.id,
        actor_user_id: actor.userId,
        actor_label: actor.email,
        action: "tenant.blueprint_exported",
        target_type: "organization",
        target_id: organization.id,
        detail_json: { blueprint_version: 1, blueprint_hash: blueprintHash, consents_exported: false }
      });
      return res.status(200).json(ok({
        blueprint,
        blueprintHash,
        warnings: ["No contiene consentimientos, documentos privados ni secretos.", "Tras un borrado definitivo deben concederse de nuevo los consentimientos."]
      }));
    }

    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const blueprint = req.body?.blueprint;
    if (!validBlueprint(blueprint)) return res.status(400).json(fail("Blueprint v1 invalido"));
    const ownerEmail = typeof req.body?.ownerEmail === "string" ? req.body.ownerEmail.trim().toLowerCase() : "";
    let ownerUserId = typeof blueprint.ownerUserId === "string" ? blueprint.ownerUserId : "";
    if (!ownerUserId && ownerEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return res.status(400).json(fail("Email propietario invalido"));
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;
      ownerUserId = users.users.find((user) => user.email?.toLowerCase() === ownerEmail)?.id || "";
      if (!ownerUserId) return res.status(409).json(fail("El propietario debe existir primero en Supabase Auth"));
    }
    const resolvedBlueprint = ownerUserId ? { ...blueprint, ownerUserId } : blueprint;
    const { data, error } = await supabase.rpc("provision_tenant_agent_suite", {
      blueprint: resolvedBlueprint,
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
