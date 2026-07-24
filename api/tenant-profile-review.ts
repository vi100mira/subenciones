import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

type ReviewDecision = { id: string; status: "approved" | "rejected" };
type ApprovedFact = { id: string; field_key: string; suggested_value: string };
const GUIDED_KEYS = new Set([
  "legal_name", "tax_id", "registered_address", "mission", "trajectory", "territory",
  "collectives", "methodology", "team", "evaluation", "alliances"
]);
const PRIVATE_SOURCE_TYPES = ["guided_interview", "manual_entry", "uploaded_document"];

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function values(value: unknown): string[] {
  return (Array.isArray(value) ? value : value ? [value] : []).map(String);
}

function mergedProfile(current: Record<string, unknown>, facts: ApprovedFact[], actorId: string) {
  const profile = { ...current };
  const mapping: Record<string, string> = {
    territory: "territory",
    theme: "themes",
    legal_form: "legal_form",
    program: "programs",
    collective: "collectives",
    logo_candidate: "logo_candidates"
  };
  for (const [fieldKey, profileKey] of Object.entries(mapping)) {
    const approved = facts.filter((fact) => fact.field_key === fieldKey).map((fact) => fact.suggested_value);
    if (approved.length) profile[profileKey] = [...new Set([...values(profile[profileKey]), ...approved])];
  }
  return {
    ...profile,
    review_state: "approved",
    master_fact_refs: facts.map((fact) => ({ id: fact.id, fieldKey: fact.field_key })),
    master_fact_count: facts.length,
    reviewed_by: actorId,
    reviewed_at: new Date().toISOString()
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      let query = supabase.from("tenant_profile_suggestions").select(
        "id, field_key, suggested_value, source_type, source_ref, source_document_id, evidence_excerpt, source_sha256, metadata_json, confidence, status, reviewed_at, created_at"
      ).eq("tenant_id", actor.tenantId);
      if (req.query.scope === "private") query = query.in("source_type", PRIVATE_SOURCE_TYPES);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "POST") {
      await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
      const proposals = Array.isArray(req.body?.proposals) ? req.body.proposals : [];
      if (req.body?.noPersonalData !== true || req.body?.noSensitiveData !== true) {
        return res.status(400).json(fail("Debe confirmar que las respuestas no contienen datos personales ni sensibles"));
      }
      if (!proposals.length || proposals.length > GUIDED_KEYS.size) {
        return res.status(400).json(fail("El formulario guiado está vacío o supera el límite"));
      }
      const invalid = proposals.some((item: any) => !GUIDED_KEYS.has(String(item?.fieldKey))
        || typeof item?.value !== "string" || !item.value.trim() || item.value.length > 4_000);
      if (invalid) return res.status(400).json(fail("El formulario contiene una respuesta inválida"));
      const uniqueKeys = new Set(proposals.map((item: any) => String(item.fieldKey)));
      if (uniqueKeys.size !== proposals.length) return res.status(400).json(fail("Hay campos guiados duplicados"));
      const rows = proposals.map((item: any) => ({
        tenant_id: actor.tenantId,
        field_key: String(item.fieldKey),
        suggested_value: item.value.trim(),
        source_type: "guided_interview",
        source_ref: "guided-interview:master-profile",
        confidence: "medium",
        status: "pending",
        metadata_json: {
          data_class: "internal", allowed_uses: ["matching", "drafting", "forms"],
          personal_data_included: false, sensitive_data_included: false
        }
      }));
      const { data, error } = await supabase.from("tenant_profile_suggestions")
        .insert(rows).select("id, field_key, status");
      if (error) throw error;
      await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
        action: "entity_profile.guided_proposals_created", target_type: "tenant_profile", target_id: actor.tenantId,
        detail_json: { proposal_ids: (data || []).map((item) => item.id), field_keys: [...uniqueKeys], values_copied_to_audit: false }
      });
      return res.status(201).json(ok(data || []));
    }

    if (req.method !== "PATCH") return res.status(405).json(fail("Method Not Allowed"));
    if (req.body?.reviewScope === "private") {
      await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
    }
    const reviews: ReviewDecision[] = Array.isArray(req.body?.reviews) ? req.body.reviews : [];
    const approveProfile = req.body?.approveProfile === true;
    const approveMaster = req.body?.approveMaster === true;
    if (!reviews.length && !approveProfile && !approveMaster) return res.status(400).json(fail("No hay decisiones de revisión"));
    if (reviews.length > 100) return res.status(400).json(fail("Demasiadas decisiones en una operación"));
    const invalid = reviews.some((review) => typeof review?.id !== "string" || !["approved", "rejected"].includes(review?.status));
    if (invalid) return res.status(400).json(fail("Decisión de revisión inválida"));

    if (approveProfile || approveMaster) {
      let pendingQuery = supabase.from("tenant_profile_suggestions")
        .select("id").eq("tenant_id", actor.tenantId).eq("status", "pending");
      if (approveMaster) pendingQuery = pendingQuery.in("source_type", PRIVATE_SOURCE_TYPES);
      const { data: pending, error: pendingError } = await pendingQuery.limit(200);
      if (pendingError) throw pendingError;
      const decidedIds = new Set(reviews.map((review) => review.id));
      const unresolved = (pending || []).filter((item) => !decidedIds.has(item.id));
      if (unresolved.length) return res.status(409).json(fail(`Quedan ${unresolved.length} sugerencias por revisar antes de aprobar ${approveMaster ? "la plantilla maestra" : "el perfil"}`));
    }

    const now = new Date().toISOString();
    for (const status of ["approved", "rejected"]) {
      const ids = reviews.filter((review) => review.status === status).map((review) => review.id);
      if (!ids.length) continue;
      const { error } = await supabase.from("tenant_profile_suggestions").update({
        status,
        reviewed_by: actor.userId,
        reviewed_at: now
      }).eq("tenant_id", actor.tenantId).eq("status", "pending").in("id", ids);
      if (error) throw error;
    }

    let profile = null;
    let agents = null;
    if (approveProfile) {
      const [factsResult, configResult] = await Promise.all([
        supabase.from("tenant_profile_suggestions").select("id, field_key, suggested_value")
          .eq("tenant_id", actor.tenantId).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(200),
        supabase.from("tenant_configs").select("profile_json").eq("tenant_id", actor.tenantId).single()
      ]);
      if (factsResult.error) throw factsResult.error;
      if (configResult.error) throw configResult.error;
      profile = mergedProfile(configResult.data.profile_json || {}, factsResult.data || [], actor.userId);
      const { error: profileError } = await supabase.from("tenant_configs")
        .update({ profile_json: profile, updated_at: now }).eq("tenant_id", actor.tenantId);
      if (profileError) throw profileError;
      const { data, error: reconcileError } = await supabase.rpc("reconcile_tenant_agent_suite", { target_tenant_id: actor.tenantId });
      if (reconcileError) throw reconcileError;
      agents = data;
    } else if (approveMaster) {
      const [factsResult, configResult] = await Promise.all([
        supabase.from("tenant_profile_suggestions").select("id, field_key")
          .eq("tenant_id", actor.tenantId).eq("status", "approved").in("source_type", PRIVATE_SOURCE_TYPES).limit(200),
        supabase.from("tenant_configs").select("profile_json").eq("tenant_id", actor.tenantId).single()
      ]);
      if (factsResult.error) throw factsResult.error;
      if (configResult.error) throw configResult.error;
      profile = { ...(configResult.data.profile_json || {}),
        master_fact_refs: (factsResult.data || []).map((fact) => ({ id: fact.id, fieldKey: fact.field_key })),
        master_fact_count: (factsResult.data || []).length, master_review_state: "approved",
        master_reviewed_by: actor.userId, master_reviewed_at: now };
      const { error: profileError } = await supabase.from("tenant_configs")
        .update({ profile_json: profile, updated_at: now }).eq("tenant_id", actor.tenantId);
      if (profileError) throw profileError;
    }

    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.role,
      action: approveProfile ? "entity_profile.approved" : approveMaster ? "entity_profile.master_approved" : "entity_profile.suggestions_reviewed",
      target_type: "tenant_profile",
      target_id: actor.tenantId,
      detail_json: {
        approved_ids: reviews.filter((review) => review.status === "approved").map((review) => review.id),
        rejected_ids: reviews.filter((review) => review.status === "rejected").map((review) => review.id),
        profile_approved: approveProfile, master_approved: approveMaster
      }
    });
    return res.status(200).json(ok({ reviewed: reviews.length, profile, agents }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
