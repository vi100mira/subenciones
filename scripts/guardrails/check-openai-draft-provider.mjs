import assert from "node:assert/strict";
import { draftSchema, estimateCostEur, generatePublicDraft, maximumRunCostEur, publicDraftInput } from "../workers/openai-draft-provider.mjs";

const constraints = {
  draftingGate: "constraints_verified",
  limits: [{ documentType: "memoria", unit: "pages", value: 4, sourceUrl: "https://oficial.invalid/bases.pdf", sourcePage: 7 }],
  formatRules: []
};
const context = {
  title: "Convocatoria social", funderName: "Entidad pública", sourceUrl: "https://oficial.invalid/ficha",
  officialUrl: "https://oficial.invalid", basesUrl: "https://oficial.invalid/bases.pdf",
  deadlineText: "Abierta hasta el 31 de julio", criteriaText: "Impacto y viabilidad", constraints
};
const output = {
  title: "Borrador sujeto a revisión",
  sections: [{ title: "Objeto", paragraphs: ["Contenido basado en la convocatoria."], evidenceRefs: ["https://oficial.invalid/bases.pdf#page=7"] }],
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
assert.equal(result.output.submissionAllowed, false);
assert.equal(result.usage.estimated_eur, 0.0048);
assert.ok(maximumRunCostEur({ maxInputTokens: 20000, maxOutputTokens: 6000 }) < 0.1);
assert.equal(estimateCostEur({ input_tokens: 0, output_tokens: 0 }), 0);
console.log(JSON.stringify({ assertions: 9, publicOnly: true, store: false, status: "passed" }, null, 2));
