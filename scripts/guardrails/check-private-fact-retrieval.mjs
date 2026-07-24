import assert from "node:assert/strict";
import fs from "node:fs";
import { retrieveApprovedFacts } from "../../src/privateFactRetrieval.mjs";

const internal = { data_class: "internal", allowed_uses: ["matching", "drafting"], personal_data_included: false, sensitive_data_included: false };
const facts = [
  { id: "identity", field_key: "legal_name", suggested_value: "Fundación de inclusión social", source_type: "uploaded_document", confidence: "high", metadata_json: internal },
  { id: "employment", field_key: "methodology", suggested_value: "Itinerarios de inserción laboral para personas desempleadas", source_type: "uploaded_document", confidence: "high", metadata_json: internal },
  { id: "international", field_key: "alliances", suggested_value: "Cooperación internacional y ayuda humanitaria", source_type: "guided_interview", confidence: "medium", metadata_json: internal },
  { id: "public", field_key: "mission", suggested_value: "Texto de la web", source_type: "public_web", confidence: "high", metadata_json: { data_class: "public" } },
  { id: "personal", field_key: "team", suggested_value: "Nombre y salario individual", source_type: "uploaded_document", confidence: "high", metadata_json: { ...internal, personal_data_included: true } },
  { id: "not-drafting", field_key: "territory", suggested_value: "Valencia", source_type: "manual_entry", confidence: "high", metadata_json: { ...internal, allowed_uses: ["matching"] } }
];

const selected = retrieveApprovedFacts(facts, ["Programa de empleo e inclusión laboral para personas desempleadas"], 3);
assert.equal(selected[0].id, "employment");
assert.ok(selected[0].matchedTerms.includes("laboral"));
assert.ok(selected.some((fact) => fact.id === "identity"), "Los datos institucionales nucleares desaparecen del contexto");
assert.ok(!selected.some((fact) => ["public", "personal", "not-drafting"].includes(fact.id)), "La recuperación ignora clase, privacidad o uso permitido");
assert.deepEqual(selected, retrieveApprovedFacts(facts, ["Programa de empleo e inclusión laboral para personas desempleadas"], 3), "La selección no es determinista");

const api = fs.readFileSync("api/draft-agent-runs.ts", "utf8");
const worker = fs.readFileSync("scripts/workers/run-draft-agent.mjs", "utf8");
const ui = fs.readFileSync("prototype/draft-agent-ui.js", "utf8");
assert.ok(api.includes('.eq("tenant_id", tenantId)') && api.includes('mode: "approved_fact_hybrid_v1"'), "La recuperación no está acotada al tenant o no deja manifiesto");
assert.ok(api.includes("queryHash") && api.includes("facts_selected"), "La recuperación no queda auditada sin copiar el texto");
assert.ok(api.includes("approvedKnowledge") && api.includes("latestApprovedAt"), "La API no expone si el conocimiento aprobado es posterior al borrador");
assert.ok(worker.includes('.eq("tenant_id", run.tenant_id)') && worker.includes('privateRetrieval: run.input_manifest_json?.privateRetrieval'), "El worker no revalida tenant o pierde la procedencia RAG");
assert.ok(ui.includes("Conocimiento privado recuperado") && ui.includes("recuperación con 0 llamadas IA"), "La interfaz no muestra los hechos recuperados o su coste de recuperación");
assert.ok(ui.includes("usage_json?.estimated_eur") && ui.includes("Generación IA"), "La interfaz no separa el coste de recuperación y generación");
assert.ok(ui.includes("Regenerar con conocimiento aprobado") && ui.includes("sin alterar la anterior"), "La interfaz no ofrece una regeneración versionada cuando cambia el conocimiento");

console.log(JSON.stringify({ ok: true, mode: "approved_fact_hybrid_v1", externalAiCallsForRetrieval: 0, privateFactsOnly: true, deterministic: true }, null, 2));
