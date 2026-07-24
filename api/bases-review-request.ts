import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import {
  basesAcceptanceContractHash, combineApprovedBasesRows, isMissingAcceptanceSchema,
  isMissingBasesSchema, loadTenantBasesAcceptance
} from "../src/platformBases.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function reviewItems(rows: any[]) {
  return rows.filter((row) => row.citations_verified && ["review_required", "approved"].includes(row.status))
    .map((row) => ({
      id: row.id,
      status: row.status,
      sections: Object.entries(row.contract_json?.sections || {}).flatMap(([section, clauses]) =>
        (Array.isArray(clauses) ? clauses : []).slice(0, 20).map((clause: any) => ({
          section, text: String(clause?.text || "").slice(0, 2000),
          evidenceExcerpt: String(clause?.evidenceExcerpt || clause?.quote || "").slice(0, 2000),
          sourcePage: clause?.sourcePage ?? null,
          sourceUrl: String(clause?.sourceUrl || "").slice(0, 2000)
        })))
    }));
}

function stateMessage(state: string, hasRequest: boolean) {
  if (state === "approved") return "Las bases ya están publicadas por plataforma y la redacción puede continuar.";
  if (state === "accepted_by_entity") return "Tu equipo validó estas bases para esta candidatura. La decisión queda auditada y no afecta a otras entidades.";
  if (state === "discrepancy_reported") return "Tu equipo señaló una discrepancia. La redacción queda bloqueada para esta entidad hasta resolverla.";
  if (state === "ready_for_entity_review") return "Las citas están verificadas. Tu equipo debe revisar las cláusulas y validarlas o señalar una discrepancia.";
  if (state === "citations_pending") return `${hasRequest ? "Revisión solicitada. " : ""}La lectura espera la verificación técnica de sus citas.`;
  if (state === "processing") return "La lectura de las bases está en cola; podrás validarla cuando las citas estén verificadas.";
  if (state === "failed") return "La lectura falló y requiere intervención de plataforma.";
  return hasRequest ? "Revisión solicitada. La plataforma debe localizar e interpretar las bases oficiales."
    : "Todavía no existe una lectura verificable de las bases oficiales.";
}

function reviewState(rows: any[], platformGate: string, effectiveGate: string, acceptance: any, acceptanceValid: boolean) {
  if (acceptance?.status === "discrepancy_reported") return "discrepancy_reported";
  if (platformGate === "requirements_approved") return "approved";
  if (acceptanceValid && effectiveGate === "requirements_approved") return "accepted_by_entity";
  if (rows.some((row) => row.status === "review_required" && row.citations_verified)) return "ready_for_entity_review";
  if (rows.some((row) => row.status === "review_required")) return "citations_pending";
  if (rows.some((row) => ["queued", "extracting", "interpreting", "generating"].includes(row.status))) return "processing";
  if (rows.some((row) => row.status === "failed")) return "failed";
  return "not_started";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!["GET", "POST"].includes(req.method || "")) return res.status(405).json(fail("Method Not Allowed"));
    const actor = await requireSourcePermission(req.headers.authorization,
      req.method === "POST" ? "sources:write" : "sources:read", requestedTenant(req));
    const canonicalKey = String(req.method === "GET" ? req.query.canonicalKey : req.body?.canonicalKey || "").trim().slice(0, 240);
    if (!canonicalKey) return res.status(400).json(fail("Falta la convocatoria que se debe revisar"));

    const supabase = getSupabaseAdmin();
    const opportunity = await supabase.from("platform_opportunities")
      .select("id, canonical_key, title").eq("canonical_key", canonicalKey).maybeSingle();
    if (opportunity.error) throw opportunity.error;
    if (!opportunity.data) return res.status(404).json(fail("La convocatoria no está registrada en el radar de plataforma"));
    const version = await supabase.from("platform_opportunity_versions")
      .select("id, version_number").eq("opportunity_id", opportunity.data.id)
      .eq("version_status", "current").maybeSingle();
    if (version.error) throw version.error;
    if (!version.data) return res.status(409).json(fail("La convocatoria no tiene una versión vigente que revisar"));
    const interpretations = await supabase.from("platform_bases_interpretations")
      .select("id, opportunity_version_id, status, citations_verified, contract_json, reviewed_at, created_at")
      .eq("opportunity_version_id", version.data.id).order("created_at", { ascending: false });
    if (interpretations.error) throw interpretations.error;
    const rows = interpretations.data || [];
    const reviewableIds = rows.filter((row) => row.citations_verified && row.status === "review_required").map((row) => row.id);
    let acceptance = await loadTenantBasesAcceptance(supabase, actor.tenantId, version.data.id);
    const action = String(req.body?.action || "request_review");
    const now = new Date().toISOString();

    if (req.method === "POST" && ["accept", "report_discrepancy"].includes(action)) {
      const decisionIds = action === "accept" ? reviewableIds
        : rows.filter((row) => row.citations_verified && ["review_required", "approved"].includes(row.status)).map((row) => row.id);
      if (!decisionIds.length) return res.status(409).json(fail("No hay una lectura con citas verificadas que pueda revisar tu equipo"));
      const candidate = combineApprovedBasesRows(rows, decisionIds);
      if (action === "accept" && candidate.requirementsContract.documentaryGate !== "requirements_approved") {
        return res.status(409).json(fail(`La lectura no cubre todavía: ${candidate.requirementsContract.missingCoreSections.join(", ")}`));
      }
      const note = String(req.body?.note || "").trim().slice(0, 3000);
      if (action === "report_discrepancy" && !note) return res.status(400).json(fail("Describe la discrepancia encontrada"));
      const contractHash = basesAcceptanceContractHash(rows, decisionIds);
      const saved = await supabase.from("tenant_bases_acceptances").upsert({
        tenant_id: actor.tenantId, opportunity_version_id: version.data.id,
        status: action === "accept" ? "accepted" : "discrepancy_reported",
        interpretation_ids: decisionIds, contract_hash: contractHash, note,
        accepted_by: actor.userId, updated_at: now
      }, { onConflict: "tenant_id,opportunity_version_id" })
        .select("id, status, interpretation_ids, contract_hash, note, accepted_by, updated_at").single();
      if (saved.error) throw saved.error;
      acceptance = saved.data as any;
      const audit = await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.email,
        action: action === "accept" ? "bases_review.accepted_by_entity" : "bases_review.discrepancy_reported",
        target_type: "platform_opportunity_version", target_id: version.data.id,
        detail_json: { canonical_key: canonicalKey, interpretation_ids: decisionIds,
          contract_hash: contractHash, note, affects_other_tenants: false, drafting_allowed: action === "accept" }
      });
      if (audit.error) throw audit.error;
    }

    const previousRequest = await supabase.from("audit_events")
      .select("id, created_at").eq("tenant_id", actor.tenantId).eq("action", "bases_review.requested")
      .eq("target_id", version.data.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (previousRequest.error) throw previousRequest.error;
    let request = previousRequest.data;
    const canRequestAgain = !request || Date.now() - new Date(request.created_at).getTime() >= 86400000;
    if (req.method === "POST" && action === "request_review" && canRequestAgain) {
      const audit = await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.email,
        action: "bases_review.requested", target_type: "platform_opportunity_version", target_id: version.data.id,
        detail_json: { canonical_key: canonicalKey, interpretation_count: rows.length }
      }).select("id, created_at").single();
      if (audit.error) throw audit.error;
      request = audit.data;
    }

    const platform = combineApprovedBasesRows(rows);
    const acceptanceValid = acceptance?.status === "accepted"
      && basesAcceptanceContractHash(rows, acceptance.interpretation_ids) === acceptance.contract_hash;
    const acceptedIds = acceptanceValid ? acceptance?.interpretation_ids || [] : [];
    const effective = acceptance?.status === "discrepancy_reported" ? combineApprovedBasesRows([])
      : combineApprovedBasesRows(rows, acceptedIds);
    const state = reviewState(rows, platform.requirementsContract.documentaryGate,
      effective.requirementsContract.documentaryGate, acceptance, Boolean(acceptanceValid));
    return res.status(200).json(ok({
      state, message: stateMessage(state, Boolean(request)), reviewItems: reviewItems(rows),
      requestId: request?.id, requestedAt: request?.created_at,
      alreadyRequested: Boolean(previousRequest.data),
      canRequestAgain: !["approved", "accepted_by_entity", "ready_for_entity_review"].includes(state)
        && req.method !== "POST" && canRequestAgain,
      canAccept: state === "ready_for_entity_review", canReportDiscrepancy: reviewableIds.length > 0,
      draftingAllowed: effective.requirementsContract.documentaryGate === "requirements_approved",
      constraintsVerified: effective.proposalConstraints.draftingGate === "constraints_verified",
      platformApprovalRequired: false,
      acceptance: acceptance ? { status: acceptance.status, note: acceptance.note, updatedAt: acceptance.updated_at,
        actorUserId: acceptance.accepted_by, contractHash: acceptance.contract_hash, valid: acceptanceValid } : null
    }));
  } catch (error) {
    if (isMissingBasesSchema(error) || isMissingAcceptanceSchema(error)) {
      return res.status(503).json(fail("La validación experta de bases aún no está activada en este entorno"));
    }
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401
      : message.includes("cubre") || message.includes("lectura") ? 409 : 400;
    return res.status(status).json(fail(message));
  }
}
