import fs from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((item) => item.startsWith("--limit="));
const idArg = process.argv.find((item) => item.startsWith("--id="));
const pageBudgetArg = process.argv.find((item) => item.startsWith("--page-budget="));
const writeArg = process.argv.find((item) => item.startsWith("--write="));
const catalogArg = process.argv.find((item) => item.startsWith("--catalog="));
const browserFallback = !process.argv.includes("--browser-fallback=false");
const catalogPath = catalogArg ? catalogArg.split("=").slice(1).join("=") : "data/private-open-funders/platform-open-funders-v1.json";
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const pageBudget = pageBudgetArg ? Number(pageBudgetArg.split("=")[1]) : 10;
const timeoutMs = 12000;
const currentYear = new Date().getUTCFullYear();
const pythonCommand = process.env.PYTHON_BIN || "python";

const linkTerms = [
  "convocatoria", "convocatorias", "ayuda", "ayudas", "subvencion", "subvenciones",
  "bases", "base", "pdf", "descargar", "documentacion", "documentación", "guia", "guía",
  "solicitud", "formulario", "faq", "preguntas", "proyectos-sociales", "accion-social",
  "programa-social", "entidades"
];

const closedTerms = ["cerrada", "cerrado", "finalizada", "finalizado", "resuelta", "resuelto", "fuera de plazo"];
const weakTokens = new Set(["fundacion", "convocatoria", "convocatorias", "proyectos", "sociales", "ayudas", "bases", "programa", "programas", "espana"]);

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

function isPublicDocument(url) {
  return /\.(pdf|docx?)(?:$|[?#])/i.test(url);
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

function plain(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sourceTokens(source) {
  return [...new Set(plain([source.id, source.name, source.territory, source.url, ...(source.themes || [])].join(" "))
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !weakTokens.has(token)))];
}

function evidenceTokenMatches(source, page) {
  const haystack = plain(`${page?.url || ""} ${page?.title || ""} ${page?.navigation_path?.map((item) => item.label).join(" ") || ""}`);
  return sourceTokens(source).filter((token) => haystack.includes(token));
}

function linksFrom(html, base, origin) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = normalizeUrl(match[1], base);
    if (!href || (!sameOrigin(href, origin) && !isPublicDocument(href))) continue;
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
    if (contentType.includes("pdf") || contentType.includes("application/octet-stream") || /\.pdf(?:$|[?#])/i.test(url)) {
      return { ok: true, url, status: response.status, contentType: "application/pdf", bytes: Buffer.from(await response.arrayBuffer()), text: "" };
    }
    const text = await response.text();
    return { ok: true, url, status: response.status, contentType, text };
  } catch (error) {
    return { ok: false, url, status: 0, contentType: "", text: error instanceof Error ? error.message : "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

async function extractPdf(bytes, url) {
  const temporaryPath = path.join(os.tmpdir(), `grant-${crypto.randomUUID()}.pdf`);
  try {
    await fs.writeFile(temporaryPath, bytes);
    const { stdout } = await execFileAsync(pythonCommand, ["scripts/workers/extract-public-pdf.py", temporaryPath], { maxBuffer: 2_000_000 });
    const extracted = JSON.parse(stdout);
    return {
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      page_count: extracted.page_count,
      extracted_text: extracted.text,
      page_evidence: extracted.page_evidence,
      ocr_required: extracted.ocr_required,
      ocr_unavailable: extracted.ocr_unavailable,
      extraction_status: extracted.ocr_unavailable ? "ocr_unavailable" : extracted.text ? "ready" : "empty",
      source_url: url
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "pdf_extraction_error";
    return { extraction_status: "error", extraction_error: message.slice(-500), source_url: url };
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}

async function renderPublicPage(url) {
  if (!browserFallback) return null;
  try {
    const { stdout } = await execFileAsync(process.execPath, ["scripts/workers/render-public-page.mjs", url], { maxBuffer: 4_000_000, timeout: 30000 });
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function classifyPage(url, html) {
  const pageText = stripHtml(html);
  const text = pageText.toLowerCase();
  const urlScore = scoreUrl(url);
  const hasBasis = /bases|convocatoria|solicitud|formulario|plazo|documentaci/.test(text);
  const hasDeadline = /plazo|fecha|hasta el|abierto|cierre|presentaci/.test(text);
  const hasAmount = /eur|euros|dotaci|importe|cuant/.test(text);
  const hasEligibility = /beneficiari|requisit|criteri|obligacion|obligaci[oó]|documentaci[oó]n|solicitante/.test(text);
  const isClosed = closedTerms.some((term) => text.includes(term));
  return {
    url,
    title: titleOf(html),
    status_facts: extractStatusFacts(html),
    evidence_excerpt: pageText.slice(0, 4000),
    extracted_text: pageText.slice(0, 120000),
    score: urlScore + (hasBasis ? 4 : 0) + (hasDeadline ? 2 : 0) + (hasAmount ? 1 : 0) + (hasEligibility ? 2 : 0) + (isClosed ? 1 : 0),
    signals: [hasBasis && "bases_or_call", hasDeadline && "deadline", hasAmount && "amount", hasEligibility && "eligibility", isClosed && "closed_or_resolved"].filter(Boolean)
  };
}

function evidenceRank(page, source) {
  const haystack = `${page.url} ${page.title}`.toLowerCase();
  const basisDocument = page.signals?.includes("pdf") || /bases|base|convocatoria/.test(haystack);
  const matches = source ? evidenceTokenMatches(source, page).length : 0;
  return page.score + (page.curated_basis ? 100 : 0) + (basisDocument ? 8 : 0) + (page.signals?.includes("pdf") ? 10 : 0) + Math.min(matches, 4);
}

function basisConfidence(source, best, statusFacts) {
  if (!best) return { level: "none", reason: "No usable official page or document reached." };
  const matches = evidenceTokenMatches(source, best);
  if (best.curated_basis) {
    return {
      level: "high",
      reason: "Curated official bases URL wins over neighboring same-domain PDFs.",
      matched_tokens: matches
    };
  }
  if (best.signals?.includes("pdf") && matches.length >= 2) {
    return { level: "medium", reason: "PDF candidate is same-origin and matches source-specific tokens.", matched_tokens: matches };
  }
  if (best.signals?.includes("bases_or_call") && (best.signals?.includes("deadline") || Object.keys(statusFacts).length)) {
    return { level: "medium", reason: "Official page includes call/bases and date or status evidence.", matched_tokens: matches };
  }
  return { level: "low", reason: "Evidence exists but may be an index, neighboring call, or insufficiently matched page.", matched_tokens: matches };
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

function sourceEditionIsCurrent(source) {
  const years = `${source.name} ${source.deadline_text}`.match(/20\d{2}/g)?.map(Number) || [];
  return years.includes(currentYear) || years.some((year) => year > currentYear);
}

async function scanSource(source) {
  const start = normalizeUrl(source.url);
  const origin = new URL(start).origin;
  const queue = [{ href: start, depth: 0, label: source.name, score: 99, path: [{ url: start, label: source.name }] }];
  const curatedBasis = source.basis_url ? normalizeUrl(source.basis_url, start) : "";
  if (curatedBasis && (sameOrigin(curatedBasis, origin) || source.source_authority === "official_registry")) {
    queue.push({
      href: curatedBasis,
      depth: 1,
      label: "Bases PDF verificadas",
      score: 100,
      path: source.navigation_path || [{ url: start, label: source.name }, { url: curatedBasis, label: "Bases PDF verificadas" }],
      curated_basis: true,
      curated_basis_origin: curatedBasis
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
      const rendered = next.depth <= 1 ? await renderPublicPage(next.href) : null;
      if (!rendered?.html) {
        failures.push({ url: next.href, status: fetched.status, reason: fetched.text.slice(0, 120) });
        continue;
      }
      fetched.ok = true;
      fetched.text = rendered.html;
      fetched.contentType = "text/html; rendered=browser";
    }
    if (fetched.contentType.includes("pdf")) {
      const document = await extractPdf(fetched.bytes, next.href);
      document.curated_basis_origin = next.curated_basis_origin || (next.curated_basis ? next.href : "");
      const documentText = document.extracted_text || "";
      pages.push({
        url: next.href,
        title: next.label || "PDF",
        score: 8 + scoreUrl(next.href, next.label) + (document.extraction_status === "ready" ? 8 : 0),
        signals: ["pdf", documentText && "document_text", /requisitos|beneficiari|criterios|plazo/i.test(documentText) && "eligibility"].filter(Boolean),
        document,
        evidence_excerpt: documentText.slice(0, 4000),
        navigation_path: next.path,
        curated_basis: Boolean(next.curated_basis)
      });
      continue;
    }
    let page = classifyPage(next.href, fetched.text);
    if (page.score < 6 && next.depth === 0 && !fetched.contentType.includes("rendered=browser")) {
      const rendered = await renderPublicPage(next.href);
      if (rendered?.html) {
        page = classifyPage(rendered.rendered_url || next.href, rendered.html);
        page.signals.push("browser_rendered");
      }
    }
    page.curated_basis = Boolean(next.curated_basis);
    page.curated_basis_origin = next.curated_basis_origin || (next.curated_basis ? next.href : "");
    page.content_sha256 = crypto.createHash("sha256").update(page.extracted_text).digest("hex");
    page.content_type = fetched.contentType || "text/html";
    if (next.href === start) page.score += 3;
    page.navigation_path = next.path;
    pages.push(page);
    if (next.depth >= 2) continue;
    for (const link of linksFrom(fetched.text, next.href, origin).filter((item) => item.score > 0 || isPublicDocument(item.href)).slice(0, 18)) {
      queue.push({
        ...link,
        depth: next.depth + 1,
        path: [...next.path, { url: link.href, label: link.label || link.href }],
        curated_basis_origin: page.curated_basis_origin
      });
    }
    queue.sort((a, b) => b.score - a.score);
  }

  const best = [...pages].sort((a, b) => evidenceRank(b, source) - evidenceRank(a, source))[0] || null;
  const extractedStatusFacts = pages.find((page) => page.status_facts && Object.keys(page.status_facts).length)?.status_facts || {};
  const statusFacts = { ...extractedStatusFacts, ...(source.status_facts || {}) };
  const confidence = basisConfidence(source, best, statusFacts);
  const homepageOnly = pages.length <= 1 && !best?.signals?.length;
  const blocked = pages.length === 0 && failures.length > 0;
  const factsClosed = /cerrad|finalizad|resuelt|fuera de plazo/i.test(Object.values(statusFacts).join(" "));
  const closed = shouldArchiveClosed(source, best) || factsClosed;
  const currentEdition = sourceEditionIsCurrent(source);
  const documentReady = !best?.document || best.document.extraction_status === "ready";
  const usableEvidence = best?.score >= 6 && confidence.level !== "low" && (currentEdition || closed) && (closed || documentReady);
  const status = blocked ? "fetch_blocked" : usableEvidence && closed ? "closed_archive_candidate" : usableEvidence ? "evidence_candidate" : homepageOnly ? "homepage_only" : "needs_human_review";
  return {
    id: source.id,
    name: source.name,
    start_url: source.url,
    pages_visited: pages.length,
    page_budget: pageBudget,
    depth_policy: `same-origin BFS, max depth 2, grant/bases/link keywords first; browser fallback ${browserFallback ? "enabled" : "disabled"}`,
    status,
    recommendation: recommendationFor(status),
    verification_url: best?.url || source.url,
    navigation_path: best?.navigation_path || [{ url: source.url, label: source.name }],
    best_evidence: best,
    basis_confidence: confidence,
    status_facts: statusFacts,
    edition_current: currentEdition,
    evidence_complete: Boolean(usableEvidence && documentReady),
    evidence_documents: pages.filter((page) => page.document).map((page) => page.document),
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
