import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { combineApprovedBasesRows, isMissingBasesSchema } from "../src/platformBases.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function reviewSummary(rows: Array<Record<string, any>>, run: Record<string, any> | null) {
  const count = (field: string, value: string) => rows.filter((row) => row[field] === value).length;
  const actionable = rows.filter((row) => row.recommendation_status !== "low_fit");
  const pendingActionable = actionable.filter((row) => row.decision_status === "pending").length;
  return {
    state: run?.review_completed_at ? "completed" : run?.review_started_at ? "in_progress" : "not_started",
    total: rows.length,
    actionable: actionable.length,
    lowFit: count("recommendation_status", "low_fit"),
    pending: count("decision_status", "pending"),
    pendingActionable,
    preselected: count("decision_status", "preselected"),
    preselectedOnly: rows.filter((row) => row.decision_status === "preselected" && row.candidacy_stage === "none").length,
    dismissed: count("decision_status", "dismissed"),
    documentsPending: count("candidacy_stage", "documents_pending"),
    documentsReady: count("candidacy_stage", "documents_ready"),
    active: count("candidacy_stage", "active"),
    abandoned: count("candidacy_stage", "abandoned")
  };
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
        "User-Agent": "subvenciones-tenant-match-orchestrator",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({ ref, inputs: { proceso: "encaje" } })
    });
    return { status: response.status === 204 ? "requested" as const : "fallback_cron" as const };
  } catch {
    return { status: "fallback_cron" as const };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const [recommendations, latestRun] = await Promise.all([
        supabase.from("tenant_opportunity_recommendations").select(`
          id, score, recommendation_status, reasons_json, risks_json, missing_information_json,
          evidence_json, internal_fact_refs_json, profile_snapshot_hash, human_review_status,
          decision_status, decision_reason, decision_note, candidacy_stage, stage_updated_at,
          reviewed_at, created_at, updated_at,
          platform_opportunities(id, canonical_key, title, funder_name, territory, status),
          platform_opportunity_versions!inner(id, source_url, official_url, deadline_text, deadline_status, deadline_confidence,
            eligibility_text, criteria_text, required_documents_text, submission_channel_text, evidence_json, version_status)
        `).eq("tenant_id", actor.tenantId)
          .eq("platform_opportunity_versions.version_status", "current")
          .order("score", { ascending: false }).limit(200),
        supabase.from("tenant_agent_runs")
          .select("id, status, error, output_json, usage_json, review_started_at, review_completed_at, created_at, started_at, finished_at, updated_at")
          .eq("tenant_id", actor.tenantId).eq("agent_key", "match_agent")
          .order("created_at", { ascending: false }).limit(1).maybeSingle()
      ]);
      if (recommendations.error) throw recommendations.error;
      if (latestRun.error) throw latestRun.error;
      const rows = recommendations.data || [];
      const versionIds = [...new Set(rows.map((row: any) => {
        const version = Array.isArray(row.platform_opportunity_versions) ? row.platform_opportunity_versions[0] : row.platform_opportunity_versions;
        return version?.id;
      }).filter(Boolean))];
      const interpretations = versionIds.length
        ? await supabase.from("platform_bases_interpretations")
          .select("id, opportunity_version_id, status, citations_verified, contract_json, reviewed_at")
          .in("opportunity_version_id", versionIds).eq("status", "approved")
        : { data: [], error: null };
      if (interpretations.error && !isMissingBasesSchema(interpretations.error)) throw interpretations.error;
      const basesByVersion = new Map(versionIds.map((versionId) => [versionId, combineApprovedBasesRows(
        (interpretations.data || []).filter((item: any) => item.opportunity_version_id === versionId)
      )]));
      const recommendationsWithBases = rows.map((row: any) => {
        const version = Array.isArray(row.platform_opportunity_versions) ? row.platform_opportunity_versions[0] : row.platform_opportunity_versions;
        return { ...row, bases_interpretation: basesByVersion.get(version?.id) || combineApprovedBasesRows([]) };
      });
      return res.status(200).json(ok({ recommendations: recommendationsWithBases, latestRun: latestRun.data || null, reviewSummary: reviewSummary(rows, latestRun.data) }));
    }

    if (req.method === "PATCH") {
      const { recommendationId, reviewStatus } = req.body || {};
      if (typeof recommendationId !== "string" || !recommendationId) return res.status(400).json(fail("Falta recommendationId"));
      if (!new Set(["reviewed", "dismissed"]).has(reviewStatus)) return res.status(400).json(fail("reviewStatus invalido"));
      const { data, error } = await supabase.from("tenant_opportunity_recommendations").update({
        human_review_status: reviewStatus,
        reviewed_by: actor.userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", recommendationId).eq("tenant_id", actor.tenantId)
        .select("id, human_review_status, reviewed_at").single();
      if (error) throw error;
      await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId,
        actor_user_id: actor.userId,
        actor_label: actor.email,
        action: `match_agent.${reviewStatus}`,
        target_type: "recommendation",
        target_id: recommendationId,
        detail_json: { human_review_status: reviewStatus }
      });
      return res.status(200).json(ok(data));
    }

    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    await requireTenantAgentEntitlement(supabase, actor.tenantId, "match_agent");
    const [agentResult, profileResult] = await Promise.all([
      supabase.from("tenant_agent_configs").select("status, enabled").eq("tenant_id", actor.tenantId).eq("agent_key", "match_agent").maybeSingle(),
      supabase.from("tenant_configs").select("profile_json").eq("tenant_id", actor.tenantId).single()
    ]);
    if (agentResult.error) throw agentResult.error;
    if (profileResult.error) throw profileResult.error;
    if (agentResult.data?.status !== "ready" || !agentResult.data.enabled) return res.status(409).json(fail("Asistente de encaje no habilitado"));
    if (!["approved", "validated", "aprobado"].includes(profileResult.data.profile_json?.review_state)) {
      return res.status(409).json(fail("Falta aprobar el perfil de entidad"));
    }

    const { data: run, error: runError } = await supabase.from("tenant_agent_runs").insert({
      tenant_id: actor.tenantId,
      agent_key: "match_agent",
      status: "queued",
      dedupe_key: `tenant-match:${actor.tenantId}`,
      use_approved_internal_facts: true,
      input_manifest_json: { approvedProfileRequired: true, humanReviewRequired: true, externalAiAllowed: false },
      requested_by: actor.userId
    }).select("id, status, created_at").single();
    if (runError?.code === "23505") return res.status(409).json(fail("Ya existe un cálculo de encaje activo"));
    if (runError) throw runError;
    const dispatch = await dispatchWorker();
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.email,
      action: "match_agent.queued",
      target_type: "agent_run",
      target_id: run.id,
      detail_json: { worker_dispatch: dispatch.status, human_review_required: true }
    });
    return res.status(202).json(ok({ run, dispatch, message: "Cálculo de encaje encolado para revisión humana." }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") || message.includes("no incluido") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
