import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { fail, ok } from "../src/apiResponse";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin";
import { logError, logInfo } from "../src/logger";

type DocumentSection = { title?: unknown; lines?: unknown };
type PackageDocument = { id?: unknown; title?: unknown; filename?: unknown; sections?: unknown };

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

    const uploaded = [];
    for (const doc of normalizedDocs) {
      const html = wordHtml(doc.title, doc.sections);
      const buffer = Buffer.from(`\ufeff${html}`, "utf8");
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      const pathname = `tenants/${actor.tenantId}/candidatures/${safeOpportunity}/${sha256.slice(0, 12)}-${doc.filename}`;
      const blob = await put(pathname, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/msword"
      });
      uploaded.push({ id: doc.id, title: doc.title, filename: doc.filename, pathname: blob.pathname || pathname, sha256, size: buffer.byteLength });
    }

    const supabase = getSupabaseAdmin();
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.role,
      action: "candidature.documents_generated",
      target_type: "opportunity",
      target_id: opportunityId,
      detail_json: {
        title: cleanText(title, "Candidatura"),
        documents: uploaded.map(({ id, title: docTitle, pathname, sha256, size }) => ({ id, title: docTitle, pathname, sha256, size })),
        decisions: Array.isArray(decisions) ? decisions.map((decision) => cleanText(decision)).filter(Boolean).slice(0, 12) : []
      }
    });

    logInfo("candidature_document_package_uploaded", { tenantId: actor.tenantId, opportunityId, count: uploaded.length });
    return res.status(201).json(ok({ storage: "vercel_blob", documents: uploaded }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    logError("candidature_document_package_failed", { status, message });
    return res.status(status).json(fail(message));
  }
}
