import fs from "node:fs/promises";

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((item) => item.startsWith("--limit="));
const pageBudgetArg = process.argv.find((item) => item.startsWith("--page-budget="));
const writeArg = process.argv.find((item) => item.startsWith("--write="));
const catalogPath = "data/private-open-funders/platform-open-funders-v1.json";
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const pageBudget = pageBudgetArg ? Number(pageBudgetArg.split("=")[1]) : 10;
const timeoutMs = 12000;

const linkTerms = [
  "convocatoria", "convocatorias", "ayuda", "ayudas", "subvencion", "subvenciones",
  "bases", "base", "pdf", "solicitud", "formulario", "faq", "preguntas",
  "proyectos-sociales", "accion-social", "programa-social", "entidades"
];

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
  const hasBasis = /bases|convocatoria|solicitud|formulario|plazo|documentaci[oó]n/.test(text);
  const hasDeadline = /plazo|fecha|hasta el|abierto|cierre|presentaci[oó]n/.test(text);
  const hasAmount = /€|eur|euros|dotaci[oó]n|importe|cuant[ií]a/.test(text);
  return {
    url,
    title: titleOf(html),
    score: urlScore + (hasBasis ? 4 : 0) + (hasDeadline ? 2 : 0) + (hasAmount ? 1 : 0),
    signals: [hasBasis && "bases_or_call", hasDeadline && "deadline", hasAmount && "amount"].filter(Boolean)
  };
}

async function scanSource(source) {
  const start = normalizeUrl(source.url);
  const origin = new URL(start).origin;
  const queue = [{ href: start, depth: 0, label: source.name, score: 99 }];
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
      pages.push({ url: next.href, title: next.label || "PDF", score: 8, signals: ["pdf"] });
      continue;
    }
    const page = classifyPage(next.href, fetched.text);
    pages.push(page);
    if (next.depth >= 2) continue;
    for (const link of linksFrom(fetched.text, next.href, origin).filter((item) => item.score > 0).slice(0, 12)) {
      queue.push({ ...link, depth: next.depth + 1 });
    }
    queue.sort((a, b) => b.score - a.score);
  }

  const best = [...pages].sort((a, b) => b.score - a.score)[0] || null;
  const homepageOnly = pages.length <= 1 && !best?.signals?.length;
  const blocked = pages.length === 0 && failures.length > 0;
  return {
    id: source.id,
    name: source.name,
    start_url: source.url,
    pages_visited: pages.length,
    page_budget: pageBudget,
    depth_policy: "same-origin BFS, max depth 2, grant/bases/link keywords first",
    status: blocked ? "fetch_blocked" : best?.score >= 6 ? "evidence_candidate" : homepageOnly ? "homepage_only" : "needs_human_review",
    best_evidence: best,
    failures
  };
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const sources = catalog.sources.slice(0, Number.isFinite(limit) ? limit : catalog.sources.length);
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
