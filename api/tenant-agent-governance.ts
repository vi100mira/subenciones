import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

const CONSENT_TYPES = new Set(["public_web_analysis", "ai_processing"]);

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function validConsentScope(consentType: string, scope: Record<string, unknown>) {
  if (JSON.stringify(scope).length > 4_000) return false;
  if (consentType === "public_web_analysis") {
    return typeof scope.baseUrl === "string" && scope.baseUrl.startsWith("https://") && scope.sameDomainOnly === true;
  }
  const classes = Array.isArray(scope.allowedDataClasses) ? scope.allowedDataClasses : [];
  return scope.provider === "openai" && scope.store === false
    && classes.length > 0 && classes.every((item) => ["public", "internal_approved"].includes(String(item)));
}

async function setConsent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  actorId: string,
  consentType: string,
  status: "granted" | "revoked",
  scope: Record<string, unknown>
) {
  const { data: existing, error: readError } = await supabase.from("tenant_data_consents")
    .select("id").eq("tenant_id", tenantId).eq("consent_type", consentType)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (readError) throw readError;
  const now = new Date().toISOString();
  const row = {
    status,
    scope_json: scope,
    granted_by: status === "granted" ? actorId : null,
    granted_at: status === "granted" ? now : null,
    revoked_by: status === "revoked" ? actorId : null,
    revoked_at: status === "revoked" ? now : null,
    updated_at: now
  };
  if (existing?.id) {
    const { error } = await supabase.from("tenant_data_consents").update(row).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase.from("tenant_data_consents").insert({
    tenant_id: tenantId,
    consent_type: consentType,
    ...row
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const [agents, consents, webSource, tenantConfig] = await Promise.all([
        supabase.from("tenant_agent_configs").select("agent_key, status, enabled, status_reason, permissions_json, last_verified_at")
          .eq("tenant_id", actor.tenantId).order("agent_key"),
        supabase.from("tenant_data_consents").select("consent_type, status, scope_json, granted_at, revoked_at")
          .eq("tenant_id", actor.tenantId).in("consent_type", [...CONSENT_TYPES]),
        supabase.from("source_connections").select("id, label, kind, scope, status, approved_at, config_json")
          .eq("tenant_id", actor.tenantId).eq("label", "Web pública de la entidad").limit(1).maybeSingle(),
        supabase.from("tenant_configs").select("profile_json").eq("tenant_id", actor.tenantId).single()
      ]);
      for (const result of [agents, consents, webSource, tenantConfig]) if (result.error) throw result.error;
      return res.status(200).json(ok({
        agents: agents.data || [], consents: consents.data || [], webSource: webSource.data || null,
        profileReviewState: String(tenantConfig.data?.profile_json?.review_state || "")
      }));
    }

    if (req.method !== "PATCH") return res.status(405).json(fail("Method Not Allowed"));
    const { action, consentType, scope, sourceId, agentKey } = req.body || {};
    let targetType = "agent_suite";
    let targetId = actor.tenantId;
    if (["grant_consent", "revoke_consent"].includes(action)) {
      if (typeof consentType !== "string" || !CONSENT_TYPES.has(consentType)) return res.status(400).json(fail("Consentimiento no permitido"));
      if (!scope || typeof scope !== "object" || Array.isArray(scope)) return res.status(400).json(fail("Falta alcance explícito del consentimiento"));
      if (!validConsentScope(consentType, scope)) return res.status(400).json(fail("Alcance de consentimiento inválido"));
      targetType = "tenant_consent";
      targetId = await setConsent(supabase, actor.tenantId, actor.userId, consentType, action === "grant_consent" ? "granted" : "revoked", scope);
    } else if (action === "approve_public_web_source") {
      if (typeof sourceId !== "string" || !sourceId) return res.status(400).json(fail("Falta sourceId"));
      const { data, error } = await supabase.from("source_connections").update({
        status: "active",
        health_status: "unknown",
        approved_by: actor.userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", sourceId).eq("tenant_id", actor.tenantId)
        .eq("label", "Web pública de la entidad").eq("scope", "tenant_public").eq("kind", "official_portal")
        .select("id").single();
      if (error) throw error;
      targetType = "source_connection";
      targetId = data.id;
    } else if (["pause_agent", "resume_agent"].includes(action)) {
      if (typeof agentKey !== "string" || !agentKey) return res.status(400).json(fail("Falta agentKey"));
      if (action === "resume_agent") await requireTenantAgentEntitlement(supabase, actor.tenantId, agentKey);
      const { data, error } = await supabase.from("tenant_agent_configs").update({
        status: action === "pause_agent" ? "paused" : "requested",
        enabled: false,
        status_reason: action === "pause_agent" ? "Pausado por administración de la entidad" : "Reactivación solicitada",
        updated_at: new Date().toISOString()
      }).eq("tenant_id", actor.tenantId).eq("agent_key", agentKey).select("agent_key").single();
      if (error) throw error;
      targetType = "tenant_agent";
      targetId = data.agent_key;
    } else {
      return res.status(400).json(fail("Acción de gobierno no reconocida"));
    }

    const { data: agents, error: reconcileError } = await supabase.rpc("reconcile_tenant_agent_suite", { target_tenant_id: actor.tenantId });
    if (reconcileError) throw reconcileError;
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.role,
      action: `tenant_governance.${action}`,
      target_type: targetType,
      target_id: targetId,
      detail_json: { consent_type: consentType || null, scope_keys: scope ? Object.keys(scope) : [], agent_key: agentKey || null }
    });
    return res.status(200).json(ok({ agents: agents || [], action, targetId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") || message.includes("no incluido") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
