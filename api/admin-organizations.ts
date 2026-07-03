import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, created_at, tenant_configs(display_name, logo_url, primary_color, status)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "POST") {
      const { name, slug, ownerUserId, config } = req.body || {};
      if (!name || typeof name !== "string") return res.status(400).json(fail("Falta name"));
      const cleanSlug = typeof slug === "string" && slug.trim() ? slugify(slug) : slugify(name);
      if (!cleanSlug) return res.status(400).json(fail("Slug invalido"));

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: name.trim(), slug: cleanSlug })
        .select("id, name, slug, created_at")
        .single();

      if (orgError) throw orgError;

      const tenantConfig = {
        tenant_id: org.id,
        display_name: config?.displayName || name.trim(),
        logo_url: config?.logoUrl || null,
        primary_color: config?.primaryColor || "#24515a",
        status: "onboarding",
        profile_json: config?.profile || {},
        motivations_json: config?.motivations || {},
        created_by: actor.userId
      };

      const { error: configError } = await supabase.from("tenant_configs").insert(tenantConfig);
      if (configError) throw configError;

      if (ownerUserId && typeof ownerUserId === "string") {
        const { error: membershipError } = await supabase.from("organization_memberships").insert({
          tenant_id: org.id,
          auth_user_id: ownerUserId,
          role: "owner",
          status: "active"
        });
        if (membershipError) throw membershipError;
      }

      await supabase.from("audit_events").insert({
        tenant_id: org.id,
        actor_user_id: actor.userId,
        actor_label: actor.email,
        action: "tenant.created",
        target_type: "organization",
        target_id: org.id,
        detail_json: { slug: org.slug, has_owner: Boolean(ownerUserId) }
      });

      return res.status(201).json(ok({ organization: org, config: tenantConfig }));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
