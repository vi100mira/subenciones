import assert from "node:assert/strict";
import { draftSchema, estimateCostEur, generatePublicDraft, maximumRunCostEur, publicDraftInput, requiredDocumentChecklist } from "../workers/openai-draft-provider.mjs";

const constraints = {
  draftingGate: "constraints_verified",
  limits: [{ documentType: "memoria", unit: "pages", value: 4, sourceUrl: "https://oficial.invalid/bases.pdf", sourcePage: 7 }],
  formatRules: []
};
const context = {
  title: "Convocatoria social", funderName: "Entidad publica", sourceUrl: "https://oficial.invalid/ficha",
  officialUrl: "https://oficial.invalid", basesUrl: "https://oficial.invalid/bases.pdf",
  deadlineText: "Abierta hasta el 31 de julio", criteriaText: "Impacto y viabilidad", constraints,
  requirementsContract: { sections: { requiredDocuments: [{ text: "Memoria tecnica", sourceUrl: "https://oficial.invalid/bases.pdf", sourcePage: 7, documentSha256: "abc" }] } }
};
const output = {
  title: "Borrador sujeto a revision",
  documents: [{ documentRef: "draft-document:1", role: "primary_proposal", title: "Memoria tecnica", documentType: "memoria", requirementRefs: ["required-document:1"], sections: [{ title: "Objeto", paragraphs: ["Contenido basado en la convocatoria."], evidenceRefs: ["https://oficial.invalid/bases.pdf#page=7"] }], evidenceRefs: ["https://oficial.invalid/bases.pdf#page=7"], missingInputs: [] }],
  documentPlan: [{ title: "Memoria tecnica", category: "generated_draft", preparation: "drafted_in_proposal", requirementRefs: ["required-document:1"], draftDocumentRefs: ["draft-document:1"], evidenceRefs: ["https://oficial.invalid/bases.pdf#page=7"], missingInputs: [] }],
  evidenceRefs: ["https://oficial.invalid/bases.pdf#page=7"], uncertainties: ["Faltan datos de la entidad solicitante."],
  humanReviewRequired: true, submissionAllowed: false
};
let request;
const result = await generatePublicDraft(context, {
  apiKey: "test-only", model: "gpt-5.6-luna", maxOutputTokens: 1000,
  fetchFn: async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ id: "resp_test", output: [{ content: [{ type: "output_text", text: JSON.stringify(output) }] }], usage: { input_tokens: 1000, output_tokens: 500, total_tokens: 1500 } }) };
  }
});

assert.equal(request.store, false);
assert.equal(request.text.format.strict, true);
assert.deepEqual(request.text.format.schema, draftSchema);
assert.equal(JSON.parse(request.input[1].content).dataClass, "public");
assert.equal(publicDraftInput(context).opportunity.proposalConstraints.limits[0].value, 4);
assert.equal(requiredDocumentChecklist(context)[0].requirementRef, "required-document:1");
assert.equal(publicDraftInput(context).opportunity.requiredDocumentChecklist[0].evidenceRef, "https://oficial.invalid/bases.pdf#page=7");
assert.equal(result.output.submissionAllowed, false);
assert.equal(result.output.documents[0].documentRef, "draft-document:1");
assert.equal(result.usage.estimated_eur, 0.0048);
assert.ok(maximumRunCostEur({ maxInputTokens: 20000, maxOutputTokens: 6000 }) < 0.1);
assert.equal(estimateCostEur({ input_tokens: 0, output_tokens: 0 }), 0);
const personalized = publicDraftInput({ ...context, approvedFacts: [{ id: "fact-1", fieldKey: "experience", value: "Tres programas aprobados", sourceType: "guided_interview", confidence: "high", sourceSha256: "private-hash" }] });
assert.equal(personalized.dataClass, "public_plus_internal_approved");
assert.deepEqual(personalized.entityApprovedFacts[0], { factRef: "approved-fact:fact-1", fieldKey: "experience", value: "Tres programas aprobados", sourceType: "guided_interview", confidence: "high" });
console.log(JSON.stringify({ assertions: 14, dataClasses: ["public", "internal_approved"], documentPlan: "required", documentDrafts: "required", store: false, status: "passed" }, null, 2));
