import assert from "node:assert/strict";

globalThis.window = {
  CredentialsAuth: { getSession: () => ({ label: "Entidad de prueba" }) }
};
await import(`../../prototype/constructed-document-prefill.js?guard=${Date.now()}`);

const engine = globalThis.window.ConstructedDocumentPrefill;
const pack = {
  title: "Convocatoria social",
  source: "Fuente oficial",
  territory: "España",
  deadline: "30/09/2026",
  fit: ["Existe una necesidad territorial documentada."],
  risks: ["Debe validarse la cofinanciación."],
  requirementsContract: { sections: {
    beneficiaries: [{ text: "Entidades sociales sin ánimo de lucro.", sourceUrl: "https://oficial.test/bases.pdf", sourcePage: 4 }],
    eligibleActivities: [{ text: "Itinerarios de inclusión.", sourceUrl: "https://oficial.test/bases.pdf", sourcePage: 8 }],
    evaluationCriteria: [{ text: "Impacto medible.", sourceUrl: "https://oficial.test/bases.pdf", sourcePage: 12 }],
    budgetRules: [{ text: "Máximo 80.000 euros.", sourceUrl: "https://oficial.test/bases.pdf", sourcePage: 15 }],
    obligations: [{ text: "Mantener trazabilidad.", sourceUrl: "https://oficial.test/bases.pdf", sourcePage: 20 }]
  } },
  documentRequirements: [{ text: "Memoria técnica", requirementRef: "required-document:memory" }]
};
const doc = {
  title: "Memoria técnica",
  requirementRef: "required-document:memory",
  requirement: "Memoria técnica del proyecto",
  sections: ["Diagnóstico y necesidad", "Objetivos", "Personas destinatarias", "Equipo y alianzas", "Presupuesto y sostenibilidad"],
  classification: { recommendedCategory: "generated_draft" }
};
const generated = {
  documents: [{
    documentRef: "draft:memory",
    requirementRefs: ["required-document:memory"],
    title: "Documento sin palabras coincidentes",
    sections: [{ title: "Equipo", paragraphs: ["Equipo agregado aprobado."], evidenceRefs: ["tenant-fact:team"] }]
  }]
};

const matched = engine.matchGeneratedDocument(doc, generated);
assert.equal(matched.documentRef, "draft:memory", "La memoria no se vincula por requirementRef");
const sections = engine.sections(doc, pack, matched);
assert.equal(sections.length, 5);
assert.equal(sections.find((item) => item.title === "Equipo y alianzas").state, "proposed");
assert.equal(sections.find((item) => item.title === "Personas destinatarias").state, "verified");
assert.equal(sections.find((item) => item.title === "Presupuesto y sostenibilidad").state, "verified");
assert(sections.every((item) => item.evidence.length || item.questions.length), "Un apartado carece de evidencia o pregunta accionable");
const summary = engine.summary(sections);
assert.equal(summary.total, 5);
assert.equal(summary.missing, 0);

console.log(JSON.stringify({ ok: true, contract: "generic-technical-memory-v1", coverage: summary }, null, 2));
