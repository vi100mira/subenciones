import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { combineApprovedBasesRows, isMissingBasesSchema } from "../src/platformBases.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function reviewState(rows: any[], documentaryGate: string) {
  if (documentaryGate === "requirements_approved") return "approved";
  if (rows.some((row) => row.status === "review_required" && row.citations_verified)) return "ready_for_platform_review";
  if (rows.some((row) => row.status === "review_required")) return "citations_pending";
  if (rows.some((row) => ["queued", "extracting", "interpreting"].includes(row.status))) return "processing";
  if (rows.some((row) => row.status === "failed")) return "failed";
  return "not_started";
}

function stateMessage(state: string, hasRequest: boolean) {
  if (state === "approved") return "Las bases ya están aprobadas para esta versión. Actualiza la candidatura para continuar.";
  if (state === "ready_for_platform_review") return `${hasRequest ? "Revisión solicitada." : "Las citas están preparadas."} Un analista de plataforma debe validarlas.`;
  if (state === "citations_pending") return `${hasRequest ? "Revisión solicitada." : "La lectura está pendiente."} Antes de aprobar, la plataforma debe verificar las citas contra las bases oficiales.`;
  if (state === "processing") return "La lectura de las bases ya está en cola. La aprobación se habilitará cuando termine la extracción y se verifiquen las citas.";
  if (state === "failed") return "La revisión ha quedado registrada, pero la lectura anterior falló y requiere intervención de plataforma.";
  return hasRequest
    ? "Revisión solicitada. La plataforma debe localizar e interpretar las bases oficiales antes de habilitar la redacción."
    : "La plataforma debe localizar e interpretar las bases oficiales antes de habilitar la redacción.";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!['GET', 'POST'].includes(req.method || "")) return res.status(405).json(fail("Method Not Allowed"));
    const actor = await requireSourcePermission(req.headers.authorization, req.method === "POST" ? "sources:write" : "sources:read", requestedTenant(req));
    const canonicalKey = String(req.method === "GET" ? req.query.canonicalKey : req.body?.canonicalKey || "").trim().slice(0, 240);
    if (!canonicalKey) return res.status(400).json(fail("Falta la convocatoria que se debe revisar"));

    const supabase = getSupabaseAdmin();
    const opportunityResult = await supabase.from("platform_opportunities")
      .select("id, canonical_key, title").eq("canonical_key", canonicalKey).maybeSingle();
    if (opportunityResult.error) throw opportunityResult.error;
    if (!opportunityResult.data) return res.status(404).json(fail("La convocatoria no está registrada en el radar de plataforma"));

    const versionResult = await supabase.from("platform_opportunity_versions")
      .select("id, version_number").eq("opportunity_id", opportunityResult.data.id)
      .eq("version_status", "current").maybeSingle();
    if (versionResult.error) throw versionResult.error;
    if (!versionResult.data) return res.status(409).json(fail("La convocatoria no tiene una versión vigente que revisar"));

    const interpretationsResult = await supabase.from("platform_bases_interpretations")
      .select("id, opportunity_version_id, status, citations_verified, contract_json, reviewed_at, created_at")
      .eq("opportunity_version_id", versionResult.data.id).order("created_at", { ascending: false });
    if (interpretationsResult.error) throw interpretationsResult.error;
    const rows = interpretationsResult.data || [];
    const approved = combineApprovedBasesRows(rows);
    const state = reviewState(rows, approved.requirementsContract.documentaryGate);

    const previousRequest = await supabase.from("audit_events")
      .select("id, created_at").eq("tenant_id", actor.tenantId)
      .eq("action", "bases_review.requested").eq("target_id", versionResult.data.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (previousRequest.error) throw previousRequest.error;

    let request = previousRequest.data;
    const canRequestAgain = !request || Date.now() - new Date(request.created_at).getTime() >= 24 * 60 * 60 * 1000;
    if (req.method === "POST" && canRequestAgain) {
      const auditResult = await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId,
        actor_user_id: actor.userId,
        actor_label: actor.role,
        action: "bases_review.requested",
        target_type: "platform_opportunity_version",
        target_id: versionResult.data.id,
        detail_json: {
          canonical_key: canonicalKey,
          review_state: state,
          interpretation_count: rows.length,
          approved_interpretation_count: approved.approvedInterpretationIds.length,
          missing_core_sections: approved.requirementsContract.missingCoreSections,
          platform_approval_required: true
        }
      }).select("id, created_at").single();
      if (auditResult.error) throw auditResult.error;
      request = auditResult.data;
    }

    return res.status(200).json(ok({
      state,
      message: stateMessage(state, Boolean(request)),
      requestId: request?.id,
      requestedAt: request?.created_at,
      alreadyRequested: Boolean(previousRequest.data),
      canRequestAgain: state !== "approved" && req.method !== "POST" && canRequestAgain,
      platformApprovalRequired: true
    }));
  } catch (error) {
    if (isMissingBasesSchema(error)) return res.status(503).json(fail("La revisión de bases aún no está activada en este entorno"));
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
