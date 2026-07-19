import { createHash } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

const CONSENT_BY_KIND: Record<string, string> = {
  local_simulation: "manual_upload", manual_upload: "manual_upload", vercel_blob: "manual_upload",
  google_drive: "drive_connection", microsoft_graph: "sharepoint_connection"
};
const INSTITUTIONAL_KEYS = new Set(["legal_name", "tax_id", "registered_address"]);
const SECTION_KEYS: Record<string, string> = {
  mission: "mission", trajectory: "trajectory", territory: "territory", collective: "collectives",
  collectives: "collectives", methodology: "methodology", team: "team",
  evaluation: "evaluation", alliances: "alliances"
};

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function textQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dataClass(fact: Record<string, any>) {
  const declared = String(fact.metadata_json?.data_class || "");
  return declared || (fact.source_type === "public_web" ? "public" : "internal");
}

function evidence(fact: Record<string, any>) {
  return [fact.source_document_id, fact.source_sha256, fact.source_ref]
    .filter(Boolean).map(String).slice(0, 3);
}

function selectFacts(facts: Record<string, any>[]) {
  const allowed = facts.filter((fact) => ["public", "internal"].includes(dataClass(fact))
    && (INSTITUTIONAL_KEYS.has(fact.field_key) || SECTION_KEYS[fact.field_key]));
  const grouped = new Map<string, Record<string, any>[]>();
  for (const fact of allowed) {
    const key = INSTITUTIONAL_KEYS.has(fact.field_key) ? fact.field_key : SECTION_KEYS[fact.field_key];
    grouped.set(key, [...(grouped.get(key) || []), fact]);
  }
  const selected = new Map<string, Record<string, any>>();
  for (const [key, entries] of grouped) {
    const values = new Set(entries.map((fact) => String(fact.suggested_value).trim().toLowerCase()));
    if (values.size > 1) throw new Error(`Conflicto en el hecho aprobado ${key}`);
    selected.set(key, entries[0]);
  }
  return selected;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));
  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    const sourceId = textQuery(req.query.sourceId);
    if (!sourceId) return res.status(400).json(fail("Falta sourceId"));
    const supabase = getSupabaseAdmin();
    await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");

    const [sourceResult, configResult] = await Promise.all([
      supabase.from("source_connections").select("id, label, kind, scope, status, config_json, approved_at")
        .eq("id", sourceId).eq("tenant_id", actor.tenantId).eq("scope", "tenant_private").maybeSingle(),
      supabase.from("tenant_configs").select("profile_json").eq("tenant_id", actor.tenantId).single()
    ]);
    if (sourceResult.error) throw sourceResult.error;
    if (configResult.error) throw configResult.error;
    const source = sourceResult.data;
    if (!source || source.status !== "active") return res.status(409).json(fail("La fuente privada no está activa"));
    if (source.config_json?.readOnly !== true || source.config_json?.externalTransfer === true) {
      return res.status(409).json(fail("La fuente privada no conserva un alcance de solo lectura"));
    }
    const consentType = CONSENT_BY_KIND[source.kind];
    if (!consentType) return res.status(409).json(fail("La fuente no tiene un consentimiento compatible"));

    const { data: consent, error: consentError } = await supabase.from("tenant_data_consents")
      .select("id, scope_json, granted_at").eq("tenant_id", actor.tenantId)
      .eq("consent_type", consentType).eq("status", "granted")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (consentError) throw consentError;
    const scope = consent?.scope_json || {};
    if (!consent || scope.readOnly !== true || scope.externalTransfer !== false
      || scope.includePersonalData !== false || scope.includeSensitiveData !== false) {
      return res.status(409).json(fail("El consentimiento privado no está vigente o su alcance no es seguro"));
    }

    const profile = configResult.data.profile_json || {};
    const refs = Array.isArray(profile.master_fact_refs) ? profile.master_fact_refs : [];
    const ids = [...new Set(refs.map((item: any) => String(item?.id || "")).filter(Boolean))];
    if (profile.review_state !== "approved" || !ids.length) {
      return res.status(409).json(fail("La plantilla maestra no está aprobada"));
    }
    const { data: facts, error: factsError } = await supabase.from("tenant_profile_suggestions")
      .select("id, field_key, suggested_value, source_type, source_ref, source_document_id, source_sha256, metadata_json, confidence")
      .eq("tenant_id", actor.tenantId).eq("status", "approved").in("id", ids);
    if (factsError) throw factsError;
    if ((facts || []).length !== ids.length) return res.status(409).json(fail("La plantilla maestra contiene referencias no vigentes"));
    const selected = selectFacts(facts || []);

    const institutionalFacts: Record<string, unknown> = {};
    const sectionProposals: Record<string, unknown> = {};
    for (const [key, fact] of selected) {
      if (INSTITUTIONAL_KEYS.has(key)) {
        institutionalFacts[key] = { field: key, value: fact.suggested_value, status: "approved", evidence: evidence(fact), conflicts: [] };
      } else {
        sectionProposals[key] = { text: fact.suggested_value, status: "approved", source: `tenant-fact:${fact.id}`, document_id: fact.source_document_id, score: fact.confidence };
      }
    }
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    const context = {
      tenant: actor.tenantId, institutional_facts: institutionalFacts, section_proposals: sectionProposals,
      authorization: { source_id: source.id, consent_id: consent.id, consent_type: consentType, read_only: true,
        external_transfer: false, personal_data_allowed: false, sensitive_data_allowed: false,
        profile_reviewed_at: profile.reviewed_at || null, expires_at: expiresAt }
    };
    const contextHash = createHash("sha256").update(JSON.stringify(context)).digest("hex");
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: "private_document.context_issued", target_type: "source_connection", target_id: source.id,
      detail_json: { consent_id: consent.id, fact_ids: [...selected.values()].map((fact) => fact.id), context_sha256: contextHash, expires_at: expiresAt }
    });
    return res.status(200).json(ok({ ...context, context_sha256: contextHash }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") || message.includes("no incluido") ? 403
      : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
