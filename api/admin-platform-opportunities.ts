import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

const MAX_ROWS = 1000;

function missingPrivateCandidateSchema(error: any) {
  return ["42P01", "PGRST205"].includes(String(error?.code || ""));
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function opportunityRow(opportunity: Record<string, any>, version: Record<string, any> | undefined, source: Record<string, any> | undefined, pendingReview: boolean) {
  const isPrivate = opportunity.funder_type && opportunity.funder_type !== "public";
  const globalStatus = pendingReview || !version ? "pending_review"
    : opportunity.status === "archived" || opportunity.status === "withdrawn" ? "archived"
      : opportunity.status === "closed" || version.deadline_status === "closed" ? "closed"
        : version.deadline_status === "rolling" || opportunity.status === "rolling" ? "rolling"
          : version.deadline_status === "open" || opportunity.status === "open" ? "open" : "pending_review";
  const sourceUrl = version?.official_url || version?.source_url || source?.url || "";
  const privateVerified = isPrivate && globalStatus === "open" && Boolean(version?.bases_url) && sourceUrl.startsWith("https://");
  return {
    id: opportunity.id, recordKind: "opportunity", title: opportunity.title, organism: opportunity.funder_name,
    source: source?.label || "Fuente de plataforma sin etiqueta", sourceKind: source?.kind || "sin clasificar",
    sourceScope: isPrivate ? (privateVerified ? "Privada verificada / inventario global" : "Privada en monitorización") : "Pública indexada",
    territory: opportunity.territory || "Ámbito sin declarar", theme: Array.isArray(opportunity.themes) && opportunity.themes.length ? opportunity.themes.join(" · ") : "Ámbito pendiente",
    score: Number(opportunity.priority || 0), amount: version?.amount_text || "Importe no indexado", deadline: version?.deadline_text || "Plazo sin evidencia actual",
    deadlineStart: version?.deadline_start || "", deadlineEnd: version?.deadline_end || "", deadlineStatus: version?.deadline_status || "uncertain", deadlineConfidence: version?.deadline_confidence || "uncertain",
    officialUrl: sourceUrl, basesUrl: version?.bases_url || "", evidenceQuality: sourceUrl ? "URL de fuente persistida" : "Evidencia pendiente",
    globalStatus, reviewState: pendingReview ? "pending_review" : "not_required", provenance: { sourceUrl, updatedAt: opportunity.updated_at || version?.detected_at || null },
    fit: ["Inventario global de plataforma; no se ha calculado encaje para ninguna entidad."],
    risks: [pendingReview ? "Cambio pendiente de revisión humana." : "La elegibilidad y el matching deben revisarse por tenant antes de recomendar."],
    evidence: [sourceUrl ? `Fuente persistida: ${sourceUrl}` : "No hay URL de evidencia persistida."], internalFacts: [], matchingState: "not_evaluated"
  };
}

function privateCandidateRow(candidate: Record<string, any>) {
  const review = String(candidate.review_status || "pending_review");
  const verified = ["approved", "auto_approved"].includes(review);
  const evidence = asRecord(candidate.convocation_evidence_json);
  const evidenced = Object.values(evidence).filter((item: any) => item?.state === "evidenced").length;
  return {
    id: `private-source:${candidate.id}`, recordKind: "private_source_candidate", title: candidate.organization_name, organism: candidate.organization_name,
    source: "Fuente privada candidata", sourceKind: candidate.source_kind || "private_funder",
    sourceScope: candidate.publication_eligible ? "Privada verificada / publicable" : verified ? "Privada verificada / no publicable" : "Privada tracked / pendiente de revisión",
    territory: candidate.territory || "Territorio pendiente", theme: candidate.themes_hint || "Ámbito pendiente", score: 0,
    amount: "No es una convocatoria indexada", deadline: "Sin vigencia verificada", deadlineStatus: "uncertain", deadlineConfidence: "uncertain",
    officialUrl: candidate.official_url || "", basesUrl: "", evidenceQuality: `${evidenced} campos con evidencia`, globalStatus: verified ? "private_verified" : "private_pending_review", reviewState: review,
    provenance: { sourceUrl: candidate.official_url || "", updatedAt: candidate.updated_at || null },
    fit: ["Candidata de fuente privada de plataforma; no es una recomendación ni una convocatoria para clientes."],
    risks: ["Faltan bases, vigencia y matching por entidad antes de cualquier recomendación o publicación."],
    evidence: [candidate.official_url ? `Web oficial registrada: ${candidate.official_url}` : "Sin URL oficial persistida."], internalFacts: [], matchingState: "not_evaluated"
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));
    await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();
    const [opportunities, versions, sources, reviews, privateCandidates] = await Promise.all([
      supabase.from("platform_opportunities").select("id, platform_source_id, title, funder_name, source_scope, funder_type, territory, themes, status, priority, updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(MAX_ROWS),
      supabase.from("platform_opportunity_versions").select("opportunity_id, source_url, official_url, bases_url, deadline_start, deadline_end, deadline_text, deadline_status, deadline_confidence, amount_text, detected_at").eq("version_status", "current").limit(MAX_ROWS),
      supabase.from("platform_sources").select("id, label, kind, url").limit(MAX_ROWS),
      supabase.from("platform_opportunity_change_events").select("opportunity_id").eq("human_review_status", "pending").limit(MAX_ROWS),
      supabase.from("platform_private_source_candidates").select("id, organization_name, official_url, source_kind, territory, themes_hint, convocation_evidence_json, review_status, publication_eligible, updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(MAX_ROWS)
    ]);
    for (const result of [opportunities, versions, sources, reviews]) if (result.error) throw result.error;
    if (privateCandidates.error && !missingPrivateCandidateSchema(privateCandidates.error)) throw privateCandidates.error;
    const versionsByOpportunity = new Map((versions.data || []).map((item: any) => [item.opportunity_id, item]));
    const sourcesById = new Map((sources.data || []).map((item: any) => [item.id, item]));
    const pendingReviews = new Set((reviews.data || []).map((item: any) => item.opportunity_id));
    const opportunityItems = (opportunities.data || []).map((item: any) => opportunityRow(item, versionsByOpportunity.get(item.id), sourcesById.get(item.platform_source_id), pendingReviews.has(item.id)));
    const candidateItems = privateCandidates.error ? [] : (privateCandidates.data || []).map((item: any) => privateCandidateRow(item));
    return res.status(200).json(ok({
      generatedAt: new Date().toISOString(), items: [...opportunityItems, ...candidateItems],
      totals: { opportunities: opportunities.count || opportunityItems.length, privateCandidates: privateCandidates.error ? null : privateCandidates.count || candidateItems.length, maximumRows: MAX_ROWS },
      privateCandidatesState: privateCandidates.error ? "unavailable_schema" : "available",
      privacy: { scope: "platform_superadmin_only", tenantContentReturned: false, matchingReturned: false }
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
