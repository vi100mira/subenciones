import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorMessage, fail, ok } from "../src/apiResponse.js";
import { storedPrivatePreflightCanQueue } from "../src/privateSourcePreflight.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

const CONSENT_TYPES = new Set([
  "public_web_analysis", "manual_upload", "drive_connection", "sharepoint_connection", "ai_processing"
]);

const EXECUTION_POLICIES: Record<string, { modeLabel: string; nextLabel: string }> = {
  grant_search: { modeLabel: "Programado por la plataforma", nextLabel: "Diariamente a las 05:15 UTC" },
  entity_research: { modeLabel: "Manual por la entidad", nextLabel: "Cuando una persona solicite buscar cambios" },
  match_agent: { modeLabel: "Manual tras revisión", nextLabel: "Cuando el perfil aprobado solicite un nuevo encaje" },
  document_review: { modeLabel: "Por expediente", nextLabel: "Al iniciar o actualizar la revisión de unas bases" },
  draft_agent: { modeLabel: "Manual con datos aprobados", nextLabel: "Cuando una persona abra la preparación documental" },
  alert_agent: { modeLabel: "Programable por canal", nextLabel: "Pendiente de activar un canal de avisos" }
};

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function validConsentScope(consentType: string, scope: Record<string, unknown>) {
  if (JSON.stringify(scope).length > 4_000) return false;
  if (consentType === "public_web_analysis") {
    return typeof scope.baseUrl === "string" && scope.baseUrl.startsWith("https://") && scope.sameDomainOnly === true;
  }
  if (["manual_upload", "drive_connection", "sharepoint_connection"].includes(consentType)) {
    const validConnector = consentType === "manual_upload"
      ? ["local_folder", "manual_upload"].includes(String(scope.connector))
      : consentType === "drive_connection"
        ? scope.connector === "google_drive"
        : scope.connector === "microsoft_graph";
    return validConnector && scope.readOnly === true && scope.externalTransfer === false
      && scope.includePersonalData === false && scope.includeSensitiveData === false;
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
      const [agents, definitions, runs, runAudits, latestPlatformCampaign, consents, webSource, privateSources, tenantConfig] = await Promise.all([
        supabase.from("tenant_agent_configs").select("agent_key, status, enabled, status_reason, permissions_json, last_verified_at")
          .eq("tenant_id", actor.tenantId).order("agent_key"),
        supabase.from("platform_agent_definitions").select("agent_key, execution_mode, requires_human_review").order("agent_key"),
        supabase.from("tenant_agent_runs")
          .select("id, agent_key, status, created_at, started_at, finished_at, error")
          .eq("tenant_id", actor.tenantId).order("created_at", { ascending: false }).limit(100),
        supabase.from("audit_events").select("target_id, actor_label, action, created_at")
          .eq("tenant_id", actor.tenantId).eq("target_type", "agent_run")
          .order("created_at", { ascending: false }).limit(300),
        supabase.from("platform_ingestion_campaigns")
          .select("id, status, requested_by, created_at, started_at, finished_at, error")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("tenant_data_consents").select("consent_type, status, scope_json, granted_at, revoked_at")
          .eq("tenant_id", actor.tenantId).in("consent_type", [...CONSENT_TYPES]),
        supabase.from("source_connections").select("id, label, kind, scope, status, approved_at, config_json")
          .eq("tenant_id", actor.tenantId).eq("label", "Web pública de la entidad").limit(1).maybeSingle(),
        supabase.from("source_connections").select("id, label, kind, scope, status, approved_at, health_status, config_json")
          .eq("tenant_id", actor.tenantId).eq("scope", "tenant_private")
          .neq("status", "deleted").order("created_at", { ascending: false }),
        supabase.from("tenant_configs").select("profile_json").eq("tenant_id", actor.tenantId).single()
      ]);
      for (const result of [agents, definitions, runs, runAudits, latestPlatformCampaign, consents, webSource, privateSources, tenantConfig]) if (result.error) throw result.error;
      const executionControls = (definitions.data || []).map((definition) => {
        const tenantRun = (runs.data || []).find((run) => run.agent_key === definition.agent_key) || null;
        const lastRun = definition.agent_key === "grant_search" && latestPlatformCampaign.data ? latestPlatformCampaign.data : tenantRun;
        const queuedAudit = lastRun ? (runAudits.data || []).find((event) => event.target_id === lastRun.id && event.action.endsWith(".queued")) : null;
        const policy = EXECUTION_POLICIES[definition.agent_key] || { modeLabel: "Bajo demanda", nextLabel: "Sin próxima ejecución programada" };
        return {
          agentKey: definition.agent_key,
          executionMode: definition.execution_mode,
          requiresHumanReview: definition.requires_human_review,
          ...policy,
          lastRun: lastRun ? {
            id: lastRun.id, status: lastRun.status, created_at: lastRun.created_at,
            started_at: lastRun.started_at, finished_at: lastRun.finished_at, error: lastRun.error,
            actorLabel: definition.agent_key === "grant_search"
              ? (latestPlatformCampaign.data?.requested_by ? "Operación de plataforma" : "Planificador de plataforma")
              : queuedAudit?.actor_label || "Proceso de la entidad"
          } : null
        };
      });
      const privateSourceIds = (privateSources.data || []).map((source) => source.id);
      let privateIngestionRuns: Array<Record<string, unknown>> = [];
      if (privateSourceIds.length) {
        const { data, error } = await supabase.from("ingestion_runs")
          .select("id, source_connection_id, status, scanned, inserted, updated, skipped, blocked, error, started_at, finished_at, created_at")
          .eq("tenant_id", actor.tenantId).in("source_connection_id", privateSourceIds)
          .order("created_at", { ascending: false }).limit(20);
        if (error) throw error;
        privateIngestionRuns = data || [];
      }
      return res.status(200).json(ok({
        agents: agents.data || [], consents: consents.data || [], webSource: webSource.data || null,
        privateSources: privateSources.data || [], privateIngestionRuns, executionControls,
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
    } else if (action === "approve_private_source") {
      if (typeof sourceId !== "string" || !sourceId) return res.status(400).json(fail("Falta sourceId"));
      const { data: source, error: sourceError } = await supabase.from("source_connections")
        .select("id, kind, config_json").eq("id", sourceId).eq("tenant_id", actor.tenantId)
        .eq("scope", "tenant_private").in("kind", ["local_simulation", "manual_upload", "vercel_blob", "google_drive", "microsoft_graph"])
        .eq("status", "pending_approval").maybeSingle();
      if (sourceError) throw sourceError;
      if (!source) return res.status(409).json(fail("La fuente privada ya no está pendiente de aprobación o no pertenece a esta entidad"));
      if (!storedPrivatePreflightCanQueue(source.config_json)) {
        return res.status(409).json(fail("La fuente privada debe superar el preanálisis sin IA antes de aprobarse"));
      }
      const requiredConsent = source.kind === "google_drive" ? "drive_connection"
        : source.kind === "microsoft_graph" ? "sharepoint_connection" : "manual_upload";
      const { data: consent, error: consentError } = await supabase.from("tenant_data_consents")
        .select("id").eq("tenant_id", actor.tenantId).eq("consent_type", requiredConsent)
        .eq("status", "granted").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (consentError) throw consentError;
      if (!consent) return res.status(409).json(fail("La fuente privada no tiene un consentimiento vigente compatible"));
      const { data, error } = await supabase.from("source_connections").update({
        status: "active", health_status: "unknown", approved_by: actor.userId,
        approved_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq("id", source.id).eq("tenant_id", actor.tenantId).select("id").single();
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
      actor_label: actor.email,
      action: `tenant_governance.${action}`,
      target_type: targetType,
      target_id: targetId,
      detail_json: { consent_type: consentType || null, scope_keys: scope ? Object.keys(scope) : [], agent_key: agentKey || null }
    });
    return res.status(200).json(ok({ agents: agents || [], action, targetId }));
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("Permiso") || message.includes("no incluido") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
