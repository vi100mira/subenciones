import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorMessage, fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

const DEFAULT_DEMO_SLUG = "novaterra-demo";

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));

    const actor = await requireSourcePermission(req.headers.authorization, "sources:read", requestedTenant(req));
    const slug = firstQueryValue(req.query.slug) || DEFAULT_DEMO_SLUG;
    if (slug !== DEFAULT_DEMO_SLUG) return res.status(403).json(fail("Solo disponible para demo no sensible"));

    const supabase = getSupabaseAdmin();
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, tenant_configs(display_name, status, profile_json, motivations_json)")
      .eq("id", actor.tenantId)
      .eq("slug", slug)
      .single();

    if (orgError) throw orgError;

    const tenantId = actor.tenantId;
    const [sources, documents, consents, audit] = await Promise.all([
      supabase
        .from("source_connections")
        .select("label, kind, scope, status, health_status, priority")
        .eq("tenant_id", tenantId)
        .order("priority", { ascending: false }),
      supabase
        .from("source_documents")
        .select("title, data_class, extraction_status, metadata_json")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tenant_data_consents")
        .select("consent_type, status, scope_json")
        .eq("tenant_id", tenantId),
      supabase
        .from("audit_events")
        .select("actor_label, action, target_type, created_at, detail_json")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5)
    ]);

    for (const result of [sources, documents, consents, audit]) {
      if (result.error) throw result.error;
    }

    return res.status(200).json(
      ok({
        organization: org,
        sources: sources.data || [],
        documents: documents.data || [],
        consents: consents.data || [],
        audit: audit.data || []
      })
    );
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
