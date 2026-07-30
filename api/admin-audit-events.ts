import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

const LIMIT = 500;
const SAFE_DETAIL_KEYS = new Set(["canonical_key", "opportunity_id", "source_id", "source_url", "sourceUrl", "contract_hash", "reason", "status", "result", "error", "format", "exported_rows", "filters", "worker_dispatch", "human_review_required", "affects_other_tenants", "drafting_allowed"]);

function date(value: unknown, end = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return `${value}${end ? "T23:59:59.999Z" : "T00:00:00.000Z"}`;
}
function safeDetail(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const safe: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!SAFE_DETAIL_KEYS.has(key)) continue;
    if (typeof item === "string") safe[key] = item.slice(0, 500);
    else if (typeof item === "number" || typeof item === "boolean" || item === null) safe[key] = item;
    else if (key === "filters" && item && typeof item === "object") safe[key] = Object.fromEntries(Object.entries(item).slice(0, 6).map(([filterKey, filterValue]) => [filterKey, String(filterValue).slice(0, 120)]));
  }
  return safe;
}
function missingRadarEvents(error: any) { return ["42P01", "PGRST205"].includes(String(error?.code || "")); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));
    await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();
    const from = date(req.query.from), to = date(req.query.to, true);
    if ((req.query.from && !from) || (req.query.to && !to)) return res.status(400).json(fail("El periodo debe usar YYYY-MM-DD"));
    let tenantQuery = supabase.from("audit_events").select("id, tenant_id, actor_label, action, target_type, target_id, detail_json, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(LIMIT);
    if (from) tenantQuery = tenantQuery.gte("created_at", from);
    if (to) tenantQuery = tenantQuery.lte("created_at", to);
    let radarQuery = supabase.from("platform_radar_operation_events").select("id, resource_type, resource_id, transition, actor_scope, reason, evidence_json, created_at").order("created_at", { ascending: false }).limit(LIMIT);
    if (from) radarQuery = radarQuery.gte("created_at", from);
    if (to) radarQuery = radarQuery.lte("created_at", to);
    const [tenantEvents, organizations, radarEvents] = await Promise.all([
      tenantQuery,
      supabase.from("organizations").select("id, name, slug").order("name"),
      radarQuery
    ]);
    if (tenantEvents.error) throw tenantEvents.error;
    if (organizations.error) throw organizations.error;
    if (radarEvents.error && !missingRadarEvents(radarEvents.error)) throw radarEvents.error;
    const organizationById = new Map((organizations.data || []).map((item: any) => [item.id, item]));
    const tenantRows = (tenantEvents.data || []).map((item: any) => ({
      id: `tenant:${item.id}`, scope: "tenant", tenant: organizationById.get(item.tenant_id) || null,
      actor: item.actor_label, action: item.action, targetType: item.target_type, targetId: item.target_id,
      detail: safeDetail(item.detail_json), createdAt: item.created_at
    }));
    const radarRows = radarEvents.error ? [] : (radarEvents.data || []).map((item: any) => ({
      id: `platform:${item.id}`, scope: "platform", tenant: null, actor: item.actor_scope,
      action: `radar.${item.transition}`, targetType: item.resource_type, targetId: item.resource_id,
      detail: safeDetail({ ...item.evidence_json, reason: item.reason }), createdAt: item.created_at
    }));
    const events = [...tenantRows, ...radarRows].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))).slice(0, LIMIT);
    return res.status(200).json(ok({ events, returned: events.length, tenantEventTotal: tenantEvents.count || tenantRows.length, radarEventsState: radarEvents.error ? "unavailable_schema" : "available", limit: LIMIT, detailPolicy: "metadata_and_provenance_only" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
