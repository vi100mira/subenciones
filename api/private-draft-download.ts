import type { VercelRequest, VercelResponse } from "@vercel/node";
import { get } from "@vercel/blob";
import { fail } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));
  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json(fail("BLOB_READ_WRITE_TOKEN no configurado"));
    const reviewId = typeof req.query.reviewId === "string" ? req.query.reviewId : "";
    const type = req.query.type === "pdf" ? "pdf" : req.query.type === "docx" ? "docx" : req.query.type === "package" ? "package" : "";
    if (!reviewId || !type) return res.status(400).json(fail("Faltan reviewId o type"));
    const supabase = getSupabaseAdmin();
    const { data: review, error } = await supabase.from("tenant_draft_reviews")
      .select("id, status, docx_blob_path, pdf_blob_path, validation_json").eq("id", reviewId).eq("tenant_id", actor.tenantId).maybeSingle();
    if (error) throw error;
    if (!review || review.status !== "approved") return res.status(404).json(fail("Documento aprobado no encontrado"));
    const pathname = type === "docx" ? review.docx_blob_path : type === "pdf" ? review.pdf_blob_path : review.validation_json?.package?.pathname;
    if (!pathname) return res.status(409).json(fail("El documento aun no se ha generado"));
    const blob = await get(pathname, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN, useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream) return res.status(404).json(fail("Artefacto privado no disponible"));
    const buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());
    const contentType = type === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : type === "pdf" ? "application/pdf" : "application/zip";
    const fileName = type === "package" ? "expediente-documental-aprobado.zip" : `borrador-aprobado.${type}`;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    return res.status(200).send(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
