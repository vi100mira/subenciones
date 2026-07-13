import crypto from "node:crypto";

export const ENTITY_RESEARCH_LIMITS = Object.freeze({
  maxPages: 12,
  maxDepth: 2,
  maxWallMs: 90_000,
  maxBytes: 3_000_000,
  requestTimeoutMs: 15_000
});

const topicRules = [
  ["empleo e inserción", ["empleo", "inserción laboral", "itinerarios de inserción"]],
  ["formación", ["formación", "capacitación", "competencias profesionales"]],
  ["inclusión social", ["inclusión social", "exclusión social", "vulnerabilidad"]],
  ["economía social", ["economía social", "empresa social", "responsabilidad social"]],
  ["juventud", ["jóvenes", "juventud", "empleo juvenil"]]
];

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function normalizedText(html) {
  return decodeEntities(String(html || "")
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function matchContent(html, pattern) {
  return decodeEntities(String(html).match(pattern)?.[1] || "").replace(/\s+/g, " ").trim();
}

function absoluteHttpUrl(value, pageUrl, origin) {
  try {
    const url = new URL(decodeEntities(value), pageUrl);
    url.hash = "";
    if (!/^https?:$/.test(url.protocol) || url.origin !== origin) return null;
    if (/\.(pdf|docx?|xlsx?|zip|jpe?g|png|gif|webp|svg)$/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function extractPublicPage(html, pageUrl, origin) {
  const title = matchContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = matchContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || matchContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const links = [];
  const logos = [];
  for (const match of String(html).matchAll(/<(a|img|link)\b[^>]*(?:href|src)=["']([^"']+)["'][^>]*>/gi)) {
    const url = absoluteHttpUrl(match[2], pageUrl, origin);
    if (!url) continue;
    if (/\b(logo|brand|identidad)\b/i.test(match[0])) logos.push(url);
    if (match[1].toLowerCase() === "a") links.push(url);
  }
  const text = normalizedText(html).slice(0, 250_000);
  return {
    url: pageUrl,
    title,
    description,
    text,
    textSha256: hash(text),
    links: [...new Set(links)],
    logoCandidates: [...new Set(logos)].slice(0, 5)
  };
}

export function parseRobots(robotsText) {
  const rules = [];
  let applies = false;
  for (const raw of String(robotsText || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") applies = value === "*";
    if (applies && (key === "allow" || key === "disallow") && value) rules.push({ type: key, path: value });
  }
  return rules;
}

export function robotsAllows(pathname, rules) {
  const matches = rules.filter((rule) => pathname.startsWith(rule.path));
  if (!matches.length) return true;
  matches.sort((a, b) => b.path.length - a.path.length);
  return matches[0].type === "allow";
}

function evidenceExcerpt(text, token) {
  const lower = text.toLowerCase();
  const index = lower.indexOf(token.toLowerCase());
  const start = Math.max(0, index - 100);
  return text.slice(start, Math.min(text.length, index + token.length + 180)).trim();
}

export function profileSuggestions(pages) {
  const suggestions = [];
  const seen = new Set();
  const add = (fieldKey, value, page, token, confidence = "medium") => {
    const key = `${fieldKey}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({
      fieldKey,
      value,
      sourceType: "public_web",
      sourceRef: page.url,
      sourceSha256: page.textSha256,
      evidenceExcerpt: evidenceExcerpt(page.text, token),
      confidence,
      status: "pending"
    });
  };
  for (const page of pages) {
    const lower = page.text.toLowerCase();
    for (const [value, tokens] of topicRules) {
      const token = tokens.find((candidate) => lower.includes(candidate));
      if (token) add("theme", value, page, token);
    }
    for (const [token, value] of [["fundación", "fundación"], ["asociación", "asociación"]]) {
      if (lower.includes(token)) add("legal_form", value, page, token, "low");
    }
    for (const [token, value] of [["comunitat valenciana", "Comunitat Valenciana"], ["valencia", "Valencia"]]) {
      if (lower.includes(token)) add("territory", value, page, token, "low");
    }
    for (const logo of page.logoCandidates) add("logo_candidate", logo, page, "", "low");
  }
  return suggestions.slice(0, 40);
}

async function fetchText(url, fetchImpl, timeoutMs, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { redirect: "follow", signal: controller.signal, headers });
    if (!response.ok) return null;
    return { response, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

export async function crawlPublicWebsite(baseUrl, options = {}) {
  const limits = { ...ENTITY_RESEARCH_LIMITS, ...(options.limits || {}) };
  const fetchImpl = options.fetchImpl || fetch;
  const startUrl = new URL(baseUrl);
  if (startUrl.protocol !== "https:") throw new Error("La investigación solo admite webs HTTPS");
  const startedAt = Date.now();
  const robots = await fetchText(new URL("/robots.txt", startUrl).href, fetchImpl, limits.requestTimeoutMs)
    .catch(() => null);
  const robotRules = parseRobots(robots?.text || "");
  const queue = [{ url: startUrl.href, depth: 0 }];
  const visited = new Set();
  const pages = [];
  let totalBytes = 0;
  while (queue.length && pages.length < limits.maxPages && Date.now() - startedAt < limits.maxWallMs) {
    const next = queue.shift();
    if (!next || visited.has(next.url)) continue;
    visited.add(next.url);
    const parsedUrl = new URL(next.url);
    if (!robotsAllows(parsedUrl.pathname, robotRules)) continue;
    const fetched = await fetchText(next.url, fetchImpl, limits.requestTimeoutMs, {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "SubvencionesEntityResearch/1.0 (+public-profile; human-review)"
    }).catch(() => null);
    if (!fetched || !String(fetched.response.headers.get("content-type") || "").includes("text/html")) continue;
    if (new URL(fetched.response.url || next.url).origin !== startUrl.origin) continue;
    const bytes = Buffer.byteLength(fetched.text, "utf8");
    if (totalBytes + bytes > limits.maxBytes) break;
    totalBytes += bytes;
    const page = extractPublicPage(fetched.text, next.url, startUrl.origin);
    pages.push(page);
    if (next.depth < limits.maxDepth) {
      for (const link of page.links) if (!visited.has(link)) queue.push({ url: link, depth: next.depth + 1 });
    }
  }
  return {
    pages,
    suggestions: profileSuggestions(pages),
    stats: { pages: pages.length, bytes: totalBytes, elapsedMs: Date.now() - startedAt, limits },
    reviewRequired: true,
    dataClasses: ["public"]
  };
}
