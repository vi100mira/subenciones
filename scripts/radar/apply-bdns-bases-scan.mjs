import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { combineProposalConstraints, extractProposalConstraints } from "./extract-proposal-constraints.mjs";
import { combineGrantRequirements, extractGrantRequirements } from "./extract-grant-requirements.mjs";

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

export function hasApplicationMaterial(text = "") {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const signals = [/solicitud|anexo/.test(normalized), /documentacion|memoria|declaracion/.test(normalized), /firma|nif|dni|representante|adjunt/.test(normalized)];
  return signals.filter(Boolean).length >= 2;
}

function journalTarget(document, options) {
  if (options.sourceAuthority !== "official_journal") {
    return { text: document.extracted_text || "", pages: document.page_evidence || [], locator: null };
  }
  const bdnsId = String(options.canonicalId || "").match(/\d{5,}/)?.[0] || "";
  const tokens = String(options.opportunityTitle || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .split(/[^a-z0-9]+/).filter((token) => token.length > 5 && !["bases", "reguladoras", "convocatoria", "subvenciones", "ayudas"].includes(token));
  const pages = (document.page_evidence || []).filter((page) => {
    const text = String(page.text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const titleMatches = tokens.filter((token) => text.includes(token)).length;
    return bdnsId && text.includes(bdnsId) && titleMatches >= 4;
  });
  if (!pages.length) return null;
  return {
    text: pages.map((page) => page.text || "").join("\n\n"),
    pages,
    locator: { kind: "official_journal_bdns_match", bdnsId, pages: pages.map((page) => page.page).filter(Boolean) }
  };
}

export function verifiedEvidence(result, expectedUrl, options = {}) {
  const expected = comparableUrl(expectedUrl);
  const documents = (result.evidence_documents || []).flatMap((document) => {
    const officialPath = comparableUrl(document.curated_basis_origin || document.source_url) === expected;
    const target = journalTarget(document, options);
    const accepted = officialPath
      && document.extraction_status === "ready"
      && /^[a-f0-9]{64}$/i.test(document.sha256 || "")
      && (target?.text || "").trim().length >= 1000
      && (hasSubstantiveBases(target?.text) || (options.applicationMaterial && hasApplicationMaterial(target?.text)));
    return accepted ? [{ document, target }] : [];
  }).map(({ document, target }) => ({
    sourceUrl: document.source_url,
    officialBasesUrl: expectedUrl,
    sha256: document.sha256,
    pageCount: document.page_count,
    sourceLocator: target.locator,
    extractionStatus: document.extraction_status,
    extractedChars: target.text.length,
    excerpt: target.text.slice(0, 4000),
    proposalConstraints: extractProposalConstraints(target.text, {
      sourceUrl: document.source_url,
      documentSha256: document.sha256,
      pageEvidence: target.pages
    }),
    requirementsContract: extractGrantRequirements(target.text, {
      sourceUrl: document.source_url,
      documentSha256: document.sha256,
      pageEvidence: target.pages,
      sourceAuthority: options.sourceAuthority
    })
  }));

  const best = result.best_evidence || {};
  const verifiedHtml = comparableUrl(best.curated_basis_origin || best.url) === expected
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
      excerpt: best.extracted_text.slice(0, 4000),
      proposalConstraints: extractProposalConstraints(best.extracted_text, {
        sourceUrl: best.url,
        documentSha256: best.content_sha256
      }),
      requirementsContract: extractGrantRequirements(best.extracted_text, {
        sourceUrl: best.url,
        documentSha256: best.content_sha256,
        sourceAuthority: options.sourceAuthority
      })
    });
  }
  return documents;
}

function prototypeOpportunity(item) {
  const { basesEvidence: _basesEvidence, ...safe } = item;
  return {
    ...safe,
    extractedText: item.extractedText?.slice(0, 2400) || "",
    announcements: (item.announcements || []).slice(0, 4)
  };
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
    const expectedDocuments = item.basisDocuments?.length ? item.basisDocuments : (item.basesUrls?.length ? item.basesUrls : item.basesUrl ? [item.basesUrl] : []).map((url, index) => ({ url, role: index ? "supporting" : "primary" }));
    const evidenceByResult = results.map((result) => ({
      index: resultIndex(result.id),
      evidence: verifiedEvidence(result, expectedDocuments[resultIndex(result.id)]?.url, {
        applicationMaterial: expectedDocuments[resultIndex(result.id)]?.role === "application_form",
        sourceAuthority: expectedDocuments[resultIndex(result.id)]?.sourceAuthority,
        canonicalId: item.id,
        opportunityTitle: item.title
      })
    }));
    const legalDocumentIndexes = new Set(expectedDocuments.map((document, index) => [document, index])
      .filter(([document]) => document.role !== "application_form")
      .map(([, index]) => index));
    const complete = expectedDocuments.length > 0
      && evidenceByResult.some((entry) => legalDocumentIndexes.has(entry.index) && entry.evidence.length > 0);
    const basesEvidence = evidenceByResult.flatMap((entry) => entry.evidence);
    const proposalConstraints = combineProposalConstraints(basesEvidence.map((entry) => entry.proposalConstraints));
    const requirementsContract = combineGrantRequirements(basesEvidence.map((entry) => entry.requirementsContract));
    return {
      ...item,
      actionable: Boolean(item.actionable && complete),
      basesStatus: complete ? "extracted" : item.basesUrl ? "extraction_pending_or_failed" : "missing",
      basesEvidence,
      proposalConstraints,
      requirementsContract,
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
  await fs.writeFile(prototypeOut, `window.MUNICIPAL_RADAR = ${JSON.stringify({ ...enriched, opportunities: opportunities.filter((item) => item.actionable).map(prototypeOpportunity) }, null, 2)};\n`, "utf8");
  console.log(JSON.stringify({ output, prototypeOut, basesExtracted: enriched.quality.basesExtracted, actionable: enriched.quality.actionableCount }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
