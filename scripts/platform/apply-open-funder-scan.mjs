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
  return result?.status === "evidence_candidate"
    && result.evidence_complete === true
    && ["high", "medium"].includes(result.basis_confidence?.level)
    && explicitOpenStatus(result)
    && Boolean(explicitClosing(result));
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
    proposal_constraints: constraintsFrom(result || {})
  };
}

const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const scan = JSON.parse(await fs.readFile(scanPath, "utf8"));
const results = new Map((scan.results || []).map((item) => [item.id, { ...item, scanned_at: scan.scanned_at }]));
const sources = catalog.sources.map((source) => mergeSource(source, results.get(source.id)));
const payload = {
  ...catalog,
  catalog: { ...catalog.catalog, observed_at: scan.scanned_at, generated_from_scan: scanPath },
  sources,
  scan_metrics: {
    scanned: scan.sources_scanned || 0,
    live_candidates: sources.filter((item) => item.live_evidence_gate === "passed").length,
    blocked_or_monitor: sources.filter((item) => item.live_evidence_gate !== "passed").length
  }
};
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload.scan_metrics, null, 2));
