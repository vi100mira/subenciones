import assert from "node:assert/strict";
import { contractForConstraints, validateDraftOutput } from "../workers/draft-agent-contract.mjs";

const constraints = { limits: [{ documentType: "memoria_tecnica", unit: "pages", value: 4, sourceUrl: "https://oficial.invalid/bases.pdf", sourcePage: 7, documentSha256: "abc" }], formatRules: [{ kind: "font_size_points", value: 11 }] };
const contract = contractForConstraints(constraints);
assert.equal(contract.hardLimits[0].maximum, 4);
assert.equal(contract.renderValidationRequired, true);
assert.equal(contract.submissionAllowed, false);

const validShape = validateDraftOutput({
  title: "Memoria técnica",
  sections: [{ title: "Objetivo", paragraphs: ["Contenido sujeto a revisión."], evidenceRefs: ["bases:p7"] }],
  evidenceRefs: ["bases:p7"], uncertainties: ["Presupuesto pendiente"], humanReviewRequired: true, submissionAllowed: false
}, constraints);
assert.equal(validShape.valid, true);
assert.equal(validShape.validationState, "render_required");

const unsafe = validateDraftOutput({ title: "Memoria", sections: [], evidenceRefs: [], uncertainties: [], humanReviewRequired: false, submissionAllowed: true }, constraints);
assert.equal(unsafe.valid, false);
assert.ok(unsafe.errors.length >= 4);

const wordLimit = validateDraftOutput({
  title: "Memoria", sections: [{ title: "Texto", paragraphs: ["uno dos tres cuatro cinco"], evidenceRefs: ["e1"] }],
  evidenceRefs: ["e1"], uncertainties: [], humanReviewRequired: true, submissionAllowed: false
}, { limits: [{ unit: "words", value: 3 }] });
assert.equal(wordLimit.valid, false);
console.log(JSON.stringify({ assertions: 8, status: "passed" }, null, 2));
