import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

type QueryResult = { data: unknown; error: { message?: string } | null; count?: number | null };

function assertQueries(results: QueryResult[]) {
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message || "No se pudo leer el estado de plataforma");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));
    await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();

    const results = await Promise.all([
      supabase.from("organizations").select("id, name, slug, created_at").order("name"),
      supabase.from("tenant_configs").select("tenant_id, status, updated_at"),
      supabase.from("platform_agent_definitions").select("agent_key, display_name, scope, execution_mode, requires_human_review, active").eq("active", true).order("display_name"),
      supabase.from("tenant_agent_configs").select("tenant_id, agent_key, status, enabled, status_reason, last_verified_at, updated_at").order("updated_at", { ascending: false }),
      supabase.from("tenant_agent_runs").select("id, tenant_id, agent_key, status, provider, model, usage_json, error, created_at, started_at, finished_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("audit_events").select("id, tenant_id, actor_label, action, target_type, target_id, created_at").order("created_at", { ascending: false }).limit(300),
      supabase.from("platform_sources").select("id, label, kind, url, status, health_status, priority, last_synced_at, updated_at").order("priority", { ascending: false }),
      supabase.from("platform_ingestion_campaigns").select("id, platform_source_id, campaign_key, status, scanned, changed, vectorized, skipped, failed, error, requested_by, started_at, finished_at, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("platform_opportunities").select("id", { count: "exact", head: true }),
      supabase.from("platform_opportunity_change_events").select("id", { count: "exact", head: true }).eq("human_review_status", "pending"),
      supabase.from("tenant_change_alerts").select("id", { count: "exact", head: true }).in("status", ["new", "reviewing"])
    ]) as QueryResult[];

    assertQueries(results);
    const [organizations, configs, definitions, agentConfigs, runs, audit, sources, campaigns, opportunities, reviews, alerts] = results;

    return res.status(200).json(ok({
      generatedAt: new Date().toISOString(),
      organizations: organizations.data || [],
      tenantConfigs: configs.data || [],
      agentDefinitions: definitions.data || [],
      tenantAgents: agentConfigs.data || [],
      agentRuns: runs.data || [],
      auditEvents: audit.data || [],
      platformSources: sources.data || [],
      ingestionCampaigns: campaigns.data || [],
      counts: {
        opportunities: opportunities.count || 0,
        pendingPlatformReviews: reviews.count || 0,
        pendingTenantAlerts: alerts.count || 0
      },
      privacy: {
        tenantContentReturned: false,
        auditDetailsReturned: false,
        scope: "operational_metadata_only"
      }
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
