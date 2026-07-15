import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { isKnownOfficialJournal, officialJournalSeedsFor } from "./official-journal-source-map.mjs";

const execFileAsync = promisify(execFile);

const STOP = new Set("para por una unas unos del las los con sin sobre entre desde hasta esta este estas estos bases reguladoras convocatoria subvenciones ayudas ejercicio curso".split(" "));
const DOCUMENT_PATTERN = /\.(?:pdf|docx?)(?:$|[?#])|\/(?:download|descarga|documento|ver-pdf)(?:\/|\?|$)/i;
const BASIS_PATTERN = /bases?|regulador|convocatoria|subvencion|ayudas?|becas?|solicitud|formulario|anexo|modelo/i;
const JOURNAL_PATTERN = /(?:^|\.)(?:boe\.es|dogv\.gva\.es|miprincipado\.asturias\.es|dipta\.cat|infosubvenciones\.es)$|\/(?:bop|dogv|boletin|diario-oficial)\//i;
const HOST_STOP = new Set(["www", "sede", "sedelectronica", "administracion", "gob", "gov", "org", "com", "net", "cat", "eus"]);

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function privateHost(hostname) {
  return hostname === "localhost" || hostname.endsWith(".local") || hostname.includes(":")
    || /^(?:127\.|10\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(hostname);
}

function httpsUrl(value, base) {
  try {
    const url = new URL(String(value || "").trim(), base);
    if (url.protocol !== "https:" || url.username || url.password || privateHost(url.hostname)) return null;
    url.hash = "";
    return url;
  } catch { return null; }
}

function titleTokens(title) {
  return new Set(normalized(title).split(/[^a-z0-9]+/).filter((token) => token.length > 4 && !STOP.has(token)));
}

function years(value) {
  return new Set(String(value || "").match(/20\d{2}/g) || []);
}

function conflictsWithTitleYear(title, candidate) {
  const expected = years(title); const observed = years(candidate);
  return expected.size > 0 && observed.size > 0 && [...observed].some((year) => !expected.has(year));
}

function authorityFor(candidate, seed) {
  if (isKnownOfficialJournal(candidate.href) || JOURNAL_PATTERN.test(candidate.hostname) || JOURNAL_PATTERN.test(candidate.pathname)) {
    return candidate.hostname.includes("infosubvenciones") ? "official_registry" : "official_journal";
  }
  return candidate.origin === seed.origin ? "issuing_body" : null;
}

function documentRole(value) {
  const text = normalized(value);
  if (/solicitud|formulario|modelo|anexo/.test(text)) return "application_form";
  if (/convocatoria/.test(text) && !/bases?/.test(text)) return "call";
  return "regulatory";
}

function decodeHtml(value) {
  return String(value || "").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function linksFromHtml(html, base) {
  const links = [];
  for (const match of String(html).matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const rawHref = decodeHtml(match[1]);
    const resolutionBase = rawHref.startsWith("?") && base.hostname.endsWith(".sedelectronica.es") ? `${base.origin}/` : base;
    const url = httpsUrl(rawHref, resolutionBase);
    if (url?.hostname.endsWith(".sedelectronica.es") && url.pathname === "/info.0" && url.search.startsWith("?x=")) url.pathname = "/";
    if (url) links.push({ url, label: decodeHtml(match[2]) });
  }
  return links;
}

function hostIdentityTokens(hostname) {
  return normalized(hostname).split(/[^a-z0-9]+/).map((token) => token.replace(/^(?:ayuntamiento|ajuntament|concello|cabildo|diputacion|ayto)/, ""))
    .filter((token) => token.length > 4 && !HOST_STOP.has(token));
}

function officialBridge(item, seed, link) {
  if (link.url.origin === seed.origin || DOCUMENT_PATTERN.test(link.url.href)) return false;
  const title = normalized(item.title); const target = new Set(hostIdentityTokens(link.url.hostname));
  return hostIdentityTokens(seed.hostname).some((token) => target.has(token) && title.includes(token));
}

function pageRelevance(item, page, link) {
  if (link.url.origin !== page.origin || DOCUMENT_PATTERN.test(link.url.href) || /login|acceso|privacidad|cookies|contacto/i.test(link.url.href)) return 0;
  const descriptor = normalized(`${link.label} ${link.url.pathname}`);
  const matches = [...titleTokens(item.title)].filter((token) => descriptor.includes(token)).length;
  return (BASIS_PATTERN.test(descriptor) ? 4 : 0) + Math.min(3, matches);
}

function scoreCandidate(item, seed, candidate, label, authority, pageText = "") {
  const descriptor = `${label} ${candidate.pathname} ${candidate.search}`;
  if (!DOCUMENT_PATTERN.test(candidate.href) || conflictsWithTitleYear(item.title, descriptor)) return 0;
  let score = candidate.origin === seed.origin ? 30 : 22;
  score += 25;
  if (BASIS_PATTERN.test(descriptor)) score += 20;
  if (authority === "official_journal" || authority === "official_registry") score += 8;
  const tokens = titleTokens(item.title); const found = [...tokens].filter((token) => normalized(descriptor).includes(token)).length;
  score += Math.min(12, found * 4);
  const pageMatches = [...tokens].filter((token) => normalized(pageText).includes(token)).length;
  const organismTokens = normalized(item.organism).split(/[^a-z0-9]+/)
    .filter((token) => token.length > 4 && !["local", "ayuntamiento", "ajuntament", "concello", "cabildo", "diputacion"].includes(token));
  if (authority === "official_journal" && pageText && found === 0
    && organismTokens.length > 0 && !organismTokens.some((token) => normalized(pageText).includes(token))) return 0;
  score += Math.min(18, pageMatches * 3);
  const expectedYears = years(item.title); const observedYears = years(descriptor);
  if ([...observedYears].some((year) => expectedYears.has(year))) score += 5;
  return Math.min(100, score);
}

function seedsFor(item, maxSeeds) {
  const entries = [
    ...(item.announcements || []).map((entry) => ({ value: entry.url, label: `${entry.title || ""} ${entry.officialJournal || ""}` })),
    ...officialJournalSeedsFor(item),
    ...(item.supplementaryBasesUrls || []).map((value) => ({ value, label: "" })),
    { value: item.applicationUrl, label: "" }
  ];
  return [...new Map(entries.map((entry) => ({ ...entry, url: httpsUrl(entry.value) })).filter((entry) => entry.url).map((entry) => [entry.url.href, entry])).values()].slice(0, maxSeeds);
}

async function renderPublicPage(url, label = "") {
  try {
    const target = new URL(url);
    const sessionBound = target.hostname.endsWith(".sedelectronica.es") && target.search.startsWith("?x=");
    const args = ["scripts/workers/render-public-page.mjs", sessionBound ? `${target.origin}/` : url, ...(sessionBound && label ? [label] : [])];
    const { stdout } = await execFileAsync(process.execPath, args, { maxBuffer: 4_000_000, timeout: 30000 });
    return JSON.parse(stdout);
  } catch { return null; }
}

async function fetchPage(url, fetchImpl, timeoutMs, renderImpl, label = "") {
  if (renderImpl && url.hostname.endsWith(".sedelectronica.es") && url.search.startsWith("?x=")) {
    const rendered = await renderImpl(url.href, label);
    const html = String(rendered?.html || "").slice(0, 2_000_000);
    if (html) return { links: linksFromHtml(html, new URL(rendered.rendered_url || url.href)), text: decodeHtml(html) };
  }
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url.href, { signal: controller.signal, headers: { Accept: "text/html,application/xhtml+xml" } });
    if (!response.ok) throw new Error(`http_${response.status || "error"}`);
    const type = response.headers?.get?.("content-type") || "";
    if (!type.includes("html")) return { links: [], text: "" };
    const html = (await response.text()).slice(0, 2_000_000);
    return { links: linksFromHtml(html, url), text: decodeHtml(html) };
  } catch {
    const rendered = renderImpl ? await renderImpl(url.href, label) : null;
    const html = String(rendered?.html || "").slice(0, 2_000_000);
    return html ? { links: linksFromHtml(html, new URL(rendered.rendered_url || url.href)), text: decodeHtml(html) } : { links: [], text: "" };
  } finally { clearTimeout(timer); }
}

function structuredOfficialProcedure(item, pageData) {
  const text = normalized(pageData.text);
  const requirementCount = (text.match(/requisito de validez/g) || []).length;
  const titleMatches = [...titleTokens(item.title)].filter((token) => text.includes(token)).length;
  const organismMatches = normalized(item.organism).split(/[^a-z0-9]+/).filter((token) => token.length > 5).filter((token) => text.includes(token)).length;
  return /c.digo sia/.test(text) && /documentaci.n (?:opcional|obligatoria)/.test(text)
    && requirementCount >= 3 && (titleMatches >= 3 || organismMatches >= 2);
}

export async function discoverOfficialBasisCandidates(dataset, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const renderImpl = options.renderImpl || (options.fetchImpl ? null : renderPublicPage);
  const maxOpportunities = Number(options.maxOpportunities || 20);
  const maxSeeds = Number(options.maxSeeds || 3);
  const maxPages = Number(options.maxPages || 5);
  const timeoutMs = Number(options.timeoutMs || 8000);
  const blocked = (dataset.opportunities || []).filter((item) => item.requirementsContract?.documentRecovery?.requiresAdditionalOfficialSource).slice(0, maxOpportunities);
  const candidates = [];
  for (const item of blocked) {
    const existing = new Set((item.basisDocuments || []).map((doc) => httpsUrl(doc.url)?.href).filter(Boolean));
    for (const seedEntry of seedsFor(item, maxSeeds)) {
      const seed = seedEntry.url;
      const queue = [{ url: seed, label: seedEntry.label || item.title, route: [seed.href] }]; const seen = new Set([seed.href]); let cursor = 0;
      while (cursor < queue.length && cursor < maxPages) {
        const page = queue[cursor++];
        const pageData = DOCUMENT_PATTERN.test(page.url.href)
          ? { links: [{ url: page.url, label: page.url.href === seed.href ? seedEntry.label || page.url.pathname : page.url.pathname }], text: "" }
          : await fetchPage(page.url, fetchImpl, timeoutMs, renderImpl, page.label);
        const links = pageData.links;
        if (structuredOfficialProcedure(item, pageData) && !existing.has(seed.href)) {
          candidates.push({ canonicalKey: item.id, sourceUrl: seed.href, documentRole: "call", sourceAuthority: "issuing_body",
            status: "proposed", proposalOrigin: "official_link_discovery", matchScore: 90, discoveryPath: page.route,
            proposalNote: `Ficha publica SIA localizada desde ${seed.hostname}; requiere aprobacion humana.` });
        }
        for (const link of links.filter((entry) => DOCUMENT_PATTERN.test(entry.url.href))) {
          if (existing.has(link.url.href)) continue;
          const authority = authorityFor(link.url, page.url); if (!authority) continue;
          const score = scoreCandidate(item, page.url, link.url, link.label, authority, pageData.text); if (score < 70) continue;
          const route = page.route.includes(link.url.href) ? page.route : [...page.route, link.url.href];
          candidates.push({ canonicalKey: item.id, sourceUrl: link.url.href, documentRole: documentRole(`${link.label} ${link.url.pathname}`), sourceAuthority: authority,
            status: "proposed", proposalOrigin: "official_link_discovery", matchScore: score, discoveryPath: route,
            proposalNote: `Candidata oficial localizada desde ${seed.hostname}; requiere aprobacion humana.` });
        }
        if (DOCUMENT_PATTERN.test(page.url.href)) continue;
        const next = links.map((link) => ({ link, score: pageRelevance(item, page.url, link) }))
          .filter(({ link, score }) => score > 0 || (page.url.href === seed.href && officialBridge(item, seed, link)))
          .sort((a, b) => b.score - a.score);
        for (const { link } of next) {
          if (seen.has(link.url.href) || queue.length >= maxPages) continue;
          seen.add(link.url.href); queue.push({ url: link.url, label: link.label, route: [...page.route, link.url.href] });
        }
      }
    }
  }
  return [...new Map(candidates.map((item) => [`${item.canonicalKey}|${item.sourceUrl}|${item.documentRole}`, item])).values()]
    .sort((a, b) => b.matchScore - a.matchScore).filter((item, index, all) => all.slice(0, index).filter((other) => other.canonicalKey === item.canonicalKey).length < 3);
}

async function persistCandidates(candidates) {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias para --apply.");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const keys = [...new Set(candidates.map((item) => item.canonicalKey))];
  if (keys.length === 0) return { inserted: 0, existing: 0 };
  const { data: opportunities, error } = await supabase.from("platform_opportunities").select("id, canonical_key").in("canonical_key", keys);
  if (error) throw error;
  const ids = new Map((opportunities || []).map((item) => [item.canonical_key, item.id])); let inserted = 0; let existing = 0;
  for (const item of candidates) {
    const opportunityId = ids.get(item.canonicalKey); if (!opportunityId) continue;
    const { error: insertError } = await supabase.from("platform_supplementary_basis_sources").insert({ opportunity_id: opportunityId,
      source_url: item.sourceUrl, document_role: item.documentRole, source_authority: item.sourceAuthority, status: "proposed",
      proposal_origin: item.proposalOrigin, discovery_path: item.discoveryPath, match_score: item.matchScore, proposal_note: item.proposalNote });
    if (insertError?.code === "23505") existing += 1; else if (insertError) throw insertError; else inserted += 1;
  }
  return { inserted, existing };
}

async function main() {
  const args = new Map(process.argv.slice(2).map((arg) => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=") || "true"]; }));
  const input = args.get("input"); if (!input) throw new Error("Falta --input=<dataset-enriquecido.json>");
  const dataset = JSON.parse(await fs.readFile(input, "utf8"));
  const candidates = await discoverOfficialBasisCandidates(dataset, { maxOpportunities: args.get("max-opportunities"), maxSeeds: args.get("max-seeds"), maxPages: args.get("max-pages"), timeoutMs: args.get("timeout-ms") });
  const persistence = args.get("apply") === "true" ? await persistCandidates(candidates) : { inserted: 0, existing: 0 };
  console.log(JSON.stringify({ mode: args.get("apply") === "true" ? "applied" : "dry-run", blockedScanned: Math.min((dataset.opportunities || []).filter((item) => item.requirementsContract?.documentRecovery?.requiresAdditionalOfficialSource).length, Number(args.get("max-opportunities") || 20)), candidates: candidates.length, persistence, items: candidates }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
