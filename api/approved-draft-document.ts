import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { buildApprovedDraftDocx, type DraftDocumentPlanItem, type DraftSection, type GeneratedDraftDocument } from "../src/candidatureDocx.js";
import { buildApprovedDraftPackage } from "../src/candidaturePackage.js";
import { loadApprovedBases } from "../src/platformBases.js";
import { renderProposalPdf, validateRenderedPages } from "../src/proposalPdf.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function digest(value: unknown) {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
}

function safeKey(value: unknown) {
  return String(value || "draft").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 90) || "draft";
}

function validOutput(output: any) {
  return output && typeof output.title === "string" && Array.isArray(output.documents) && output.documents.length
    && output.documents.every((document: any) => typeof document.title === "string" && Array.isArray(document.sections) && document.sections.length)
    && Array.isArray(output.documentPlan) && output.documentPlan.length
    && Array.isArray(output.evidenceRefs) && Array.isArray(output.uncertainties)
    && output.humanReviewRequired === true && output.submissionAllowed === false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json(fail("BLOB_READ_WRITE_TOKEN no configurado en entorno servidor"));
    const runId = req.body?.runId;
    if (typeof runId !== "string" || !runId) return res.status(400).json(fail("Falta runId"));
    const supabase = getSupabaseAdmin();
    const { data: run, error: runError } = await supabase.from("tenant_agent_runs")
      .select("id, opportunity_id, opportunity_version_id, status, output_json, use_approved_internal_facts")
      .eq("id", runId).eq("tenant_id", actor.tenantId).eq("agent_key", "draft_agent").maybeSingle();
    if (runError) throw runError;
    if (!run) return res.status(404).json(fail("Borrador no encontrado"));
    if (run.status !== "review_required" || !validOutput(run.output_json)) return res.status(409).json(fail("Borrador incompleto o no preparado para revision"));
    const { data: review, error: reviewError } = await supabase.from("tenant_draft_reviews")
      .select("id, status, output_hash, reviewed_at, docx_blob_path, docx_sha256, pdf_blob_path, pdf_sha256, validation_json")
      .eq("tenant_id", actor.tenantId).eq("agent_run_id", run.id).maybeSingle();
    if (reviewError) throw reviewError;
    if (!review || review.status !== "approved") return res.status(409).json(fail("Exportacion bloqueada: falta aprobacion humana del borrador"));
    const outputHash = digest(run.output_json);
    if (review.output_hash !== outputHash) return res.status(409).json(fail("Exportacion bloqueada: el contenido cambio despues de la revision"));
    if (review.docx_blob_path && review.pdf_blob_path) return res.status(200).json(ok({
      reviewId: review.id, documents: { docx: { pathname: review.docx_blob_path, sha256: review.docx_sha256 }, pdf: { pathname: review.pdf_blob_path, sha256: review.pdf_sha256 }, package: review.validation_json?.package || null }, cached: true
    }));

    const [opportunityResult, versionResult, tenantResult] = await Promise.all([
      supabase.from("platform_opportunities").select("canonical_key, title, funder_name").eq("id", run.opportunity_id).single(),
      supabase.from("platform_opportunity_versions").select("id, version_status").eq("id", run.opportunity_version_id).single(),
      supabase.from("organizations").select("name").eq("id", actor.tenantId).single()
    ]);
    if (opportunityResult.error) throw opportunityResult.error;
    if (versionResult.error) throw versionResult.error;
    if (tenantResult.error) throw tenantResult.error;
    if (versionResult.data.version_status !== "current") return res.status(409).json(fail("Exportacion bloqueada: las bases cambiaron despues de redactar"));
    const bases = await loadApprovedBases(supabase, run.opportunity_version_id);
    if (bases.requirementsContract.documentaryGate !== "requirements_approved") return res.status(409).json(fail("Exportacion bloqueada: las bases aprobadas dejaron de estar completas"));
    const constraints = bases.proposalConstraints;
    if (constraints.draftingGate !== "constraints_verified") return res.status(409).json(fail("Exportacion bloqueada: faltan limites formales verificados"));

    const documents = run.output_json.documents as GeneratedDraftDocument[];
    const primary = documents.find((document) => document.role === "primary_proposal") || documents[0];
    const sections = documents.flatMap((document) => [
      { title: document.title, paragraphs: [`Tipo: ${document.documentType}. Requisitos: ${document.requirementRefs.join(", ")}.`], evidenceRefs: document.evidenceRefs },
      ...document.sections
    ]) as DraftSection[];
    const docx = await buildApprovedDraftDocx({
      title: run.output_json.title, opportunityTitle: opportunityResult.data.title,
      funderName: opportunityResult.data.funder_name, tenantName: tenantResult.data.name,
      sections, documentPlan: run.output_json.documentPlan as DraftDocumentPlanItem[],
      evidenceRefs: run.output_json.evidenceRefs, uncertainties: run.output_json.uncertainties,
      reviewedAt: review.reviewed_at, reviewerLabel: actor.role
    });
    const packageResult = await buildApprovedDraftPackage({
      title: run.output_json.title, opportunityTitle: opportunityResult.data.title,
      funderName: opportunityResult.data.funder_name, tenantName: tenantResult.data.name,
      documents, documentPlan: run.output_json.documentPlan as DraftDocumentPlanItem[],
      evidenceRefs: run.output_json.evidenceRefs, uncertainties: run.output_json.uncertainties,
      reviewedAt: review.reviewed_at, reviewerLabel: actor.role
    });
    const pdf = await renderProposalPdf(primary.title, primary.sections.map((section) => ({ title: section.title, lines: section.paragraphs })), constraints.formatRules || []);
    validateRenderedPages(pdf.pageCount, constraints.limits || []);
    const docxHash = digest(docx); const pdfHash = digest(pdf.buffer); const packageHash = digest(packageResult.buffer);
    const basePath = `tenants/${actor.tenantId}/candidatures/${safeKey(opportunityResult.data.canonical_key)}/${run.id}`;
    const [docxBlob, pdfBlob, packageBlob] = await Promise.all([
      put(`${basePath}/${docxHash.slice(0, 12)}-borrador-aprobado.docx`, docx, { access: "private", addRandomSuffix: false, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
      put(`${basePath}/${pdfHash.slice(0, 12)}-validacion.pdf`, pdf.buffer, { access: "private", addRandomSuffix: false, contentType: "application/pdf" }),
      put(`${basePath}/${packageHash.slice(0, 12)}-expediente-aprobado.zip`, packageResult.buffer, { access: "private", addRandomSuffix: false, contentType: "application/zip" })
    ]);
    const validation = { outputHash, basesInterpretationIds: bases.approvedInterpretationIds, pageCount: pdf.pageCount, limits: constraints.limits, humanReview: "approved", submissionAllowed: false,
      dataClasses: run.use_approved_internal_facts ? ["public", "internal_approved"] : ["public"],
      package: { pathname: packageBlob.pathname, sha256: packageHash, size: packageResult.buffer.byteLength, artifactCount: packageResult.artifacts.length } };
    const { error: updateError } = await supabase.from("tenant_draft_reviews").update({
      docx_blob_path: docxBlob.pathname, docx_sha256: docxHash, pdf_blob_path: pdfBlob.pathname,
      pdf_sha256: pdfHash, validation_json: validation, updated_at: new Date().toISOString()
    }).eq("id", review.id).eq("tenant_id", actor.tenantId).eq("status", "approved");
    if (updateError) throw updateError;
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: "draft_agent.exported_private", target_type: "draft_review", target_id: review.id,
      detail_json: { ...validation, docx_sha256: docxHash, pdf_sha256: pdfHash, package_sha256: packageHash, private_blob: true }
    });
    return res.status(201).json(ok({ reviewId: review.id, documents: { docx: { pathname: docxBlob.pathname, sha256: docxHash, size: docx.byteLength }, pdf: { pathname: pdfBlob.pathname, sha256: pdfHash, size: pdf.buffer.byteLength, pageCount: pdf.pageCount }, package: validation.package }, cached: false }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : message.includes("bloquead") || message.includes("Borrador") ? 409 : 400;
    return res.status(status).json(fail(message));
  }
}
