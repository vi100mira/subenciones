import assert from "node:assert/strict";
import { extractProposalConstraints } from "../radar/extract-proposal-constraints.mjs";

const ceoCase = extractProposalConstraints(
  "La memoria tecnica no podra superar las cuatro (4) paginas. Se presentara en Arial, 11 puntos e interlineado 1,5.",
  { sourceUrl: "https://organismo.example/bases.pdf", documentSha256: "a".repeat(64) }
);
assert.equal(ceoCase.status, "verified");
assert.equal(ceoCase.limits[0].documentType, "memoria_tecnica");
assert.equal(ceoCase.limits[0].value, 4);
assert.equal(ceoCase.limits[0].unit, "pages");
assert.equal(ceoCase.formatRules.find((item) => item.kind === "font_family")?.value.toLowerCase(), "arial");
assert.equal(ceoCase.formatRules.find((item) => item.kind === "font_size_points")?.value, 11);
assert.equal(ceoCase.requiresRenderedValidation, true);

const realObservedCase = extractProposalConstraints(
  "Documentacion acreditativa del proyecto: un documento PDF, con una extension maxima de cinco (5) paginas. Formato letra: Fuente Arial, 12 puntos.",
  { pageEvidence: [{ page: 8, text: "Documento PDF, con una extension maxima de cinco (5) paginas. Formato letra: Fuente Arial, 12 puntos." }] }
);
assert.equal(realObservedCase.limits[0].value, 5);
assert.equal(realObservedCase.limits[0].sourcePage, 8);
assert.equal(realObservedCase.limits[0].documentType, "propuesta_proyecto");

const noLimit = extractProposalConstraints("Las bases completas tienen veinte paginas y describen la memoria tecnica.");
assert.equal(noLimit.status, "not_found_requires_review");
assert.equal(noLimit.draftingGate, "blocked_pending_constraint_review");
assert.equal(noLimit.limits.length, 0);

console.log(JSON.stringify({ assertions: 14, status: "passed" }, null, 2));
