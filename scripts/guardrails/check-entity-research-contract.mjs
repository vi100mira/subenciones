import {
  crawlPublicWebsite,
  extractPublicPage,
  parseRobots,
  robotsAllows
} from "../workers/entity-research-contract.mjs";
import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const origin = "https://entidad.example";
const calls = [];
const pages = new Map([
  [`${origin}/robots.txt`, "User-agent: *\nDisallow: /privado\nAllow: /privado/publico"],
  [`${origin}/`, `<!doctype html><html><head><title>Entidad social</title></head><body>
    <a href="/quienes-somos">Quiénes somos</a><a href="/privado">Privado</a>
    <a href="https://externa.example/">Fuera</a><img class="logo" src="/assets/logo.svg">
    <p>Programas de empleo e inserción laboral.</p></body></html>`],
  [`${origin}/quienes-somos`, `<html><head><title>Quiénes somos</title></head><body>
    <p>Fundación de la Comunitat Valenciana dedicada a formación e inclusión social.</p></body></html>`],
  [`${origin}/privado`, "<html><body>contenido que no debe leerse</body></html>"]
]);

async function fakeFetch(url) {
  calls.push(String(url));
  const body = pages.get(String(url));
  if (body === undefined) return new Response("not found", { status: 404 });
  return new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

const robots = parseRobots(pages.get(`${origin}/robots.txt`));
assert(!robotsAllows("/privado", robots), "robots.txt no bloquea la ruta privada");
assert(robotsAllows("/privado/publico", robots), "La regla Allow más específica no se respeta");

const extracted = extractPublicPage(pages.get(`${origin}/`), `${origin}/`, origin);
assert(extracted.logoCandidates[0] === `${origin}/assets/logo.svg`, "No conserva candidato de logo oficial");
assert(!extracted.links.some((url) => url.includes("externa.example")), "Sigue dominios externos");

const result = await crawlPublicWebsite(`${origin}/`, {
  fetchImpl: fakeFetch,
  limits: { maxPages: 3, maxDepth: 2, maxWallMs: 5_000, maxBytes: 200_000, requestTimeoutMs: 1_000 }
});

assert(result.pages.length === 2, "El rastreo no respeta robots o deduplicación");
assert(!calls.includes(`${origin}/privado`), "Se solicitó una ruta prohibida");
assert(result.dataClasses.length === 1 && result.dataClasses[0] === "public", "Clasificación de datos incorrecta");
assert(result.reviewRequired, "Las sugerencias deben requerir revisión");
assert(result.suggestions.every((item) => item.status === "pending" && item.sourceRef && item.sourceSha256), "Falta evidencia trazable");
assert(result.suggestions.some((item) => item.fieldKey === "theme" && item.value === "empleo e inserción"), "Falta tema de empleo");
assert(result.suggestions.some((item) => item.fieldKey === "territory"), "Falta sugerencia territorial");

const worker = fs.readFileSync("scripts/workers/run-entity-research.mjs", "utf8");
assert(worker.includes('.eq("agent_key", "entity_research")'), "El worker no aísla su cola");
assert(worker.includes('consent_type", "public_web_analysis"'), "El worker no comprueba consentimiento");
assert(worker.includes('data_class: "public"'), "El worker no clasifica snapshots como públicos");
assert(worker.includes('status: "review_required"'), "El worker no detiene la salida para revisión");
assert(worker.includes("entity_research.generated_for_review"), "Falta auditoría de la investigación");

console.log(JSON.stringify({
  ok: true,
  pages: result.pages.length,
  suggestions: result.suggestions.length,
  robots: "respetado",
  boundary: "HTTPS + mismo dominio + público",
  review: "obligatoria"
}, null, 2));
