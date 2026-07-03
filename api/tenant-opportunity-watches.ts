import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

const WATCH_REASONS = new Set(["candidate_workspace", "recommended", "saved_search", "profile_match", "draft_generated", "manual_follow"]);
const WATCH_STATUSES = new Set(["active", "paused", "archived"]);

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

async function resolveOpportunityId(supabase: ReturnType<typeof getSupabaseAdmin>, opportunityId?: unknown, canonicalKey?: unknown) {
  if (typeof opportunityId === "string" && opportunityId) return opportunityId;
  if (typeof canonicalKey !== "string" || !canonicalKey) throw new Error("Falta opportunityId o canonicalKey");

  const { data, error } = await supabase
    .from("platform_opportunities")
    .select("id")
    .eq("canonical_key", canonicalKey)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Oportunidad de plataforma no encontrada");
  return String(data.id);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("tenant_opportunity_watches")
        .select("id, reason, status, metadata_json, created_at, updated_at, platform_opportunities(id, canonical_key, title, funder_name, status, source_scope)")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "POST") {
      const { opportunityId, canonicalKey, reason = "manual_follow", metadata } = req.body || {};
      if (typeof reason !== "string" || !WATCH_REASONS.has(reason)) return res.status(400).json(fail("Motivo de seguimiento no valido"));
      const resolvedOpportunityId = await resolveOpportunityId(supabase, opportunityId, canonicalKey);

      const { data, error } = await supabase
        .from("tenant_opportunity_watches")
        .upsert({
          tenant_id: actor.tenantId,
          opportunity_id: resolvedOpportunityId,
          reason,
          status: "active",
          metadata_json: metadata || {},
          created_by: actor.userId,
          updated_at: new Date().toISOString()
        }, { onConflict: "tenant_id,opportunity_id,reason" })
        .select("id, reason, status, metadata_json, created_at, updated_at")
        .single();

      if (error) throw error;
      return res.status(201).json(ok(data));
    }

    if (req.method === "PATCH") {
      const { watchId, status } = req.body || {};
      if (typeof watchId !== "string" || !watchId) return res.status(400).json(fail("Falta watchId"));
      if (typeof status !== "string" || !WATCH_STATUSES.has(status)) return res.status(400).json(fail("Estado de seguimiento no valido"));

      const { data, error } = await supabase
        .from("tenant_opportunity_watches")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", watchId)
        .eq("tenant_id", actor.tenantId)
        .select("id, reason, status, metadata_json, updated_at")
        .single();

      if (error) throw error;
      return res.status(200).json(ok(data));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : message.includes("no encontrada") ? 404 : 400;
    return res.status(status).json(fail(message));
  }
}
