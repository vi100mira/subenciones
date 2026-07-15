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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));
  try {
    const source = publicDocumentUrl(req.query.url);
    const upstream = await fetch(source, { headers: { Accept: "application/pdf,application/octet-stream;q=0.9", "User-Agent": "INSERTIA-Public-Document-Viewer/1.0" }, redirect: "follow" });
    if (!upstream.ok) return res.status(502).json(fail(`La fuente oficial ha respondido HTTP ${upstream.status}`));
    publicDocumentUrl(upstream.url);
    const announcedSize = Number(upstream.headers.get("content-length") || 0);
    if (announcedSize > MAX_DOCUMENT_BYTES) return res.status(413).json(fail("El documento supera el limite del visor"));
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > MAX_DOCUMENT_BYTES) return res.status(413).json(fail("El documento supera el limite del visor"));
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") return res.status(415).json(fail("La fuente no ha devuelto un PDF valido"));
    const disposition = req.query.download === "1" ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeFileName(req.query.name)}"`);
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(400).json(fail(error instanceof Error ? error.message : "Documento no valido"));
  }
}
