import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

const DECISIONS = new Set(["pending", "preselected", "dismissed"]);
const STAGES = new Set(["documents_pending", "documents_ready", "active", "abandoned"]);
const REASONS = new Set(["eligibility", "low_fit", "deadline", "capacity", "strategy", "duplicate", "other"]);

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

async function latestMatchRun(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string) {
  const result = await supabase.from("tenant_agent_runs")
    .select("id, status, review_started_at, review_completed_at, updated_at")
    .eq("tenant_id", tenantId).eq("agent_key", "match_agent")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("No existe un encaje para revisar");
  return result.data;
}

async function audit(supabase: ReturnType<typeof getSupabaseAdmin>, actor: any, action: string, targetType: string, targetId: string, detail: Record<string, unknown>) {
  const { error } = await supabase.from("audit_events").insert({
    tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
    action, target_type: targetType, target_id: targetId, detail_json: detail
  });
  if (error) throw error;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "PATCH") return res.status(405).json(fail("Method Not Allowed"));
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    const supabase = getSupabaseAdmin();
    const body = req.body || {};
    const run = await latestMatchRun(supabase, actor.tenantId);

    if (body.action === "start_review") {
      if (!run.review_started_at) {
        const now = new Date().toISOString();
        const { error } = await supabase.from("tenant_agent_runs").update({ review_started_at: now, updated_at: now }).eq("id", run.id).eq("tenant_id", actor.tenantId);
        if (error) throw error;
        await audit(supabase, actor, "match_agent.review_started", "agent_run", run.id, { human_review_required: true });
      }
      return res.status(200).json(ok({ ...run, review_started_at: run.review_started_at || new Date().toISOString() }));
    }

    if (body.action === "complete_review") {
      const { count, error: countError } = await supabase.from("tenant_opportunity_recommendations")
        .select("id", { count: "exact", head: true }).eq("tenant_id", actor.tenantId)
        .in("recommendation_status", ["candidate", "review"]).eq("decision_status", "pending");
      if (countError) throw countError;
      if (count) return res.status(409).json(fail(`Quedan ${count} oportunidades prioritarias por decidir`));
      const now = new Date().toISOString();
      const { error } = await supabase.from("tenant_agent_runs").update({ review_completed_at: now, updated_at: now }).eq("id", run.id).eq("tenant_id", actor.tenantId);
      if (error) throw error;
      await audit(supabase, actor, "match_agent.review_completed", "agent_run", run.id, { low_fit_requires_no_automatic_approval: true });
      return res.status(200).json(ok({ ...run, review_completed_at: now }));
    }

    if (!run.review_started_at) {
      const startedAt = new Date().toISOString();
      const { error } = await supabase.from("tenant_agent_runs").update({ review_started_at: startedAt, updated_at: startedAt }).eq("id", run.id).eq("tenant_id", actor.tenantId);
      if (error) throw error;
      await audit(supabase, actor, "match_agent.review_started", "agent_run", run.id, { started_by_decision: true });
    }

    const recommendationId = String(body.recommendationId || "");
    if (!recommendationId) return res.status(400).json(fail("Falta recommendationId"));
    const current = await supabase.from("tenant_opportunity_recommendations")
      .select("id, decision_status, candidacy_stage").eq("id", recommendationId).eq("tenant_id", actor.tenantId).single();
    if (current.error) throw current.error;
    const now = new Date().toISOString();

    if (body.action === "decide") {
      const decisionStatus = String(body.decisionStatus || "");
      const reason = body.reason ? String(body.reason) : null;
      if (!DECISIONS.has(decisionStatus)) return res.status(400).json(fail("Decisión no válida"));
      if (decisionStatus === "dismissed" && (!reason || !REASONS.has(reason))) return res.status(400).json(fail("Selecciona un motivo de descarte"));
      const stage = decisionStatus === "dismissed" && current.data.candidacy_stage !== "none" ? "abandoned" : decisionStatus === "pending" || current.data.candidacy_stage === "abandoned" ? "none" : current.data.candidacy_stage;
      const humanReviewStatus = decisionStatus === "dismissed" ? "dismissed" : decisionStatus === "preselected" ? "reviewed" : "pending";
      const update = await supabase.from("tenant_opportunity_recommendations").update({
        decision_status: decisionStatus, decision_reason: reason, decision_note: body.note ? String(body.note).slice(0, 1000) : null,
        candidacy_stage: stage, stage_updated_at: stage !== current.data.candidacy_stage ? now : undefined,
        human_review_status: humanReviewStatus, reviewed_by: decisionStatus === "pending" ? null : actor.userId,
        reviewed_at: decisionStatus === "pending" ? null : now, updated_at: now
      }).eq("id", recommendationId).eq("tenant_id", actor.tenantId)
        .select("id, decision_status, decision_reason, decision_note, candidacy_stage, human_review_status, reviewed_at, updated_at").single();
      if (update.error) throw update.error;
      await audit(supabase, actor, `match_agent.${decisionStatus}`, "recommendation", recommendationId, { reason, candidacy_stage: stage });
      return res.status(200).json(ok(update.data));
    }

    if (body.action === "set_stage") {
      const stage = String(body.candidacyStage || "");
      if (!STAGES.has(stage)) return res.status(400).json(fail("Fase de candidatura no válida"));
      if (current.data.decision_status !== "preselected" && stage !== "abandoned") return res.status(409).json(fail("Primero debes preseleccionar la oportunidad"));
      const reason = body.reason ? String(body.reason) : null;
      if (stage === "abandoned" && (!reason || !REASONS.has(reason))) return res.status(400).json(fail("Selecciona un motivo de abandono"));
      const update = await supabase.from("tenant_opportunity_recommendations").update({
        candidacy_stage: stage, stage_updated_at: now, decision_status: stage === "abandoned" ? "dismissed" : "preselected",
        decision_reason: stage === "abandoned" ? reason : null, human_review_status: stage === "abandoned" ? "dismissed" : "reviewed",
        reviewed_by: actor.userId, reviewed_at: now, updated_at: now
      }).eq("id", recommendationId).eq("tenant_id", actor.tenantId)
        .select("id, decision_status, decision_reason, candidacy_stage, human_review_status, reviewed_at, updated_at").single();
      if (update.error) throw update.error;
      await audit(supabase, actor, `match_agent.stage_${stage}`, "recommendation", recommendationId, { reason });
      return res.status(200).json(ok(update.data));
    }

    return res.status(400).json(fail("Acción no válida"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
