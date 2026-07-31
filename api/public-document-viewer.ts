import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail } from "../src/apiResponse.js";

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
const ALLOWED_SOURCES = [
  { host: "www.infosubvenciones.es", path: "/bdnstrans/api/convocatorias/documentos" },
  { host: "bop.dipualba.es", path: "/servicesajax/descargararchivopaginaBOP/" },
  { host: "bop.dival.es", path: "/bop/downloads" }
];

function publicDocumentUrl(value: unknown) {
  const url = new URL(typeof value === "string" ? value : "");
  if (url.protocol !== "https:") throw new Error("La fuente documental debe usar HTTPS");
  const allowed = ALLOWED_SOURCES.some((source) => url.hostname === source.host && url.pathname.startsWith(source.path));
  if (!allowed) throw new Error("Fuente documental no autorizada para el visor");
  return url;
}

function safeFileName(value: unknown) {
  const clean = String(value || "documento-oficial.pdf").replace(/[^a-zA-Z0-9._ -]/g, "-").slice(0, 120);
  return clean.toLowerCase().endsWith(".pdf") ? clean : `${clean}.pdf`;
}

function viewerFailure(req: VercelRequest, res: VercelResponse, status: number, message: string) {
  if (req.query.download === "1") return res.status(status).json(fail(message));
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Documento no disponible</title><body><main><h1>Documento no disponible en el visor</h1><p>${message}</p><p>Utiliza «Abrir fuente oficial» para contrastar el documento en su portal de origen.</p></main></body></html>`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));
  try {
    const source = publicDocumentUrl(req.query.url);
    const upstream = await fetch(source, { headers: { Accept: "application/pdf,application/octet-stream;q=0.9", "User-Agent": "INSERTIA-Public-Document-Viewer/1.0" }, redirect: "follow" });
    if (!upstream.ok) return viewerFailure(req, res, 502, "La fuente oficial no ha podido entregar el documento ahora mismo.");
    publicDocumentUrl(upstream.url);
    const announcedSize = Number(upstream.headers.get("content-length") || 0);
    if (announcedSize > MAX_DOCUMENT_BYTES) return viewerFailure(req, res, 413, "El documento supera el límite de tamaño del visor.");
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > MAX_DOCUMENT_BYTES) return viewerFailure(req, res, 413, "El documento supera el límite de tamaño del visor.");
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") return viewerFailure(req, res, 415, "La fuente oficial no ha devuelto un PDF que pueda visualizarse aquí.");
    const disposition = req.query.download === "1" ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeFileName(req.query.name)}"`);
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(buffer);
  } catch (error) {
    const message = error instanceof Error && error.message === "La fuente documental debe usar HTTPS"
      ? "La fuente documental no usa una conexión segura."
      : "Este enlace no está autorizado para mostrarse dentro de Insertia.";
    return viewerFailure(req, res, 400, message);
  }
}
