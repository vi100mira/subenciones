import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const input = args.get("input") || "data/public-radar/bdns-municipal-social.json";
const scanPath = args.get("scan") || "data/public-radar/bdns-municipal-bases-scan.json";
const output = args.get("output") || "data/public-radar/bdns-municipal-social-enriched.json";
const prototypeOut = args.get("prototype-out") || "prototype/municipal-radar-data.js";

function opportunityId(scanId) {
  return String(scanId).replace(/-bases-\d+$/, "");
}

function resultIndex(scanId) {
  const match = String(scanId).match(/-bases-(\d+)$/);
  return match ? Number(match[1]) - 1 : 0;
}

function comparableUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function hasSubstantiveBases(text = "") {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const signals = [
    /bases|convocatoria|ordenanza/.test(normalized),
    /beneficiari|requisit|solicitante/.test(normalized),
    /plazo|presentacion|solicitud/.test(normalized),
    /criteri|obligacion|documentacion/.test(normalized),
    /importe|presupuesto|cuantia/.test(normalized)
  ];
  return signals.filter(Boolean).length >= 3;
}

export function verifiedEvidence(result, expectedUrl) {
  const expected = comparableUrl(expectedUrl);
  const documents = (result.evidence_documents || []).filter((document) => {
    const officialPath = comparableUrl(document.curated_basis_origin || document.source_url) === expected;
    return officialPath
      && document.extraction_status === "ready"
      && /^[a-f0-9]{64}$/i.test(document.sha256 || "")
      && (document.extracted_text || "").trim().length >= 1000
      && hasSubstantiveBases(document.extracted_text);
  }).map((document) => ({
    sourceUrl: document.source_url,
    officialBasesUrl: expectedUrl,
    sha256: document.sha256,
    pageCount: document.page_count,
    extractionStatus: document.extraction_status,
    extractedChars: document.extracted_text.length,
    excerpt: document.extracted_text.slice(0, 4000)
  }));

  const best = result.best_evidence || {};
  const verifiedHtml = comparableUrl(best.url) === expected
    && best.curated_basis === true
    && /^[a-f0-9]{64}$/i.test(best.content_sha256 || "")
    && (best.extracted_text || "").trim().length >= 1000
    && (best.signals || []).includes("bases_or_call")
    && (best.signals || []).includes("eligibility");
  if (verifiedHtml) {
    documents.push({
      sourceUrl: best.url,
      officialBasesUrl: expectedUrl,
      sha256: best.content_sha256,
      pageCount: 1,
      extractionStatus: "html_ready",
      extractedChars: best.extracted_text.length,
      excerpt: best.extracted_text.slice(0, 4000)
    });
  }
  return documents;
}

async function main() {
  const dataset = JSON.parse(await fs.readFile(input, "utf8"));
  const scan = JSON.parse(await fs.readFile(scanPath, "utf8"));
  const byOpportunity = new Map();
  for (const result of scan.results || []) {
    const id = opportunityId(result.id);
    if (!byOpportunity.has(id)) byOpportunity.set(id, []);
    byOpportunity.get(id).push(result);
  }

  const opportunities = (dataset.opportunities || []).map((item) => {
    const results = byOpportunity.get(item.id) || [];
    const expectedUrls = item.basesUrls?.length ? item.basesUrls : item.basesUrl ? [item.basesUrl] : [];
    const evidenceByResult = results.map((result) => ({
      index: resultIndex(result.id),
      evidence: verifiedEvidence(result, expectedUrls[resultIndex(result.id)])
    }));
    const complete = expectedUrls.length > 0
      && results.length === expectedUrls.length
      && expectedUrls.every((_, index) => evidenceByResult.some((entry) => entry.index === index && entry.evidence.length > 0));
    const basesEvidence = evidenceByResult.flatMap((entry) => entry.evidence);
    return {
      ...item,
      actionable: Boolean(item.actionable && complete),
      basesStatus: complete ? "extracted" : item.basesUrl ? "extraction_pending_or_failed" : "missing",
      basesEvidence,
      extractedText: [item.extractedText, ...basesEvidence.map((entry) => entry.excerpt)].filter(Boolean).join("\n\n")
    };
  });
  const enriched = {
    ...dataset,
    basesScanAt: scan.scanned_at,
    quality: {
      ...dataset.quality,
      basesExtracted: opportunities.filter((item) => item.basesStatus === "extracted").length,
      actionableCount: opportunities.filter((item) => item.actionable).length
    },
    opportunities
  };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");
  await fs.writeFile(prototypeOut, `window.MUNICIPAL_RADAR = ${JSON.stringify({ ...enriched, opportunities: opportunities.filter((item) => item.actionable) }, null, 2)};\n`, "utf8");
  console.log(JSON.stringify({ output, prototypeOut, basesExtracted: enriched.quality.basesExtracted, actionable: enriched.quality.actionableCount }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
