import fs from "node:fs/promises";
import { extractProposalConstraints } from "../radar/extract-proposal-constraints.mjs";

const values = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const catalogPath = values.get("catalog") || "data/private-open-funders/platform-open-funders-v1.json";
const scanPath = values.get("scan");
const outputPath = values.get("output");
if (!scanPath || !outputPath) throw new Error("--scan y --output son obligatorios.");

function explicitOpenStatus(result) {
  return /abiert|open|en plazo/i.test(result.status_facts?.status || "");
}

function explicitClosing(result) {
  return result.status_facts?.closing || "";
}

function safeLiveCandidate(result) {
  return result?.source_admission?.state === "admitted"
    && result?.status === "evidence_candidate"
    && result.evidence_complete === true
    && ["high", "medium"].includes(result.basis_confidence?.level)
    && explicitOpenStatus(result)
    && Boolean(explicitClosing(result));
}

function publicationDecision(result) {
  if (safeLiveCandidate(result)) return { state: "publicable", reason: null };
  if (!result?.best_evidence || ["low", "none"].includes(result.basis_confidence?.level)) return { state: "not_discovered", reason: result?.review_reason || "no_official_evidence_reached" };
  return { state: "review_required", reason: result.review_reason || "missing_publishable_deadline_or_status" };
}

function constraintsFrom(result) {
  const document = result.best_evidence?.document;
  return extractProposalConstraints(document?.extracted_text || result.best_evidence?.extracted_text || "", {
    sourceUrl: result.verification_url,
    documentSha256: document?.sha256 || result.best_evidence?.content_sha256 || null,
    pageEvidence: document?.page_evidence || []
  });
}

function mergeSource(source, result) {
  const live = safeLiveCandidate(result);
  const publication = publicationDecision(result);
  const statusFacts = result?.status_facts || source.status_facts || {};
  return {
    ...source,
    opportunity_status: live ? "open" : source.opportunity_status,
    deadline_text: live
      ? [statusFacts.opening && `Apertura: ${statusFacts.opening}`, `Cierre: ${statusFacts.closing}`].filter(Boolean).join("; ")
      : source.deadline_text,
    deadline_confidence: live ? "high" : source.deadline_confidence,
    basis_url: result?.verification_url || source.basis_url,
    status_facts: statusFacts,
    live_evidence_gate: live ? "passed" : "monitor_or_review",
    scan_status: result?.status || "not_scanned",
    scan_observed_at: result?.scanned_at || null,
    source_admission: result?.source_admission || { state: "review_required", reason: "not_scanned" },
    discovery_state: result?.discovery_state || "not_scanned",
    publication_state: publication.state,
    publication_reason: publication.reason,
    scan_telemetry: result?.telemetry || null,
    proposal_constraints: constraintsFrom(result || {})
  };
}

function reviewCandidate(source, result) {
  const publication = publicationDecision(result);
  if (!result || publication.state !== "review_required") return null;
  const best = result.best_evidence || {};
  const document = best.document || {};
  return {
    ...source,
    basis_url: result.verification_url || source.basis_url || null,
    evidence_url: result.verification_url || source.url,
    navigation_path: result.navigation_path || [],
    status_facts: result.status_facts || {},
    basis_confidence: result.basis_confidence || { level: "low" },
    evidence_complete: Boolean(result.evidence_complete),
    evidence_excerpt: best.evidence_excerpt || "",
    evidence_sha256: document.sha256 || best.content_sha256 || null,
    scan_status: result.status || "not_scanned",
    scan_observed_at: result.scanned_at || null,
    source_admission: result.source_admission || { state: "review_required", reason: "not_scanned" },
    scan_telemetry: result.telemetry || null,
    discovery_state: result.discovery_state || "evidence_found",
    edition_current: result.edition_current,
    publication_state: publication.state,
    publication_reason: publication.reason,
    proposal_constraints: constraintsFrom(result)
  };
}

function concreteCalls(source, result) {
  if (result?.source_admission?.state !== "admitted") return [];
  return (result?.calls || []).map((call) => ({
    ...source,
    id: `${source.id}:call:${call.id}`,
    name: call.title,
    url: call.source_url,
    basis_url: call.source_url,
    deadline_text: call.deadline_text,
    deadline_confidence: "high",
    opportunity_status: "open",
    status_facts: call.status_facts,
    live_evidence_gate: "passed",
    scan_status: "evidence_candidate",
    discovery_state: "evidence_found",
    publication_state: "publicable",
    publication_reason: null,
    evidence_excerpt: call.evidence_excerpt,
    parent_source_id: source.id,
    parent_source_name: source.name
  }));
}

const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const scan = JSON.parse(await fs.readFile(scanPath, "utf8"));
const results = new Map((scan.results || []).map((item) => [item.id, { ...item, scanned_at: scan.scanned_at }]));
const sources = catalog.sources.flatMap((source) => [mergeSource(source, results.get(source.id)), ...concreteCalls(source, results.get(source.id))]);
const reviewCandidates = catalog.sources.map((source) => reviewCandidate(source, results.get(source.id))).filter(Boolean);
const scannedSources = sources.filter((item) => item.scan_status !== "not_scanned");
const payload = {
  ...catalog,
  catalog: { ...catalog.catalog, observed_at: scan.scanned_at, generated_from_scan: scanPath },
  sources,
  review_candidates: reviewCandidates,
  scan_metrics: {
    scanned: scan.sources_scanned || 0,
    live_candidates: sources.filter((item) => item.live_evidence_gate === "passed").length,
    review_candidates: reviewCandidates.length,
    blocked_or_monitor: scannedSources.filter((item) => item.live_evidence_gate !== "passed").length,
    not_scanned: sources.length - scannedSources.length
  }
};
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload.scan_metrics, null, 2));
