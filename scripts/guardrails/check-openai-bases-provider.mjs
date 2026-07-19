import assert from "node:assert/strict";
import fs from "node:fs";
import { basesSchema, interpretPublicBases, publicBasesInput, verifyBasesCitations } from "../workers/openai-bases-provider.mjs";
import { aiContract, selectInterpretationPages } from "../workers/run-bases-interpreter.mjs";

const pages = [{ page: 4, text: "Podran ser beneficiarias las asociaciones sin animo de lucro inscritas en el registro correspondiente. La memoria tecnica no podra superar 10 paginas y se presentara en formato PDF." }];
const sections = Object.fromEntries(Object.keys(basesSchema.properties.sections.properties).map((key) => [key, []]));
sections.beneficiaries.push({
  text: "Asociaciones sin animo de lucro inscritas.", sourcePage: 4,
  evidenceQuote: "Podran ser beneficiarias las asociaciones sin animo de lucro inscritas en el registro correspondiente.", confidence: "high"
});
const output = { sections, proposalConstraints: {
  limits: [{ documentType: "memoria_tecnica", kind: "maximum", value: 10, unit: "pages", sourcePage: 4, evidenceQuote: "La memoria tecnica no podra superar 10 paginas", confidence: "high" }],
  formatRules: [{ kind: "file_format", value: "PDF", sourcePage: 4, evidenceQuote: "La memoria tecnica no podra superar 10 paginas y se presentara en formato PDF", confidence: "high" }]
}, uncertainties: ["No se aportan datos de la entidad solicitante."], humanReviewRequired: true };
let request;
const result = await interpretPublicBases({ sourceUrl: "https://oficial.example/bases.pdf", documentSha256: "c".repeat(64), pages }, {
  apiKey: "test-only", model: "gpt-5.6-luna", maxOutputTokens: 1000,
  fetchFn: async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ id: "resp_bases", output: [{ content: [{ type: "output_text", text: JSON.stringify(output) }] }], usage: { input_tokens: 500, output_tokens: 200, total_tokens: 700 } }) };
  }
});

assert.equal(request.store, false);
assert.equal(request.text.format.strict, true);
assert.deepEqual(request.text.format.schema, basesSchema);
assert.equal(JSON.parse(request.input[1].content).dataClass, "public");
assert.equal(publicBasesInput({ pages }).pages[0].page, 4);
assert.equal(result.citationValidation.valid, true);
assert.equal(result.output.humanReviewRequired, true);
assert.equal(result.output.proposalConstraints.limits[0].value, 10);
assert.equal(verifyBasesCitations({ ...output, sections: { ...sections, beneficiaries: [{ ...sections.beneficiaries[0], evidenceQuote: "Texto inventado que no existe en la pagina." }] } }, pages).valid, false);
await assert.rejects(() => interpretPublicBases({ sourceUrl: "https://oficial.example/bases.pdf", documentSha256: "d".repeat(64), pages }, {
  apiKey: "test-only", model: "gpt-5.6-luna", maxOutputTokens: 1000,
  fetchFn: async () => ({ ok: true, json: async () => ({ id: "resp_invalid", output: [{ content: [{ type: "output_text", text: JSON.stringify({ ...output, sections: { ...sections, beneficiaries: [{ ...sections.beneficiaries[0], evidenceQuote: "Texto inventado que no existe en la pagina." }] } }) }] }], usage: { input_tokens: 500, output_tokens: 200, total_tokens: 700 } }) })
}), (error) => error.responseId === "resp_invalid" && error.usage?.total_tokens === 700);
const normalizedAi = aiContract(output, { sourceUrl: "https://oficial.example/bases.pdf", documentSha256: "c".repeat(64) });
assert.equal(normalizedAi.sections.beneficiaries[0].coreEvidence, true);

const migration = fs.readFileSync("supabase/migrations/20260714170000_platform_bases_interpretations.sql", "utf8");
assert(migration.includes("platform_source_artifacts") && migration.includes("platform_bases_interpretations"));
assert(migration.includes("citations_verified") && migration.includes("review_required"));
assert(!migration.includes("tenant_id"), "Los artefactos publicos no deben duplicarse por tenant");
const selected = selectInterpretationPages([{ page: 1, text: "Indice" }, { page: 9, text: "Criterios de valoracion y documentacion obligatoria" }], {});
assert.equal(selected[0].page, 9);

console.log(JSON.stringify({ assertions: 15, publicOnly: true, citations: "verified", rejectedUsage: "accounted", status: "passed" }, null, 2));
