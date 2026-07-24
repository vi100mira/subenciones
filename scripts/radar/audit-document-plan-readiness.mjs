import fs from "node:fs";
import path from "node:path";
import { combineGrantRequirements, extractGrantRequirements } from "./extract-grant-requirements.mjs";
import { requiredDocumentChecklist } from "../workers/openai-draft-provider.mjs";
import { validateDraftOutput } from "../workers/draft-agent-contract.mjs";
import { classifyDocumentRequirement, preparationForCategory } from "../workers/document-requirement-classifier.mjs";

const args = process.argv.slice(2);
const discoverFrom = args.find((value) => value.startsWith("--discover="))?.split("=").slice(1).join("=");
const idPrefix = args.find((value) => value.startsWith("--id-prefix="))?.split("=").slice(1).join("=") || "";
const manifestPath = args.find((value) => value.startsWith("--manifest="))?.split("=").slice(1).join("=");
const discoverJson = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.join(directory, entry.name);
  return entry.isDirectory() ? discoverJson(entryPath) : entry.name.endsWith(".json") ? [entryPath] : [];
});
const inputs = args.filter((value) => !value.startsWith("--"));
if (!inputs.length && manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), "utf8").replace(/^\uFEFF/, ""));
  inputs.push(...(manifest.inputs || []));
}
if (!inputs.length && discoverFrom && fs.existsSync(discoverFrom)) inputs.push(...discoverJson(discoverFrom));
if (!inputs.length) throw new Error("Uso: node scripts/radar/audit-document-plan-readiness.mjs <bases-scan.json> [...], --manifest=<json> o --discover=<directorio>");

const groups = new Map();
for (const input of inputs) {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(path.resolve(input), "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    if (discoverFrom) continue;
    throw error;
  }
  for (const result of payload.results || []) {
    const id = String(result.id || "").replace(/-bases-\d+$/, "");
    if (idPrefix && !id.startsWith(idPrefix)) continue;
    if (!groups.has(id)) groups.set(id, { contracts: [], hashes: new Set() });
    const group = groups.get(id);
    for (const document of result.evidence_documents || []) {
      if (document.extraction_status !== "ready" || !document.extracted_text?.trim()) continue;
      const identity = document.sha256 || `${result.id}:${document.source_url}`;
      if (group.hashes.has(identity)) continue;
      group.hashes.add(identity);
      group.contracts.push(extractGrantRequirements(document.extracted_text, {
        sourceUrl: document.source_url, documentSha256: document.sha256, pageEvidence: document.page_evidence
      }));
    }
  }
}

const failures = [];
const counts = [];
let totalClauses = 0;
let ready = 0;
let planningReadyClauses = 0;
const classificationCounts = {};
const excludedPhaseCounts = {};
const blocked = [];
const increment = (target, key) => { target[key] = (target[key] || 0) + 1; };
for (const [id, group] of groups) {
  if (!group.contracts.length) continue;
  const requirements = combineGrantRequirements(group.contracts);
  for (const clause of requirements.sections.requiredDocuments || []) {
    const classification = clause.documentClassification || classifyDocumentRequirement(clause);
    increment(classificationCounts, classification.recommendedCategory);
    if (classification.planningReady) planningReadyClauses += 1;
  }
  for (const mention of requirements.excludedDocumentMentions || []) increment(excludedPhaseCounts, mention.documentClassification?.phase || classifyDocumentRequirement(mention).phase);
  if (requirements.missingCoreSections.length) {
    blocked.push({ id, missingCoreSections: requirements.missingCoreSections, applicationMentions: requirements.sections.requiredDocuments.length,
      excludedMentions: (requirements.excludedDocumentMentions || []).length });
    continue;
  }
  const checklist = requiredDocumentChecklist({ requirementsContract: requirements });
  const documentRef = "draft-document:1";
  const output = {
    title: "Auditoria de cobertura",
    documents: [{ documentRef, role: "primary_proposal", title: "Borrador auditable", documentType: "audit", requirementRefs: checklist.map((item) => item.requirementRef), sections: [{ title: "Control", paragraphs: ["Contenido de prueba"], evidenceRefs: ["audit"] }], evidenceRefs: ["audit"], missingInputs: ["Redaccion real pendiente"] }],
    documentPlan: checklist.flatMap((item) => (item.recommendedCategory === "mixed_bundle" ? item.detectedCategories : [item.recommendedCategory]).map((category) => ({
      title: `${item.text.slice(0, 100)} (${category})`, category, preparation: preparationForCategory(category), requirementRefs: [item.requirementRef],
      draftDocumentRefs: [documentRef], evidenceRefs: [item.evidenceRef], missingInputs: ["Datos del tenant pendientes"] }))),
    evidenceRefs: ["audit"], uncertainties: [], humanReviewRequired: true, submissionAllowed: false
  };
  const validation = validateDraftOutput(output, {}, requirements);
  const clauses = requirements.sections.requiredDocuments.length;
  totalClauses += clauses; counts.push(clauses);
  if (validation.valid && validation.documentCoverage.covered === clauses) ready += 1;
  else failures.push({ id, clauses, errors: validation.errors, coverage: validation.documentCoverage });
}

console.log(JSON.stringify({
  opportunitiesObserved: groups.size,
  opportunitiesCoreComplete: counts.length,
  documentPlanReady: ready,
  requiredDocumentClauses: totalClauses,
  minClauses: counts.length ? Math.min(...counts) : 0,
  maxClauses: counts.length ? Math.max(...counts) : 0,
  averageClauses: counts.length ? Number((totalClauses / counts.length).toFixed(1)) : 0,
  planningReadyClauses, classificationCounts, excludedPhaseCounts, blocked,
  failures
}, null, 2));
if (failures.length) process.exitCode = 1;
