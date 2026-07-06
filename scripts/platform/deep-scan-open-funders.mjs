import fs from "node:fs/promises";

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((item) => item.startsWith("--limit="));
const idArg = process.argv.find((item) => item.startsWith("--id="));
const pageBudgetArg = process.argv.find((item) => item.startsWith("--page-budget="));
const writeArg = process.argv.find((item) => item.startsWith("--write="));
const catalogPath = "data/private-open-funders/platform-open-funders-v1.json";
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const pageBudget = pageBudgetArg ? Number(pageBudgetArg.split("=")[1]) : 10;
const timeoutMs = 12000;

const linkTerms = [
  "convocatoria", "convocatorias", "ayuda", "ayudas", "subvencion", "subvenciones",
  "bases", "base", "pdf", "descargar", "documentacion", "documentación", "guia", "guía",
  "solicitud", "formulario", "faq", "preguntas", "proyectos-sociales", "accion-social",
  "programa-social", "entidades"
];

const closedTerms = ["cerrada", "cerrado", "finalizada", "finalizado", "resuelta", "resuelto", "fuera de plazo"];

function normalizeUrl(value, base) {
  try {
    const url = new URL(value, base);
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

function sameOrigin(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 160) : "";
}

function extractStatusFacts(html) {
  const text = stripHtml(html);
  const field = (label, stops = ["Apertura", "Cierre", "Fecha prevista", "Documentacion", "Documentación"]) => {
    const stopPattern = stops.filter((stop) => stop !== label).map((stop) => `${stop}\\s*:`).join("|");
    const pattern = new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)(?=${stopPattern}|$)`, "i");
    const match = text.match(pattern);
    return match ? match[1].replace(/\s+/g, " ").trim().slice(0, 180) : "";
  };
  const facts = {
    status: field("Estado"),
    opening: field("Apertura"),
    closing: field("Cierre"),
    expected_resolution: field("Fecha prevista de resolucion") || field("Fecha prevista de resolución")
  };
  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value));
}

function scoreUrl(url, label = "") {
  const haystack = `${url} ${label}`.toLowerCase();
  return linkTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function linksFrom(html, base, origin) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = normalizeUrl(match[1], base);
    if (!href || !sameOrigin(href, origin)) continue;
    const label = stripHtml(match[2]).slice(0, 120);
    links.push({ href, label, score: scoreUrl(href, label) });
  }
  return links.sort((a, b) => b.score - a.score || a.href.localeCompare(b.href));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "SubvencionesRAG prototype source-depth audit (+human-review)" }
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) return { ok: false, url, status: response.status, contentType, text: "" };
    if (contentType.includes("pdf")) return { ok: true, url, status: response.status, contentType, text: "PDF localizado" };
    const text = await response.text();
    return { ok: true, url, status: response.status, contentType, text };
  } catch (error) {
    return { ok: false, url, status: 0, contentType: "", text: error instanceof Error ? error.message : "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

function classifyPage(url, html) {
  const text = stripHtml(html).toLowerCase();
  const urlScore = scoreUrl(url);
  const hasBasis = /bases|convocatoria|solicitud|formulario|plazo|documentaci/.test(text);
  const hasDeadline = /plazo|fecha|hasta el|abierto|cierre|presentaci/.test(text);
  const hasAmount = /eur|euros|dotaci|importe|cuant/.test(text);
  const isClosed = closedTerms.some((term) => text.includes(term));
  return {
    url,
    title: titleOf(html),
    status_facts: extractStatusFacts(html),
    score: urlScore + (hasBasis ? 4 : 0) + (hasDeadline ? 2 : 0) + (hasAmount ? 1 : 0) + (isClosed ? 1 : 0),
    signals: [hasBasis && "bases_or_call", hasDeadline && "deadline", hasAmount && "amount", isClosed && "closed_or_resolved"].filter(Boolean)
  };
}

function evidenceRank(page) {
  const haystack = `${page.url} ${page.title}`.toLowerCase();
  const basisDocument = page.signals?.includes("pdf") || /bases|base|convocatoria/.test(haystack);
  return page.score + (page.curated_basis ? 100 : 0) + (basisDocument ? 8 : 0) + (page.signals?.includes("pdf") ? 10 : 0);
}

function manualFallbackFor(source, status, failures) {
  if (status === "evidence_candidate" || status === "closed_archive_candidate") return null;
  return {
    reason: status === "fetch_blocked" ? "Automatic fetch was blocked; do not infer that bases are missing." : "Deep scan did not locate a usable bases/call page.",
    accepted_inputs: ["official_url_or_pdf", "call_title", "deadline_text", "basis_summary", "provided_by", "reviewer_note"],
    review_status: "manual_review_required",
    source_hint: source.url,
    failure_statuses: failures.map((item) => item.status).filter(Boolean)
  };
}

function recommendationFor(status) {
  if (status === "evidence_candidate") return "keep_for_human_verification";
  if (status === "closed_archive_candidate") return "archive_with_evidence";
  if (status === "fetch_blocked" || status === "homepage_only" || status === "needs_human_review") return "request_manual_verification_url";
  return "discard_until_new_evidence";
}

function deadlinePast(text = "") {
  const dates = [...text.matchAll(/20\d{2}-\d{2}-\d{2}/g)].map((match) => match[0]);
  if (!dates.length) return false;
  return new Date(`${dates[dates.length - 1]}T23:59:59Z`) < new Date();
}

function shouldArchiveClosed(source, best) {
  const sourceStatus = (source.opportunity_status || "").toLowerCase();
  if (sourceStatus.includes("closed") || sourceStatus.includes("resolved") || deadlinePast(source.deadline_text)) return true;
  if (!best?.signals?.includes("closed_or_resolved")) return false;
  return !sourceStatus.includes("open") && !sourceStatus.includes("mixed") && !sourceStatus.includes("source_index");
}

async function scanSource(source) {
  const start = normalizeUrl(source.url);
  const origin = new URL(start).origin;
  const queue = [{ href: start, depth: 0, label: source.name, score: 99, path: [{ url: start, label: source.name }] }];
  const curatedBasis = source.basis_url ? normalizeUrl(source.basis_url, start) : "";
  if (curatedBasis && sameOrigin(curatedBasis, origin)) {
    queue.push({
      href: curatedBasis,
      depth: 1,
      label: "Bases PDF verificadas",
      score: 100,
      path: source.navigation_path || [{ url: start, label: source.name }, { url: curatedBasis, label: "Bases PDF verificadas" }],
      curated_basis: true
    });
  }
  const seen = new Set();
  const pages = [];
  const failures = [];

  while (queue.length && pages.length < pageBudget) {
    const next = queue.shift();
    if (!next?.href || seen.has(next.href)) continue;
    seen.add(next.href);
    const fetched = await fetchText(next.href);
    if (!fetched.ok) {
      failures.push({ url: next.href, status: fetched.status, reason: fetched.text.slice(0, 120) });
      continue;
    }
    if (fetched.contentType.includes("pdf")) {
      pages.push({ url: next.href, title: next.label || "PDF", score: 8 + scoreUrl(next.href, next.label), signals: ["pdf"], navigation_path: next.path, curated_basis: Boolean(next.curated_basis) });
      continue;
    }
    const page = classifyPage(next.href, fetched.text);
    page.curated_basis = Boolean(next.curated_basis);
    if (next.href === start) page.score += 3;
    page.navigation_path = next.path;
    pages.push(page);
    if (next.depth >= 2) continue;
    for (const link of linksFrom(fetched.text, next.href, origin).filter((item) => item.score > 0).slice(0, 12)) {
      queue.push({ ...link, depth: next.depth + 1, path: [...next.path, { url: link.href, label: link.label || link.href }] });
    }
    queue.sort((a, b) => b.score - a.score);
  }

  const best = [...pages].sort((a, b) => evidenceRank(b) - evidenceRank(a))[0] || null;
  const extractedStatusFacts = pages.find((page) => page.status_facts && Object.keys(page.status_facts).length)?.status_facts || {};
  const statusFacts = { ...extractedStatusFacts, ...(source.status_facts || {}) };
  const homepageOnly = pages.length <= 1 && !best?.signals?.length;
  const blocked = pages.length === 0 && failures.length > 0;
  const factsClosed = /cerrad|finalizad|resuelt|fuera de plazo/i.test(Object.values(statusFacts).join(" "));
  const closed = shouldArchiveClosed(source, best) || factsClosed;
  const status = blocked ? "fetch_blocked" : best?.score >= 6 && closed ? "closed_archive_candidate" : best?.score >= 6 ? "evidence_candidate" : homepageOnly ? "homepage_only" : "needs_human_review";
  return {
    id: source.id,
    name: source.name,
    start_url: source.url,
    pages_visited: pages.length,
    page_budget: pageBudget,
    depth_policy: "same-origin BFS, max depth 2, grant/bases/link keywords first",
    status,
    recommendation: recommendationFor(status),
    verification_url: best?.url || source.url,
    navigation_path: best?.navigation_path || [{ url: source.url, label: source.name }],
    best_evidence: best,
    status_facts: statusFacts,
    manual_fallback: manualFallbackFor(source, status, failures),
    failures
  };
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const idFilter = idArg ? idArg.split("=")[1] : "";
  const allSources = idFilter ? catalog.sources.filter((source) => source.id === idFilter) : catalog.sources;
  const sources = allSources.slice(0, Number.isFinite(limit) ? limit : allSources.length);
  const results = [];
  for (const source of sources) results.push(await scanSource(source));
  const payload = {
    mode: args.has("--apply") ? "write_requested" : "dry-run",
    scanned_at: new Date().toISOString(),
    sources_scanned: results.length,
    results
  };
  if (writeArg) await fs.writeFile(writeArg.split("=")[1], `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
