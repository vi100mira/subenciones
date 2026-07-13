import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function approvedFactIds(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, enabled: boolean) {
  if (!enabled) return [];
  const { data: consent, error: consentError } = await supabase.from("tenant_data_consents")
    .select("id").eq("tenant_id", tenantId).eq("consent_type", "ai_processing").eq("status", "granted")
    .order("granted_at", { ascending: false }).limit(1).maybeSingle();
  if (consentError) throw consentError;
  if (!consent) throw new Error("Falta consentimiento vigente para usar hechos internos con IA");
  const { data, error } = await supabase.from("tenant_profile_suggestions")
    .select("id, source_type").eq("tenant_id", tenantId).eq("status", "approved")
    .order("reviewed_at", { ascending: false }).limit(40);
  if (error) throw error;
  return (data || []).map((fact) => ({ id: fact.id, sourceType: fact.source_type }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:read", requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase.from("tenant_agent_runs")
        .select("id, agent_key, status, provider, model, error, input_manifest_json, context_manifest_json, usage_json, created_at, updated_at")
        .eq("tenant_id", actor.tenantId).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const { canonicalKey, useApprovedInternalFacts = false } = req.body || {};
    if (typeof canonicalKey !== "string" || !canonicalKey) return res.status(400).json(fail("Falta canonicalKey"));
    if (typeof useApprovedInternalFacts !== "boolean") return res.status(400).json(fail("useApprovedInternalFacts debe ser booleano"));

    const { data: opportunity, error: opportunityError } = await supabase.from("platform_opportunities")
      .select("id, canonical_key, title, status").eq("canonical_key", canonicalKey).maybeSingle();
    if (opportunityError) throw opportunityError;
    if (!opportunity) return res.status(404).json(fail("Oportunidad no encontrada"));
    if (opportunity.status !== "open") return res.status(409).json(fail("La oportunidad no está abierta"));

    const { data: version, error: versionError } = await supabase.from("platform_opportunity_versions")
      .select("id, content_hash, source_url, deadline_status, evidence_json").eq("opportunity_id", opportunity.id)
      .eq("version_status", "current").maybeSingle();
    if (versionError) throw versionError;
    if (!version) return res.status(409).json(fail("La oportunidad no tiene versión oficial vigente"));
    if (version.deadline_status !== "open") return res.status(409).json(fail("El plazo vigente no está confirmado como abierto"));

    const constraints = version.evidence_json?.proposal_constraints;
    if (constraints?.draftingGate !== "constraints_verified") {
      return res.status(409).json(fail("Redacción bloqueada: faltan límites oficiales verificados"));
    }
    const facts = await approvedFactIds(supabase, actor.tenantId, useApprovedInternalFacts);
    const manifest = {
      canonicalKey: opportunity.canonical_key,
      title: opportunity.title,
      sourceUrl: version.source_url,
      versionContentHash: version.content_hash,
      proposalConstraintsHash: digest(constraints),
      approvedFactRefs: facts,
      allowedDataClasses: useApprovedInternalFacts ? ["public", "internal_approved"] : ["public"],
      humanReviewRequired: true,
      externalSubmissionAllowed: false
    };
    const { data: run, error: runError } = await supabase.from("tenant_agent_runs").insert({
      tenant_id: actor.tenantId,
      opportunity_id: opportunity.id,
      opportunity_version_id: version.id,
      status: "queued",
      use_approved_internal_facts: useApprovedInternalFacts,
      input_manifest_json: manifest,
      requested_by: actor.userId
    }).select("id, status, input_manifest_json, created_at").single();
    if (runError?.code === "23505") return res.status(409).json(fail("Ya existe una ejecución activa del redactor para esta oportunidad"));
    if (runError) throw runError;
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: "draft_agent.queued", target_type: "agent_run", target_id: run.id,
      detail_json: { opportunity: canonicalKey, use_approved_internal_facts: useApprovedInternalFacts, fact_count: facts.length, constraints_hash: manifest.proposalConstraintsHash }
    });
    return res.status(202).json(ok({ run, message: "Redactor encolado con evidencia y revisión humana obligatoria." }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : message.includes("consentimiento") ? 409 : 400;
    return res.status(status).json(fail(message));
  }
}
