import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

const FINAL_STATUSES = new Set(["confirmed", "excluded"]);
const ACTIVE_STAGES = new Set(["documents_pending", "documents_ready", "active"]);
const MAX_ACTIVE_DOCUMENTS = 20;
const SUGGESTION_LIMIT = 8;

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function evidenceRefs(value: unknown) {
  if (!Array.isArray(value)) return [];
  const refs = value.map((item) => text(item, 200)).filter(Boolean).slice(0, 10);
  if (refs.length !== value.length) throw new Error("La evidencia solo admite hasta 10 referencias breves");
  return refs;
}

async function recommendation(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, id: string) {
  const result = await supabase.from("tenant_opportunity_recommendations")
    .select("id, decision_status, candidacy_stage, opportunity_id, opportunity_version_id")
    .eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("Candidatura no encontrada");
  return result.data;
}

async function activeCandidatures(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string) {
  const recommendations = await supabase.from("tenant_opportunity_recommendations")
    .select("id, candidacy_stage, opportunity_id, updated_at")
    .eq("tenant_id", tenantId).eq("decision_status", "preselected")
    .in("candidacy_stage", [...ACTIVE_STAGES]).order("updated_at", { ascending: false }).limit(100);
  if (recommendations.error) throw recommendations.error;
  const opportunityIds = [...new Set((recommendations.data || []).map((item) => item.opportunity_id))];
  const opportunities = opportunityIds.length
    ? await supabase.from("platform_opportunities").select("id, canonical_key, title, funder_name").in("id", opportunityIds)
    : { data: [], error: null };
  if (opportunities.error) throw opportunities.error;
  const byId = new Map((opportunities.data || []).map((item) => [item.id, item]));
  return (recommendations.data || []).map((item) => ({
    recommendationId: item.id, candidacyStage: item.candidacy_stage, updatedAt: item.updated_at,
    canonicalKey: byId.get(item.opportunity_id)?.canonical_key || "",
    title: byId.get(item.opportunity_id)?.title || "Candidatura sin título",
    funderName: byId.get(item.opportunity_id)?.funder_name || ""
  }));
}

function reviewStatus(document: any) {
  return text(document?.metadata_json?.review_status, 30) || "pending";
}

function normalize(value: unknown) {
  return text(value, 4000).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function tokens(value: unknown) {
  return new Set(normalize(value).split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3 && !["para", "como", "desde", "entre", "sobre", "documento"].includes(token)));
}

function rankedDocuments(documents: any[], context: string, limit = SUGGESTION_LIMIT) {
  const contextTokens = tokens(context);
  const institutional = ["estatuto", "memoria", "proyecto", "experiencia", "certificado", "registro", "cuenta", "auditor", "convenio"];
  return documents.map((document) => {
    const titleTokens = tokens(document.title);
    const overlap = [...titleTokens].filter((token) => contextTokens.has(token));
    const institutionalHit = institutional.find((term) => normalize(document.title).includes(term));
    return {
      document,
      score: overlap.length * 4 + (institutionalHit ? 2 : 0),
      reason: overlap.length
        ? `Coincide con ${overlap.slice(0, 3).join(", ")} en la convocatoria.`
        : institutionalHit
          ? `Puede acreditar información institucional relacionada con ${institutionalHit}.`
          : "Documento interno candidato; requiere revisión antes de vincularlo.",
      evidence: overlap.slice(0, 5).map((token) => `coincidencia:${token}`)
    };
  }).sort((left, right) => right.score - left.score
    || String(left.document.title).localeCompare(String(right.document.title), "es"))
    .slice(0, limit);
}

async function privateCorpus(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string) {
  const sources = await supabase.from("source_connections").select("id")
    .eq("tenant_id", tenantId).eq("scope", "tenant_private").neq("status", "deleted");
  if (sources.error) throw sources.error;
  const sourceIds = (sources.data || []).map((item) => item.id);
  if (!sourceIds.length) return [];
  const documents = await supabase.from("source_documents")
    .select("id, title, mime_type, data_class, source_connection_id, source_sha256, extraction_status, metadata_json, updated_at")
    .eq("tenant_id", tenantId).in("source_connection_id", sourceIds)
    .contains("metadata_json", { document_candidate: true });
  if (documents.error) throw documents.error;
  return documents.data || [];
}

async function recommendationContext(supabase: ReturnType<typeof getSupabaseAdmin>, candidate: any) {
  const [opportunity, version] = await Promise.all([
    supabase.from("platform_opportunities").select("title, themes").eq("id", candidate.opportunity_id).maybeSingle(),
    supabase.from("platform_opportunity_versions")
      .select("required_documents_text, eligibility_text")
      .eq("id", candidate.opportunity_version_id).maybeSingle()
  ]);
  if (opportunity.error) throw opportunity.error;
  if (version.error) throw version.error;
  return [
    opportunity.data?.title,
    ...(opportunity.data?.themes || []),
    version.data?.required_documents_text,
    version.data?.eligibility_text
  ].filter(Boolean).join(" ");
}

async function audit(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  actor: { tenantId: string; userId: string; role: string },
  action: string,
  targetId: string,
  detail: Record<string, unknown>
) {
  const result = await supabase.from("audit_events").insert({
    tenant_id: actor.tenantId,
    actor_user_id: actor.userId,
    actor_label: actor.role,
    action,
    target_type: "candidature_document_selection",
    target_id: targetId,
    detail_json: { ...detail, document_content_copied: false }
  });
  if (result.error) throw result.error;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();
    if (req.method === "GET" && req.query.action === "candidatures") {
      return res.status(200).json(ok(await activeCandidatures(supabase, actor.tenantId)));
    }
    const recommendationId = text(req.query.recommendationId || req.body?.recommendationId, 100);
    if (!recommendationId) return res.status(400).json(fail("Falta recommendationId"));
    const candidate = await recommendation(supabase, actor.tenantId, recommendationId);

    if (req.method === "GET") {
      const [selections, corpus, context] = await Promise.all([
        supabase.from("tenant_candidature_documents")
          .select("id, source_document_id, selection_origin, selection_status, reason_text, evidence_json, proposed_by, reviewed_by, reviewed_at, created_at, updated_at")
          .eq("tenant_id", actor.tenantId).eq("recommendation_id", recommendationId)
          .order("created_at", { ascending: true }),
        privateCorpus(supabase, actor.tenantId),
        recommendationContext(supabase, candidate)
      ]);
      if (selections.error) throw selections.error;
      const documentIds = (selections.data || []).map((item) => item.source_document_id);
      const documents = documentIds.length
        ? await supabase.from("source_documents")
          .select("id, title, mime_type, data_class, source_connection_id, source_sha256, blob_path, updated_at")
          .eq("tenant_id", actor.tenantId).in("id", documentIds)
        : { data: [], error: null };
      if (documents.error) throw documents.error;
      const byId = new Map((documents.data || []).map(({ blob_path, ...item }) =>
        [item.id, { ...item, stored: Boolean(blob_path) }] as const));
      const approved = corpus.filter((item) => item.data_class === "internal" && reviewStatus(item) === "approved");
      const blocked = corpus.filter((item) => ["blocked", "quarantined"].includes(reviewStatus(item))).length;
      const approvalCandidates = rankedDocuments(
        corpus.filter((item) => item.data_class === "internal" && reviewStatus(item) === "pending"),
        context
      ).map((item) => ({
        id: item.document.id,
        source_connection_id: item.document.source_connection_id,
        title: item.document.title,
        mime_type: item.document.mime_type,
        data_class: item.document.data_class,
        source_sha256: item.document.source_sha256,
        extraction_status: item.document.extraction_status,
        reason: item.reason
      }));
      return res.status(200).json(ok({
        recommendation: candidate,
        corpusIncluded: false,
        corpusDocumentCount: corpus.length,
        approvedDocumentCount: approved.length,
        pendingDocumentCount: Math.max(0, corpus.length - approved.length - blocked),
        blockedDocumentCount: blocked,
        approvalCandidates,
        maxActiveDocuments: MAX_ACTIVE_DOCUMENTS,
        selections: (selections.data || []).map((item) => ({
          ...item,
          document: byId.get(item.source_document_id) || null
        }))
      }));
    }

    if (!ACTIVE_STAGES.has(candidate.candidacy_stage) || candidate.decision_status !== "preselected") {
      return res.status(409).json(fail("La oportunidad debe ser una candidatura activa"));
    }

    if (req.method === "POST") {
      await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
      if (req.body?.action === "suggest") {
        const [corpus, context, existing] = await Promise.all([
          privateCorpus(supabase, actor.tenantId),
          recommendationContext(supabase, candidate),
          supabase.from("tenant_candidature_documents").select("source_document_id, selection_status")
            .eq("tenant_id", actor.tenantId).eq("recommendation_id", recommendationId)
        ]);
        if (existing.error) throw existing.error;
        const existingIds = new Set((existing.data || []).map((item) => item.source_document_id));
        const capacity = Math.max(0, MAX_ACTIVE_DOCUMENTS
          - (existing.data || []).filter((item) => item.selection_status !== "excluded").length);
        const suggestions = rankedDocuments(corpus.filter((item) =>
          item.data_class === "internal"
          && reviewStatus(item) === "approved"
          && !existingIds.has(item.id)), context, Math.min(SUGGESTION_LIMIT, capacity));
        if (!suggestions.length) return res.status(200).json(ok({ proposed: 0 }));
        const rows = suggestions.map((item) => ({
          tenant_id: actor.tenantId,
          recommendation_id: recommendationId,
          source_document_id: item.document.id,
          selection_origin: "assistant_recommended",
          selection_status: "proposed",
          reason_text: item.reason,
          evidence_json: item.evidence,
          proposed_by: actor.userId,
          updated_at: new Date().toISOString()
        }));
        const inserted = await supabase.from("tenant_candidature_documents").insert(rows)
          .select("id, source_document_id, selection_origin, selection_status, reason_text, evidence_json");
        if (inserted.error) throw inserted.error;
        await audit(supabase, actor, "candidature_documents.suggested", recommendationId, {
          selection_ids: (inserted.data || []).map((item) => item.id),
          document_ids: suggestions.map((item) => item.document.id),
          human_review_required: true
        });
        return res.status(201).json(ok({ proposed: (inserted.data || []).length }));
      }
      const origin = req.body?.origin === "human_added" ? "human_added" : "assistant_recommended";
      const requested = Array.isArray(req.body?.documents) ? req.body.documents : [];
      if (!requested.length || requested.length > MAX_ACTIVE_DOCUMENTS) {
        return res.status(400).json(fail(`Selecciona entre 1 y ${MAX_ACTIVE_DOCUMENTS} documentos`));
      }
      const normalized: Array<{ documentId: string; reason: string; evidence: string[] }> =
        requested.map((item: any) => ({
        documentId: text(item?.documentId, 100),
        reason: text(item?.reason, 1000),
        evidence: evidenceRefs(item?.evidenceRefs)
        }));
      if (normalized.some((item) => !item.documentId || item.reason.length < 3)) {
        return res.status(400).json(fail("Cada documento necesita identificador y motivo"));
      }
      const ids = [...new Set(normalized.map((item) => item.documentId))];
      if (ids.length !== normalized.length) return res.status(400).json(fail("Hay documentos duplicados"));

      const existing = await supabase.from("tenant_candidature_documents")
        .select("id, source_document_id, selection_origin, selection_status, reason_text, evidence_json, reviewed_at")
        .eq("tenant_id", actor.tenantId).eq("recommendation_id", recommendationId).in("source_document_id", ids);
      if (existing.error) throw existing.error;
      if ((existing.data || []).length) {
        if (ids.length === 1 && existing.data?.[0]?.selection_status === "confirmed") {
          return res.status(200).json(ok(existing.data));
        }
        if (ids.length === 1 && origin === "human_added" && existing.data?.[0]?.selection_status === "proposed") {
          const now = new Date().toISOString();
          const confirmed = await supabase.from("tenant_candidature_documents").update({
            selection_status: "confirmed", reason_text: normalized[0].reason, evidence_json: normalized[0].evidence,
            reviewed_by: actor.userId, reviewed_at: now, updated_at: now
          }).eq("id", existing.data[0].id).eq("tenant_id", actor.tenantId).eq("selection_status", "proposed")
            .select("id, source_document_id, selection_origin, selection_status, reason_text, evidence_json, reviewed_at").single();
          if (confirmed.error) throw confirmed.error;
          await audit(supabase, actor, "candidature_documents.human_confirmed", recommendationId, {
            selection_id: confirmed.data.id, document_id: confirmed.data.source_document_id,
            selection_origin: confirmed.data.selection_origin, human_review_completed: true
          });
          return res.status(200).json(ok([confirmed.data]));
        }
        if (ids.length === 1 && existing.data?.[0]?.selection_status === "proposed") {
          return res.status(200).json(ok(existing.data));
        }
        if (ids.length === 1 && origin === "human_added" && existing.data?.[0]?.selection_status === "excluded") {
          const activeCount = await supabase.from("tenant_candidature_documents")
            .select("id", { count: "exact", head: true }).eq("tenant_id", actor.tenantId)
            .eq("recommendation_id", recommendationId).neq("selection_status", "excluded");
          if (activeCount.error) throw activeCount.error;
          if ((activeCount.count || 0) >= MAX_ACTIVE_DOCUMENTS) {
            return res.status(409).json(fail(`La candidatura admite como máximo ${MAX_ACTIVE_DOCUMENTS} documentos activos`));
          }
          const now = new Date().toISOString();
          const restored = await supabase.from("tenant_candidature_documents").update({
            selection_origin: "human_added", selection_status: "confirmed",
            reason_text: normalized[0].reason, evidence_json: normalized[0].evidence,
            proposed_by: actor.userId, reviewed_by: actor.userId, reviewed_at: now, updated_at: now
          }).eq("id", existing.data[0].id).eq("tenant_id", actor.tenantId)
            .select("id, source_document_id, selection_origin, selection_status, reason_text, evidence_json, reviewed_at").single();
          if (restored.error) throw restored.error;
          await audit(supabase, actor, "candidature_documents.human_restored", recommendationId, {
            selection_id: restored.data.id, document_id: restored.data.source_document_id, human_review_completed: true
          });
          return res.status(200).json(ok([restored.data]));
        }
        return res.status(409).json(fail("Alguno de los documentos ya pertenece a esta candidatura"));
      }

      const [active, documents] = await Promise.all([
        supabase.from("tenant_candidature_documents")
          .select("source_document_id", { count: "exact", head: true })
          .eq("tenant_id", actor.tenantId).eq("recommendation_id", recommendationId)
          .neq("selection_status", "excluded"),
        supabase.from("source_documents").select("id, data_class, metadata_json")
          .eq("tenant_id", actor.tenantId).in("id", ids)
          .eq("data_class", "internal").contains("metadata_json", { review_status: "approved" })
      ]);
      if (active.error) throw active.error;
      if (documents.error) throw documents.error;
      if ((active.count || 0) + ids.length > MAX_ACTIVE_DOCUMENTS) {
        return res.status(409).json(fail(`La candidatura admite como máximo ${MAX_ACTIVE_DOCUMENTS} documentos activos`));
      }
      if ((documents.data || []).length !== ids.length) {
        return res.status(409).json(fail("Solo pueden vincularse documentos internos aprobados del tenant"));
      }
      const now = new Date().toISOString();
      const rows = normalized.map((item) => ({
        tenant_id: actor.tenantId,
        recommendation_id: recommendationId,
        source_document_id: item.documentId,
        selection_origin: origin,
        selection_status: origin === "human_added" ? "confirmed" : "proposed",
        reason_text: item.reason,
        evidence_json: item.evidence,
        proposed_by: actor.userId,
        reviewed_by: origin === "human_added" ? actor.userId : null,
        reviewed_at: origin === "human_added" ? now : null,
        updated_at: now
      }));
      const inserted = await supabase.from("tenant_candidature_documents").insert(rows)
        .select("id, source_document_id, selection_origin, selection_status, reason_text, evidence_json, reviewed_at");
      if (inserted.error) throw inserted.error;
      await audit(supabase, actor, `candidature_documents.${origin}`, recommendationId, {
        selection_ids: (inserted.data || []).map((item) => item.id),
        document_ids: ids,
        human_review_required: origin === "assistant_recommended"
      });
      return res.status(201).json(ok(inserted.data || []));
    }

    if (req.method === "PATCH") {
      const selectionId = text(req.body?.selectionId, 100);
      const status = text(req.body?.selectionStatus, 20);
      if (!selectionId || !FINAL_STATUSES.has(status)) {
        return res.status(400).json(fail("Revisión documental no válida"));
      }
      const now = new Date().toISOString();
      const updated = await supabase.from("tenant_candidature_documents").update({
        selection_status: status, reviewed_by: actor.userId, reviewed_at: now, updated_at: now
      }).eq("id", selectionId).eq("tenant_id", actor.tenantId)
        .eq("recommendation_id", recommendationId).eq("selection_status", "proposed")
        .select("id, source_document_id, selection_origin, selection_status, reason_text, evidence_json, reviewed_at")
        .maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) return res.status(409).json(fail("La propuesta ya fue revisada o no existe"));
      await audit(supabase, actor, `candidature_documents.${status}`, selectionId, {
        recommendation_id: recommendationId,
        document_id: updated.data.source_document_id,
        selection_origin: updated.data.selection_origin,
        human_review_completed: true
      });
      return res.status(200).json(ok(updated.data));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403
      : message.includes("autoriz") || message.includes("Token") ? 401
        : message.includes("no encontrada") ? 404 : 400;
    return res.status(status).json(fail(message));
  }
}
