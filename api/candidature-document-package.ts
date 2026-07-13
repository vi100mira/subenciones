import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { logError, logInfo } from "../src/logger.js";
import { renderProposalPdf, validateRenderedPages, type PdfFormatRule } from "../src/proposalPdf.js";

type DocumentSection = { title?: unknown; lines?: unknown };
type PackageDocument = { id?: unknown; title?: unknown; filename?: unknown; sections?: unknown };
type ProposalLimit = { documentType?: string; value?: number; unit?: string };
type ProposalConstraints = { draftingGate?: string; requiresRenderedValidation?: boolean; limits?: ProposalLimit[]; formatRules?: PdfFormatRule[] };

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function cleanText(value: unknown, fallback = "") {
  return String(value || fallback).replace(/[<>]/g, "").trim().slice(0, 5000);
}

function normalizeLines(lines: unknown) {
  if (Array.isArray(lines)) return lines.map((line) => cleanText(line)).filter(Boolean).slice(0, 40);
  const line = cleanText(lines);
  return line ? [line] : [];
}

function normalizeDocument(input: PackageDocument) {
  const id = cleanText(input.id, "documento").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 64) || "documento";
  const title = cleanText(input.title, "Documento de candidatura");
  const filename = `${cleanText(input.filename, `${id}.doc`).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/\.docx?$/i, "")}.doc`;
  const sections = (Array.isArray(input.sections) ? input.sections : []) as DocumentSection[];
  return {
    id,
    title,
    filename,
    sections: sections.slice(0, 20).map((section) => ({
      title: cleanText(section.title, "Seccion"),
      lines: normalizeLines(section.lines)
    })).filter((section) => section.lines.length)
  };
}

function htmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wordHtml(title: string, sections: ReturnType<typeof normalizeDocument>["sections"]) {
  const body = sections.map((section) => `
    <h2>${htmlEscape(section.title)}</h2>
    <ul>${section.lines.map((line) => `<li>${htmlEscape(line)}</li>`).join("")}</ul>
  `).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(title)}</title></head><body><h1>${htmlEscape(title)}</h1>${body}</body></html>`;
}

function isDraftDocument(document: ReturnType<typeof normalizeDocument>) {
  return document.id === "memory" || /memoria|propuesta|borrador/i.test(document.title);
}

function documentText(document: ReturnType<typeof normalizeDocument>) {
  return document.sections.flatMap((section) => [section.title, ...section.lines]).join(" ");
}

function validateDraftLimits(documents: ReturnType<typeof normalizeDocument>[], constraints: ProposalConstraints | null) {
  const drafts = documents.filter(isDraftDocument);
  if (!drafts.length) return;
  if (constraints?.draftingGate !== "constraints_verified") {
    throw new Error("Redaccion bloqueada: faltan limites de extension verificados en evidencia oficial.");
  }
  const text = drafts.map(documentText).join(" ");
  for (const limit of constraints.limits || []) {
    if (!limit.value || limit.value <= 0) continue;
    const actual = limit.unit === "words" ? text.trim().split(/\s+/).filter(Boolean).length
      : limit.unit === "characters" ? text.length : null;
    if (actual !== null && actual > limit.value) {
      throw new Error(`Redaccion bloqueada: ${actual} ${limit.unit} superan el maximo oficial de ${limit.value}.`);
    }
  }
}

async function loadProposalConstraints(supabase: ReturnType<typeof getSupabaseAdmin>, canonicalKey: string) {
  const { data: opportunity, error: opportunityError } = await supabase
    .from("platform_opportunities").select("id").eq("canonical_key", canonicalKey).maybeSingle();
  if (opportunityError) throw opportunityError;
  if (!opportunity) return null;
  const { data: version, error: versionError } = await supabase
    .from("platform_opportunity_versions").select("evidence_json").eq("opportunity_id", opportunity.id)
    .eq("version_status", "current").maybeSingle();
  if (versionError) throw versionError;
  return (version?.evidence_json?.proposal_constraints || null) as ProposalConstraints | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));

  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json(fail("BLOB_READ_WRITE_TOKEN no configurado en entorno servidor"));
    const { opportunityId, title, documents, decisions } = req.body || {};
    if (typeof opportunityId !== "string" || !opportunityId) return res.status(400).json(fail("Falta opportunityId"));
    if (!Array.isArray(documents) || !documents.length) return res.status(400).json(fail("Faltan documentos Word"));

    const safeOpportunity = cleanText(opportunityId).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 80);
    const normalizedDocs = documents.slice(0, 8).map(normalizeDocument).filter((doc) => doc.sections.length);
    if (!normalizedDocs.length) return res.status(400).json(fail("Los documentos no tienen contenido valido"));

    const supabase = getSupabaseAdmin();
    const proposalConstraints = await loadProposalConstraints(supabase, opportunityId);
    validateDraftLimits(normalizedDocs, proposalConstraints);

    const uploaded = [];
    for (const doc of normalizedDocs) {
      const renderedPdf = isDraftDocument(doc) && proposalConstraints?.requiresRenderedValidation
        ? await renderProposalPdf(doc.title, doc.sections, proposalConstraints.formatRules || [])
        : null;
      if (renderedPdf) validateRenderedPages(renderedPdf.pageCount, proposalConstraints?.limits || []);
      const html = wordHtml(doc.title, doc.sections);
      const buffer = Buffer.from(`\ufeff${html}`, "utf8");
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      const pathname = `tenants/${actor.tenantId}/candidatures/${safeOpportunity}/${sha256.slice(0, 12)}-${doc.filename}`;
      const blob = await put(pathname, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/msword"
      });
      let validationPdf = null;
      if (renderedPdf) {
        const pdfSha256 = createHash("sha256").update(renderedPdf.buffer).digest("hex");
        const pdfFilename = doc.filename.replace(/\.doc$/i, ".pdf");
        const pdfPathname = `tenants/${actor.tenantId}/candidatures/${safeOpportunity}/${pdfSha256.slice(0, 12)}-${pdfFilename}`;
        const pdfBlob = await put(pdfPathname, renderedPdf.buffer, { access: "public", addRandomSuffix: false, contentType: "application/pdf" });
        validationPdf = { filename: pdfFilename, pathname: pdfBlob.pathname || pdfPathname, sha256: pdfSha256, size: renderedPdf.buffer.byteLength, pageCount: renderedPdf.pageCount, font: renderedPdf.font, fontSize: renderedPdf.fontSize };
      }
      uploaded.push({ id: doc.id, title: doc.title, filename: doc.filename, pathname: blob.pathname || pathname, sha256, size: buffer.byteLength, validationPdf });
    }

    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.role,
      action: "candidature.documents_generated",
      target_type: "opportunity",
      target_id: opportunityId,
      detail_json: {
        title: cleanText(title, "Candidatura"),
        documents: uploaded.map(({ id, title: docTitle, pathname, sha256, size, validationPdf }) => ({ id, title: docTitle, pathname, sha256, size, validation_pdf: validationPdf })),
        proposal_constraints: proposalConstraints,
        decisions: Array.isArray(decisions) ? decisions.map((decision) => cleanText(decision)).filter(Boolean).slice(0, 12) : []
      }
    });

    logInfo("candidature_document_package_uploaded", { tenantId: actor.tenantId, opportunityId, count: uploaded.length });
    return res.status(201).json(ok({ storage: "vercel_blob", documents: uploaded }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : message.includes("Redaccion bloqueada") ? 409 : 400;
    logError("candidature_document_package_failed", { status, message });
    return res.status(status).json(fail(message));
  }
}
