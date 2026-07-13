import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

type ReviewDecision = { id: string; status: "approved" | "rejected" };

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function values(value: unknown): string[] {
  return (Array.isArray(value) ? value : value ? [value] : []).map(String);
}

function mergedProfile(current: Record<string, unknown>, facts: Array<{ field_key: string; suggested_value: string }>, actorId: string) {
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
      const { data, error } = await supabase.from("tenant_profile_suggestions").select(
        "id, field_key, suggested_value, source_type, source_ref, source_document_id, evidence_excerpt, source_sha256, confidence, status, reviewed_at, created_at"
      ).eq("tenant_id", actor.tenantId).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method !== "PATCH") return res.status(405).json(fail("Method Not Allowed"));
    const reviews: ReviewDecision[] = Array.isArray(req.body?.reviews) ? req.body.reviews : [];
    const approveProfile = req.body?.approveProfile === true;
    if (!reviews.length && !approveProfile) return res.status(400).json(fail("No hay decisiones de revisión"));
    if (reviews.length > 100) return res.status(400).json(fail("Demasiadas decisiones en una operación"));
    const invalid = reviews.some((review) => typeof review?.id !== "string" || !["approved", "rejected"].includes(review?.status));
    if (invalid) return res.status(400).json(fail("Decisión de revisión inválida"));

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
    }

    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.role,
      action: approveProfile ? "entity_profile.approved" : "entity_profile.suggestions_reviewed",
      target_type: "tenant_profile",
      target_id: actor.tenantId,
      detail_json: {
        approved_ids: reviews.filter((review) => review.status === "approved").map((review) => review.id),
        rejected_ids: reviews.filter((review) => review.status === "rejected").map((review) => review.id),
        profile_approved: approveProfile
      }
    });
    return res.status(200).json(ok({ reviewed: reviews.length, profile, agents }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
