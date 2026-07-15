import assert from "node:assert/strict";
import { contractForConstraints, validateDraftOutput } from "../workers/draft-agent-contract.mjs";

const constraints = { limits: [{ documentType: "memoria_tecnica", unit: "pages", value: 4, sourceUrl: "https://oficial.invalid/bases.pdf", sourcePage: 7, documentSha256: "abc" }], formatRules: [{ kind: "font_size_points", value: 11 }] };
const requirements = { sections: { requiredDocuments: [{ text: "Memoria tecnica" }, { text: "Certificado de estar al corriente" }] } };
const contract = contractForConstraints(constraints);
assert.equal(contract.hardLimits[0].maximum, 4);
assert.equal(contract.renderValidationRequired, true);
assert.equal(contract.submissionAllowed, false);
assert.equal(contract.version, "draft-output-v3");

const validShape = validateDraftOutput({
  title: "Memoria tecnica",
  documents: [{ documentRef: "draft-document:1", role: "primary_proposal", title: "Memoria tecnica", documentType: "memoria_tecnica", requirementRefs: ["required-document:1"], sections: [{ title: "Objetivo", paragraphs: ["Contenido sujeto a revision."], evidenceRefs: ["bases:p7"] }], evidenceRefs: ["bases:p7"], missingInputs: [] }],
  documentPlan: [
    { title: "Memoria tecnica", category: "generated_draft", preparation: "drafted_in_proposal", requirementRefs: ["required-document:1"], draftDocumentRefs: ["draft-document:1"], evidenceRefs: ["bases:p7"], missingInputs: [] },
    { title: "Certificado", category: "supporting_evidence", preparation: "tenant_evidence_required", requirementRefs: ["required-document:2"], draftDocumentRefs: [], evidenceRefs: ["bases:p9"], missingInputs: ["Certificado vigente"] }
  ],
  evidenceRefs: ["bases:p7"], uncertainties: ["Presupuesto pendiente"], humanReviewRequired: true, submissionAllowed: false
}, constraints, requirements);
assert.equal(validShape.valid, true);
assert.equal(validShape.validationState, "render_required");
assert.deepEqual(validShape.documentCoverage, { total: 2, covered: 2, missingRequirementRefs: [] });
assert.deepEqual(validShape.generatedDocuments, { total: 1, primary: 1 });

const unsafe = validateDraftOutput({ title: "Memoria", documents: [], documentPlan: [], evidenceRefs: [], uncertainties: [], humanReviewRequired: false, submissionAllowed: true }, constraints, requirements);
assert.equal(unsafe.valid, false);
assert.ok(unsafe.errors.length >= 4);

const wordLimit = validateDraftOutput({
  title: "Memoria", documents: [{ documentRef: "draft-document:1", role: "primary_proposal", title: "Memoria", documentType: "memoria", requirementRefs: ["required-document:1"], sections: [{ title: "Texto", paragraphs: ["uno dos tres cuatro cinco"], evidenceRefs: ["e1"] }], evidenceRefs: ["e1"], missingInputs: [] }],
  documentPlan: [{ title: "Memoria", category: "generated_draft", preparation: "drafted_in_proposal", requirementRefs: ["required-document:1"], draftDocumentRefs: ["draft-document:1"], evidenceRefs: ["e1"], missingInputs: [] }],
  evidenceRefs: ["e1"], uncertainties: [], humanReviewRequired: true, submissionAllowed: false
}, { limits: [{ unit: "words", value: 3 }] }, { sections: { requiredDocuments: [{ text: "Memoria" }] } });
assert.equal(wordLimit.valid, false);

const incomplete = validateDraftOutput({
  title: "Memoria", documents: [{ documentRef: "draft-document:1", role: "primary_proposal", title: "Memoria", documentType: "memoria_tecnica", requirementRefs: ["required-document:1"], sections: [{ title: "Texto", paragraphs: ["Contenido"], evidenceRefs: ["e1"] }], evidenceRefs: ["e1"], missingInputs: [] }],
  documentPlan: [{ title: "Memoria", category: "generated_draft", preparation: "drafted_in_proposal", requirementRefs: ["required-document:1"], draftDocumentRefs: ["draft-document:1"], evidenceRefs: ["e1"], missingInputs: [] }],
  evidenceRefs: ["e1"], uncertainties: [], humanReviewRequired: true, submissionAllowed: false
}, {}, requirements);
assert.equal(incomplete.valid, false);
assert.deepEqual(incomplete.documentCoverage.missingRequirementRefs, ["required-document:2"]);

const unsplitBundle = validateDraftOutput({
  title: "Expediente", documents: [{ documentRef: "draft-document:1", role: "primary_proposal", title: "Guia", documentType: "control", requirementRefs: ["required-document:1"], sections: [{ title: "Control", paragraphs: ["Pendiente"], evidenceRefs: ["e1"] }], evidenceRefs: ["e1"], missingInputs: [] }],
  documentPlan: [{ title: "Anexo", category: "official_form", preparation: "official_template_required", requirementRefs: ["required-document:1"], draftDocumentRefs: ["draft-document:1"], evidenceRefs: ["e1"], missingInputs: [] }],
  evidenceRefs: ["e1"], uncertainties: [], humanReviewRequired: true, submissionAllowed: false
}, {}, { sections: { requiredDocuments: [{ text: "Documentacion obligatoria: 1. Anexo I. 2. Memoria. 3. Certificado tributario." }] } });
assert.equal(unsplitBundle.valid, false);
assert.ok(unsplitBundle.errors.some((error) => error.includes("no desglosa generated_draft")));

console.log(JSON.stringify({ assertions: 15, status: "passed", documentCoverage: "required", mixedBundles: "must_split", generatedDocuments: "linked" }, null, 2));
