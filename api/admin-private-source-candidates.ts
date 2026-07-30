import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

const ACTIONS = new Set(["approve", "reject", "audit_review"]);
const TYPES = new Set(["foundation", "banking_foundation", "corporate_foundation", "company", "federation", "philanthropy", "unknown"]);
const EVIDENCE_FIELDS = ["bases_document", "funder", "object", "beneficiaries", "territory", "requirements", "eligible_costs", "amount", "cofinancing", "opening", "closing", "required_documents", "evaluation_criteria", "contact"];

function text(value: unknown, limit: number) { return typeof value === "string" ? value.trim().slice(0, limit) : ""; }
function httpsUrl(value: unknown) {
  const url = new URL(text(value, 2000));
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("La fuente debe usar HTTPS publico sin credenciales");
  url.hash = "";
  return url.toString();
}
function publicProvenance(value: any) {
  return { provider_id: text(value?.provider_id, 100), directory_url: httpsUrl(value?.directory_url), source_url: httpsUrl(value?.source_url || value?.directory_url), terms_url: httpsUrl(value?.terms_url), permission: { robots: value?.permission?.robots === "allowed" ? "allowed" : "unknown", terms: value?.permission?.terms === "referenced" ? "referenced" : "unknown" }, official_page_observed: value?.official_page_observed === true, risk_signal: value?.risk_signal === true, retrieved_at: text(value?.retrieved_at, 40) };
}
function autoScanDecision(candidate: any, url: string, domain: string) {
  const value = candidate.auto_validation || {}, checks = value.checks || {}, sample = value.audit_sample || {};
  const eligible = value.status === "auto_approved" && value.rules_version === "private_source_auto_scan_v1"
    && candidate.official_domain === domain && candidate.organization_key && ["https", "organization_domain_coherence", "public_provenance", "robots_allowed", "terms_reference", "direct_official_page", "page_identity_coherence", "no_risk_signal"].every((rule) => checks[rule] === true);
  return { eligible, record: { rules_version: text(value.rules_version, 100), status: eligible ? "auto_approved" : "pending_review", checks, reasons: Array.isArray(value.reasons) ? value.reasons.map((item: unknown) => text(item, 80)).filter(Boolean) : ["validation_not_eligible"], audit_sample: { rate_percent: Number(sample.rate_percent) || 0, bucket: Number(sample.bucket) || 0, required: eligible && sample.required === true } } };
}
function neutralEvidence(value: any) {
  return Object.fromEntries(EVIDENCE_FIELDS.map((field) => {
    const item = value?.[field] || {};
    const fact = text(item.value, 2000), excerpt = text(item.excerpt, 2000);
    const url = item.evidence_url ? httpsUrl(item.evidence_url) : "";
    return [field, fact && excerpt && url
      ? { state: "evidenced", value: fact, evidence_url: url, excerpt }
      : { state: fact ? "uncertain" : "absent", value: null, evidence_url: null, excerpt: "" }];
  }));
}
function missingSchema(error: any) { return ["42P01", "PGRST205"].includes(String(error?.code || "")); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();
    if (req.method === "GET") {
      const status = typeof req.query.status === "string" ? req.query.status : "pending_review";
      if (!["pending_review", "approved", "rejected", "all"].includes(status)) return res.status(400).json(fail("Estado no valido"));
      let query = supabase.from("platform_private_source_candidates").select("id, dedupe_key, organization_name, official_url, official_domain, source_kind, funder_type, territory, themes_hint, classification_json, provenance_json, convocation_evidence_json, review_status, scanner_eligible, publication_eligible, auto_validation_json, audit_sample_required, audit_status, review_note, submitted_by, reviewed_by, reviewed_at, created_at, updated_at").order("updated_at", { ascending: false }).limit(200);
      if (status !== "all") query = query.eq("review_status", status);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(ok({ candidates: data || [], visibility: "platform_superadmin_only" }));
    }
    if (req.method === "POST") {
      const candidate = req.body?.candidate || {};
      const organizationName = text(candidate.organization_name, 250);
      const officialUrl = httpsUrl(candidate.official_url);
      const funderType = text(candidate.funder_type, 40) || "unknown";
      if (!organizationName || !TYPES.has(funderType)) return res.status(400).json(fail("Candidata no valida"));
      const domain = new URL(officialUrl).hostname.replace(/^www\./, "").toLowerCase();
      const auto = autoScanDecision(candidate, officialUrl, domain);
      const technicalState = auto.eligible ? "automated_evidence_checked" : "operational_exception";
      const { data, error } = await supabase.from("platform_private_source_candidates").insert({
        dedupe_key: text(candidate.organization_key, 250) || `${organizationName.toLowerCase()}:${domain}`,
        organization_name: organizationName, official_url: officialUrl, official_domain: domain, funder_type: funderType,
        territory: text(candidate.territory, 120) || null, themes_hint: text(candidate.themes_hint, 600) || null,
        classification_json: { privacy_scope: "platform_public", matching_scope: "not_evaluated", evidence_quality: text(candidate.classification?.evidence_quality, 60) || "unverified" },
        provenance_json: publicProvenance(candidate.provenance), convocation_evidence_json: neutralEvidence(candidate.convocation_evidence), review_status: auto.record.status, scanner_eligible: auto.eligible,
        publication_eligible: false, auto_validation_json: auto.record, audit_sample_required: auto.record.audit_sample.required, audit_status: auto.record.audit_sample.required ? "pending" : "not_required", submitted_by: actor.userId
        , technical_state: technicalState, technical_reason: auto.record.reasons.join(","), technical_evidence_json: auto.record, technical_updated_at: new Date().toISOString()
      }).select("id, organization_name, official_url, review_status, scanner_eligible, publication_eligible, created_at").single();
      if (error) throw error;
      const event = await supabase.from("platform_radar_operation_events").insert({ resource_type: "private_source_candidate", resource_id: data.id, transition: auto.eligible ? "automatic_evidence_check" : "flag_operational_exception", from_state: "legacy_unclassified", to_state: technicalState, actor_scope: "system", reason: auto.record.reasons.join(",") || "validation_not_eligible", evidence_json: auto.record });
      if (event.error) throw event.error;
      return res.status(201).json(ok({ candidate: data, message: "Candidata en cola privada de plataforma; no se escaneara ni publicara." }));
    }
    if (req.method === "PATCH") {
      const action = req.body?.action;
      const id = text(req.body?.candidateId, 80);
      if (!id || !ACTIONS.has(action)) return res.status(400).json(fail("Accion de revision no valida"));
      const auditReview = action === "audit_review";
      const reviewStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "auto_approved";
      let query = supabase.from("platform_private_source_candidates").update({
        review_status: reviewStatus, review_note: text(req.body?.note, 2000) || null, reviewed_by: actor.userId, reviewed_at: new Date().toISOString(), scanner_eligible: auditReview, publication_eligible: false,
        audit_status: auditReview ? "reviewed" : undefined
      }).eq("id", id);
      query = auditReview ? query.eq("review_status", "auto_approved").eq("audit_sample_required", true).eq("audit_status", "pending") : query.eq("review_status", "pending_review");
      const { data, error } = await query.select("id, review_status, scanner_eligible, publication_eligible, audit_status, reviewed_at").maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json(fail("Candidata pendiente no encontrada"));
      return res.status(200).json(ok({ candidate: data, message: auditReview ? "Muestra auditada; conserva solo el rastreo ya aprobado automaticamente." : "Revision registrada; la aprobacion no activa escaneo, matching ni alertas." }));
    }
    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    if (missingSchema(error)) return res.status(503).json(fail("La cola de revision aun no esta activada"));
    const message = error instanceof Error ? error.message : "Error inesperado";
    return res.status(message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400).json(fail(message));
  }
}
