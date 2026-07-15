import fs from "node:fs";
import path from "node:path";
import { combineGrantRequirements, extractGrantRequirements } from "./extract-grant-requirements.mjs";

const inputPaths = process.argv.slice(2).filter((value) => !value.startsWith("--"));
if (!inputPaths.length) {
  throw new Error("Uso: npm run radar:audit-bases-coverage -- <bases-scan.json> [otro-scan.json]");
}

const opportunities = new Map();
for (const inputPath of inputPaths) {
  const absolutePath = path.resolve(inputPath);
  const payload = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  for (const result of payload.results || []) {
    const opportunityId = String(result.id || "").replace(/-bases-\d+$/, "");
    if (!opportunities.has(opportunityId)) opportunities.set(opportunityId, { contracts: [], documents: new Set(), inputPaths: new Set() });
    const group = opportunities.get(opportunityId);
    group.inputPaths.add(absolutePath);
    const evidenceDocuments = result.evidence_documents?.length ? result.evidence_documents : [result.best_evidence?.document];
    for (const document of evidenceDocuments) {
      if (document?.extraction_status !== "ready" || !document.extracted_text?.trim()) continue;
      const key = document.sha256 || `${absolutePath}:${result.id}:${document.source_url}`;
      if (group.documents.has(key)) continue;
      group.documents.add(key);
      group.contracts.push(extractGrantRequirements(document.extracted_text, {
        sourceUrl: document.source_url || result.verification_url,
        documentSha256: document.sha256,
        pageEvidence: document.page_evidence
      }));
    }
  }
}

const missing = { beneficiaries: 0, eligibleActivities: 0, requiredDocuments: 0, submission: 0 };
const partial = [];
let complete = 0;

const readable = [...opportunities.entries()].filter(([, group]) => group.contracts.length);
const unreadable = [...opportunities.entries()].filter(([, group]) => !group.contracts.length)
  .map(([id, group]) => ({ id, sourceFiles: [...group.inputPaths] }));
for (const [opportunityId, group] of readable) {
  const contract = combineGrantRequirements(group.contracts);
  if (!contract.missingCoreSections.length) complete += 1;
  else partial.push({ id: opportunityId, sourceFiles: [...group.inputPaths], officialDocuments: group.documents.size, missingCoreSections: contract.missingCoreSections });
  for (const section of contract.missingCoreSections) missing[section] += 1;
}

const total = opportunities.size;
console.log(JSON.stringify({
  opportunitiesScanned: total,
  readableOpportunities: readable.length,
  noReadableEvidence: unreadable.length,
  coreComplete: complete,
  partialRequiresReview: readable.length - complete,
  coreCoveragePercent: readable.length ? Number(((complete / readable.length) * 100).toFixed(1)) : 0,
  missing,
  partial,
  unreadable
}, null, 2));
