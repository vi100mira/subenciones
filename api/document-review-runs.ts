import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

async function dispatchWorker() {
  const token = process.env.HOSTED_WORKER_GITHUB_TOKEN || process.env.DRAFT_WORKER_GITHUB_TOKEN;
  const repository = process.env.HOSTED_WORKER_GITHUB_REPOSITORY || process.env.DRAFT_WORKER_GITHUB_REPOSITORY;
  const ref = process.env.HOSTED_WORKER_GITHUB_REF || process.env.DRAFT_WORKER_GITHUB_REF || "main";
  if (!token || !repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return { status: "fallback_cron" as const };
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/workers-alojados.yml/dispatches`, {
      method: "POST",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "subvenciones-document-review-orchestrator", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ ref, inputs: { proceso: "documentos" } })
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
      const { data, error } = await supabase.from("tenant_document_reviews").select(`
        id, requirements_json, risks_json, source_manifest_json, human_review_status, reviewed_at, created_at, updated_at,
        platform_opportunities(id, canonical_key, title),
        platform_opportunity_versions!inner(id, version_status, bases_url, official_url, source_url)
      `).eq("tenant_id", actor.tenantId).eq("platform_opportunity_versions.version_status", "current")
        .order("updated_at", { ascending: false }).limit(100);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }
    if (req.method === "PATCH") {
      const { reviewId, reviewStatus } = req.body || {};
      if (typeof reviewId !== "string" || !reviewId) return res.status(400).json(fail("Falta reviewId"));
      if (!new Set(["reviewed", "dismissed"]).has(reviewStatus)) return res.status(400).json(fail("reviewStatus inválido"));
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("tenant_document_reviews").update({ human_review_status: reviewStatus, reviewed_by: actor.userId, reviewed_at: now, updated_at: now })
        .eq("id", reviewId).eq("tenant_id", actor.tenantId).select("id, human_review_status, reviewed_at").single();
      if (error) throw error;
      await supabase.from("audit_events").insert({ tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role, action: `document_review.${reviewStatus}`, target_type: "document_review", target_id: reviewId, detail_json: { human_review_status: reviewStatus } });
      return res.status(200).json(ok(data));
    }
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const canonicalKey = req.body?.canonicalKey;
    if (typeof canonicalKey !== "string" || !canonicalKey) return res.status(400).json(fail("Falta canonicalKey"));
    const [agentResult, opportunityResult] = await Promise.all([
      supabase.from("tenant_agent_configs").select("status, enabled").eq("tenant_id", actor.tenantId).eq("agent_key", "document_review").maybeSingle(),
      supabase.from("platform_opportunities").select("id, canonical_key, status").eq("canonical_key", canonicalKey).maybeSingle()
    ]);
    if (agentResult.error) throw agentResult.error;
    if (opportunityResult.error) throw opportunityResult.error;
    if (agentResult.data?.status !== "ready" || !agentResult.data.enabled) return res.status(409).json(fail("Revisión documental no habilitada"));
    if (!opportunityResult.data) return res.status(404).json(fail("Oportunidad no encontrada"));
    if (!["open", "rolling"].includes(opportunityResult.data.status)) return res.status(409).json(fail("La oportunidad no está abierta"));
    const { data: version, error: versionError } = await supabase.from("platform_opportunity_versions").select("id, content_hash")
      .eq("opportunity_id", opportunityResult.data.id).eq("version_status", "current").maybeSingle();
    if (versionError) throw versionError;
    if (!version) return res.status(409).json(fail("Falta versión oficial vigente"));
    const { data: run, error: runError } = await supabase.from("tenant_agent_runs").insert({
      tenant_id: actor.tenantId, agent_key: "document_review", opportunity_id: opportunityResult.data.id,
      opportunity_version_id: version.id, status: "queued", dedupe_key: `document-review:${version.id}`,
      use_approved_internal_facts: false,
      input_manifest_json: { canonicalKey, contentHash: version.content_hash, allowedDataClasses: ["public"], humanReviewRequired: true, externalSubmissionAllowed: false }, requested_by: actor.userId
    }).select("id, status, created_at").single();
    if (runError?.code === "23505") return res.status(409).json(fail("Ya existe una revisión documental activa"));
    if (runError) throw runError;
    const dispatch = await dispatchWorker();
    await supabase.from("audit_events").insert({ tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role, action: "document_review.queued", target_type: "agent_run", target_id: run.id, detail_json: { canonical_key: canonicalKey, worker_dispatch: dispatch.status, human_review_required: true } });
    return res.status(202).json(ok({ run, dispatch, message: "Revisión documental encolada para comprobación humana." }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
