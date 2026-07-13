import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function dispatchWorker() {
  const token = process.env.HOSTED_WORKER_GITHUB_TOKEN || process.env.DRAFT_WORKER_GITHUB_TOKEN;
  const repository = process.env.HOSTED_WORKER_GITHUB_REPOSITORY || process.env.DRAFT_WORKER_GITHUB_REPOSITORY;
  const ref = process.env.HOSTED_WORKER_GITHUB_REF || process.env.DRAFT_WORKER_GITHUB_REF || "main";
  if (!token || !repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return { status: "fallback_cron" as const };
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/workers-alojados.yml/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "subvenciones-entity-research-orchestrator",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({ ref, inputs: { proceso: "investigador" } })
    });
    return { status: response.status === 204 ? "requested" as const : "fallback_cron" as const };
  } catch {
    return { status: "fallback_cron" as const };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "POST" ? "sources:write" : "sources:read";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();
    if (req.method === "GET") {
      const { data, error } = await supabase.from("tenant_agent_runs")
        .select("id, agent_key, status, error, input_manifest_json, context_manifest_json, output_json, usage_json, created_at, updated_at")
        .eq("tenant_id", actor.tenantId).eq("agent_key", "entity_research")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));

    const [agentResult, consentResult, sourceResult] = await Promise.all([
      supabase.from("tenant_agent_configs").select("status, enabled").eq("tenant_id", actor.tenantId).eq("agent_key", "entity_research").maybeSingle(),
      supabase.from("tenant_data_consents").select("id").eq("tenant_id", actor.tenantId)
        .eq("consent_type", "public_web_analysis").eq("status", "granted").limit(1).maybeSingle(),
      supabase.from("source_connections").select("id, config_json").eq("tenant_id", actor.tenantId)
        .eq("label", "Web pública de la entidad").eq("status", "active").limit(1).maybeSingle()
    ]);
    if (agentResult.error) throw agentResult.error;
    if (consentResult.error) throw consentResult.error;
    if (sourceResult.error) throw sourceResult.error;
    if (agentResult.data?.status !== "ready" || !agentResult.data.enabled) return res.status(409).json(fail("Investigador no habilitado"));
    if (!consentResult.data) return res.status(409).json(fail("Falta consentimiento vigente para analizar la web pública"));
    const baseUrl = sourceResult.data?.config_json?.base_url;
    if (!sourceResult.data || typeof baseUrl !== "string") return res.status(409).json(fail("Falta una fuente web pública aprobada"));

    const manifest = {
      sourceConnectionId: sourceResult.data.id,
      baseUrlHash: digest(baseUrl),
      allowedDataClasses: ["public"],
      humanReviewRequired: true,
      externalAiAllowed: false
    };
    const { data: run, error: runError } = await supabase.from("tenant_agent_runs").insert({
      tenant_id: actor.tenantId,
      agent_key: "entity_research",
      status: "queued",
      dedupe_key: `entity-research:${sourceResult.data.id}:${manifest.baseUrlHash}`,
      use_approved_internal_facts: false,
      input_manifest_json: manifest,
      requested_by: actor.userId
    }).select("id, status, input_manifest_json, created_at").single();
    if (runError?.code === "23505") return res.status(409).json(fail("Ya existe una investigación activa para esta web"));
    if (runError) throw runError;
    const dispatch = await dispatchWorker();
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.role,
      action: "entity_research.queued",
      target_type: "agent_run",
      target_id: run.id,
      detail_json: { source_connection_id: sourceResult.data.id, worker_dispatch: dispatch.status, public_only: true }
    });
    return res.status(202).json(ok({ run, dispatch, message: "Investigación pública encolada para revisión humana." }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
