import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const values = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
if (values.has("apply")) throw new Error("Este descubridor solo genera candidatas pendientes de revision; no admite --apply.");

const providersPath = values.get("providers") || "data/private-open-funders/discovery-providers-v1.json";
const outputPath = values.get("write") || ".tmp/private-funder-source-candidates.json";
const maxPagesArg = Number(values.get("max-pages"));
const maxCandidatesArg = Number(values.get("max-candidates"));
const timeoutMs = 12000;
const userAgent = "SubvencionesRAG source discovery (+human-review; contact: platform-admin)";
const evidenceFields = ["bases_document", "funder", "object", "beneficiaries", "territory", "requirements", "eligible_costs", "amount", "cofinancing", "opening", "closing", "required_documents", "evaluation_criteria", "contact"];

function emptyConvocationEvidence() {
  return Object.fromEntries(evidenceFields.map((field) => [field, { state: "absent", value: null, evidence_url: null, excerpt: "" }]));
}

function autoValidate(candidate, provider, policy) {
  const rate = bounded(Number(policy?.audit_sample_rate_percent), 20, 0, 100);
  const domainCoherent = candidate.organization_key.split(" ").filter((token) => token.length >= 5 && token !== "fundacion")
    .some((token) => candidate.official_domain?.includes(token));
  const checks = {
    https: candidate.official_url?.startsWith("https://") || false,
    organization_domain_coherence: domainCoherent,
    public_provenance: Boolean(candidate.provenance?.provider_id && candidate.provenance?.directory_url),
    robots_allowed: candidate.provenance?.permission?.robots === "allowed",
    terms_reference: candidate.provenance?.permission?.terms === "referenced",
    direct_official_page: candidate.provenance?.official_page_observed === true,
    page_identity_coherence: candidate.provenance?.page_identity_observed === true,
    no_risk_signal: candidate.provenance?.risk_signal !== true && !candidate.provenance?.provider_risk_note
  };
  const reasons = Object.entries(checks).filter(([, passed]) => !passed).map(([rule]) => rule);
  if (provider?.auto_scan_allowed !== true) reasons.push("provider_auto_scan_not_allowed");
  const eligible = provider?.auto_scan_allowed === true && reasons.length === 0;
  const bucket = Number.parseInt(crypto.createHash("sha256").update(candidate.discovery_key).digest("hex").slice(0, 8), 16) % 100;
  return {
    ...candidate,
    review_status: eligible ? "auto_approved" : "pending_review",
    scanner_eligible: eligible,
    auto_validation: {
      rules_version: policy?.rules_version || "private_source_auto_scan_v1", status: eligible ? "auto_approved" : "pending_review",
      checks, reasons, audit_sample: { rate_percent: rate, bucket, required: eligible && bucket < rate },
      decided_at: retrievedAt
    }
  };
}

function bounded(value, fallback, minimum, maximum) {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
}

function normalizeName(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function officialUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}

function robotsAllows(text, target) {
  const path = new URL(target).pathname;
  const lines = text.split(/\r?\n/).map((line) => line.replace(/#.*/, "").trim());
  let active = false;
  const rules = [];
  for (const line of lines) {
    const [rawKey, ...rawValue] = line.split(":");
    const key = rawKey?.toLowerCase();
    const value = rawValue.join(":").trim();
    if (key === "user-agent") active = value === "*";
    if (active && ["allow", "disallow"].includes(key) && value) rules.push({ key, value });
  }
  const match = rules.filter((rule) => path.startsWith(rule.value)).sort((a, b) => b.value.length - a.value.length)[0];
  return !match || match.key === "allow";
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": userAgent, accept: "application/json,text/plain,*/*" } });
    return { ok: response.ok, status: response.status, text: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, text: error instanceof Error ? error.message : "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

function isPrivateGrantMaker(record) {
  const country = String(record["_gs_paisfacturacion_value@OData.Community.Display.V1.FormattedValue"] || "");
  const privateStatus = String(record["gs_privadapublica@OData.Community.Display.V1.FormattedValue"] || "");
  const activity = String(record["gs_tipodeactividadprincipal@OData.Community.Display.V1.FormattedValue"] || "");
  return /españa|espana/i.test(country) && /privada/i.test(privateStatus) && /ayudas a terceros/i.test(activity);
}

function candidateFrom(record, provider, page, retrievedAt) {
  const organization = String(record.gs_denominacion || record.name || "").trim();
  const url = officialUrl(record.websiteurl);
  const domain = domainOf(url);
  return {
    discovery_key: `${normalizeName(organization)}:${domain || "no-official-domain"}`,
    organization_name: organization,
    organization_key: normalizeName(organization),
    official_url: url,
    official_domain: domain,
    source_kind: "private_funder",
    funder_type: "foundation",
    territory: record["_gs_ccaafacturacion_value@OData.Community.Display.V1.FormattedValue"] || null,
    themes_hint: String(record.gs_fines || "").slice(0, 600),
    classification: {
      privacy_scope: "platform_public",
      directory_status: "declared_private",
      grant_signal: "third_party_aid",
      evidence_quality: "public_directory",
      official_url_status: url ? "unverified" : "missing"
    },
    convocation_evidence: emptyConvocationEvidence(),
    review_status: "pending_review",
    scanner_eligible: false,
    publication_eligible: false,
    promotion_requirements: ["verify official funder URL", "verify public open-call evidence", "human platform review"],
    provenance: {
      provider_id: provider.id,
      directory_url: provider.directory_url,
      api_url: provider.api_url,
      terms_url: provider.terms_url,
      directory_record_id: record.accountid || null,
      directory_page: page,
      permission: { robots: "allowed", terms: "referenced" },
      official_page_observed: false,
      risk_signal: false,
      retrieved_at: retrievedAt
    }
  };
}

function configuredCandidate(provider, retrievedAt, title, pageText) {
  const item = provider.candidate || {};
  const organization = String(item.organization_name || "").trim();
  const url = officialUrl(item.official_url);
  const domain = domainOf(url);
  const organizationTokens = normalizeName(organization).split(" ").filter((token) => token.length >= 5 && token !== "fundacion");
  const pageIdentityObserved = organizationTokens.some((token) => normalizeName(`${title} ${pageText}`).includes(token));
  return {
    discovery_key: `${normalizeName(organization)}:${domain || "no-official-domain"}`,
    organization_name: organization, organization_key: normalizeName(organization), official_url: url, official_domain: domain,
    source_kind: "private_funder", funder_type: item.funder_type || "unknown", territory: item.territory || "Espana",
    themes_hint: String(item.themes_hint || "").slice(0, 600),
    classification: { privacy_scope: "platform_public", grant_signal: "official_program_page", evidence_quality: "issuing_body", official_url_status: "unverified" },
    convocation_evidence: emptyConvocationEvidence(),
    review_status: "pending_review", scanner_eligible: false,
    publication_eligible: false,
    promotion_requirements: ["verify public open-call evidence", "human platform review"],
    provenance: { provider_id: provider.id, directory_url: provider.directory_url, source_url: url, terms_url: provider.terms_url, page_title: title, permission: { robots: "allowed", terms: "referenced" }, official_page_observed: true, page_identity_observed: pageIdentityObserved, provider_risk_note: provider.risk_note || null, risk_signal: /(?:iniciar sesion|acceso privado|solo socios|login required)/i.test(pageText), retrieved_at: retrievedAt }
  };
}

function deduplicate(candidates) {
  const organizations = new Set();
  const domains = new Set();
  const retained = [];
  const discarded = { organization: 0, domain: 0 };
  for (const candidate of candidates) {
    if (organizations.has(candidate.organization_key)) { discarded.organization += 1; continue; }
    if (candidate.official_domain && domains.has(candidate.official_domain)) { discarded.domain += 1; continue; }
    organizations.add(candidate.organization_key);
    if (candidate.official_domain) domains.add(candidate.official_domain);
    retained.push(candidate);
  }
  return { retained, discarded };
}

const configuration = JSON.parse(await fs.readFile(providersPath, "utf8"));
const retrievedAt = new Date().toISOString();
const providerResults = [];
const rawCandidates = [];
for (const provider of configuration.providers || []) {
  const budget = provider.request_budget || {};
  const maxPages = bounded(maxPagesArg, bounded(Number(budget.max_pages), 1, 1, 10), 1, 10);
  const pageSize = bounded(Number(budget.page_size), 50, 1, 100);
  const maxCandidates = bounded(maxCandidatesArg, bounded(Number(budget.max_candidates), 100, 1, 250), 1, 250);
  if (!provider.terms_url) {
    providerResults.push({ id: provider.id, status: "skipped", reason: "missing_terms_reference", pages_requested: 0 });
    continue;
  }
  const targetUrl = provider.api_url || provider.candidate?.official_url;
  const robots = await fetchText(provider.robots_url);
  if (!targetUrl || !robots.ok || !robotsAllows(robots.text, targetUrl)) {
    providerResults.push({ id: provider.id, status: "skipped", reason: robots.ok ? "robots_disallow_api" : "robots_unavailable", pages_requested: 0 });
    continue;
  }
  if (provider.mode === "official_program_page") {
    const page = await fetchText(targetUrl);
    if (!page.ok) providerResults.push({ id: provider.id, status: "skipped", reason: `page_http_${page.status}`, pages_requested: 1 });
    else {
      const title = page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim().slice(0, 160) || "";
      rawCandidates.push(configuredCandidate(provider, retrievedAt, title, page.text));
      providerResults.push({ id: provider.id, status: "completed", pages_requested: 1, records_observed: 1, relevant_records: 1 });
    }
    continue;
  }
  let fetched = 0;
  let records = 0;
  let relevant = 0;
  for (let page = 1; page <= maxPages && relevant < maxCandidates; page += 1) {
    const url = new URL(provider.api_url);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(pageSize));
    url.searchParams.set("include_count", "true");
    const response = await fetchText(url.href);
    if (!response.ok) { providerResults.push({ id: provider.id, status: "partial", reason: `api_http_${response.status}`, pages_requested: fetched }); break; }
    const payload = JSON.parse(response.text);
    const values = Array.isArray(payload) ? payload : payload.value || [];
    fetched += 1;
    records += values.length;
    const matches = values.filter(isPrivateGrantMaker).slice(0, maxCandidates - relevant);
    rawCandidates.push(...matches.map((record) => candidateFrom(record, provider, page, retrievedAt)));
    relevant += matches.length;
    if (values.length < pageSize) break;
  }
  if (!providerResults.some((item) => item.id === provider.id)) providerResults.push({ id: provider.id, status: "completed", pages_requested: fetched, records_observed: records, relevant_records: relevant });
}

const deduped = deduplicate(rawCandidates);
const providersById = new Map((configuration.providers || []).map((provider) => [provider.id, provider]));
const candidates = deduped.retained.map((candidate) => autoValidate(candidate, providersById.get(candidate.provenance.provider_id), configuration.auto_scan_validation));
const payload = {
  schema: "private_funder_source_candidates_v1",
  generated_at: retrievedAt,
  execution: { mode: "dry_run", supabase_writes: 0, alerts_emitted: 0, scanner_enqueues: 0, tenant_context_read: false },
  provider_results: providerResults,
  metrics: { raw_candidates: rawCandidates.length, pending_review_candidates: candidates.filter((candidate) => candidate.review_status === "pending_review").length, auto_scan_approved: candidates.filter((candidate) => candidate.review_status === "auto_approved").length, audit_samples_required: candidates.filter((candidate) => candidate.auto_validation.audit_sample.required).length, duplicates_by_organization: deduped.discarded.organization, duplicates_by_domain: deduped.discarded.domain },
  source_candidates: candidates
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...payload.execution, ...payload.metrics, providers: providerResults }, null, 2));
