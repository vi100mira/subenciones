import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { get, put } from "@vercel/blob";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx"
};
const PREVIEW_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function cleanName(value: unknown) {
  return String(value || "anexo").replace(/[^\p{L}\p{N}._ -]+/gu, "-").slice(0, 120) || "anexo";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requireSourcePermission(req.headers.authorization, req.method === "GET" ? "sources:read" : "sources:write", requestedTenant(req));
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json(fail("BLOB_READ_WRITE_TOKEN no configurado"));
    const documentId = String(req.query.documentId || "");
    if (!documentId) return res.status(400).json(fail("Falta documentId"));
    const supabase = getSupabaseAdmin();
    const { data: document, error } = await supabase.from("source_documents")
      .select("id, title, mime_type, data_class, source_sha256, source_size_bytes, blob_path, metadata_json")
      .eq("id", documentId).eq("tenant_id", actor.tenantId).maybeSingle();
    if (error) throw error;
    if (!document) return res.status(404).json(fail("Anexo no encontrado"));
    const restricted = ["personal", "sensitive"].includes(document.data_class);
    if (restricted) await requireSourcePermission(req.headers.authorization, "sources:write", actor.tenantId);

    if (req.method === "GET") {
      if (!document.blob_path) return res.status(409).json(fail("El archivo completo aún no está almacenado"));
      const preview = req.query.mode === "preview";
      if (preview && !PREVIEW_TYPES.has(document.mime_type)) return res.status(415).json(fail("Este formato solo admite descarga"));
      if (preview && restricted && req.headers["x-annex-restricted-confirmed"] !== "true") {
        return res.status(409).json(fail("Confirma la visualización del anexo restringido"));
      }
      const blob = await get(document.blob_path, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN, useCache: false });
      if (!blob || blob.statusCode !== 200 || !blob.stream) return res.status(404).json(fail("Archivo privado no disponible"));
      const buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());
      await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
        action: preview ? "private_annex.previewed" : "private_annex.downloaded", target_type: "source_document", target_id: document.id,
        detail_json: { data_class: document.data_class, sha256: document.source_sha256, view_mode: preview ? "inline" : "download",
          content_copied_to_audit: false }
      });
      res.setHeader("Content-Type", document.mime_type);
      res.setHeader("Content-Disposition", `${preview ? "inline" : "attachment"}; filename="${cleanName(document.title)}"`);
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(buffer);
    }

    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const reviewStatus = document.metadata_json?.review_status;
    if (!["approved", "restricted"].includes(reviewStatus)) return res.status(409).json(fail("El documento debe aprobarse antes de almacenarlo"));
    if (restricted && reviewStatus !== "restricted") return res.status(409).json(fail("El anexo personal debe aprobarse como restringido"));
    if (restricted && req.headers["x-annex-restricted-confirmed"] !== "true") return res.status(409).json(fail("Falta confirmación para almacenar el anexo restringido"));
    const contentType = String(req.headers["x-annex-content-type"] || "");
    if (!TYPES[contentType]) return res.status(415).json(fail("Formato de anexo no permitido"));
    const contentLength = Number(req.headers["content-length"] || 0);
    if (!contentLength || contentLength > MAX_BYTES) return res.status(413).json(fail("El anexo debe ocupar como máximo 4 MB"));
    const buffer = Buffer.isBuffer(req.body) ? req.body : req.body instanceof Uint8Array ? Buffer.from(req.body)
      : req.body?.type === "Buffer" && Array.isArray(req.body.data) ? Buffer.from(req.body.data) : null;
    if (!buffer || buffer.byteLength !== contentLength) return res.status(400).json(fail("No se recibió el archivo binario completo"));
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    if (sha256 !== document.source_sha256) return res.status(409).json(fail("El archivo no coincide con la huella inventariada"));
    const pathname = `tenants/${actor.tenantId}/annex-vault/${document.id}/${sha256}.${TYPES[contentType]}`;
    const blob = await put(pathname, buffer, { access: "private", addRandomSuffix: false, contentType });
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("source_documents").update({
      blob_url: null, blob_path: blob.pathname, source_size_bytes: buffer.byteLength,
      metadata_json: { ...(document.metadata_json || {}), vault_status: "stored", vault_version: Number(document.metadata_json?.vault_version || 0) + 1,
        vault_stored_at: now, restricted_annex: restricted, ai_allowed: false, embeddings_allowed: false },
      updated_at: now
    }).eq("id", document.id).eq("tenant_id", actor.tenantId);
    if (updateError) throw updateError;
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
      action: "private_annex.stored", target_type: "source_document", target_id: document.id,
      detail_json: { pathname, sha256, size_bytes: buffer.byteLength, data_class: document.data_class,
        private_blob: true, ai_allowed: false, embeddings_allowed: false, content_copied_to_audit: false }
    });
    return res.status(201).json(ok({ documentId: document.id, stored: true, size: buffer.byteLength, restricted }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
