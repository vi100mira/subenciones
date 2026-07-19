import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.window = {};
await import(`../../prototype/private-analysis-state.js?check=${Date.now()}`);
const state = window.PrivateAnalysisState;
const at = "2026-07-18T10:30:00.000Z";

assert.equal(state.view({}).actionLabel, "Abrir preparación documental");
assert.equal(state.view({ privateIngestionRuns: [{ status: "queued", created_at: at }] }).active, true);
assert.equal(state.view({ privateIngestionRuns: [{ status: "running", started_at: at }] }).actionLabel, "Ver análisis en curso");
const completedRun = { id: "run-1", source_connection_id: "source-1", status: "completed", scanned: 350, inserted: 11, finished_at: at };
const completed = state.view({
  privateIngestionRuns: [completedRun],
  privateSources: [{ id: "source-1", config_json: { lastInventory: { runId: "run-1", proposalCount: 11, externalAiCalls: 0,
    quarantineIndex: { chunks: 148, status: "prepared_pending_review", embeddingState: "not_started" } } } }]
});
assert.equal(completed.title, "Último análisis documental");
assert.equal(completed.actionLabel, "Revisar o actualizar análisis");
assert.match(completed.detail, /350 documentos revisados/);
assert.match(completed.detail, /11 propuestas/);
assert.match(completed.detail, /148 fragmentos preparados en cuarentena/);
assert.match(completed.detail, /no se ha iniciado/);
assert.match(completed.detail, /0 llamadas IA \(coste IA 0 €\)/);
assert.equal(state.view({ privateIngestionRuns: [{ status: "failed", error: "Prueba", finished_at: at }] }).actionLabel, "Reintentar preparación documental");

const governance = fs.readFileSync("api/tenant-agent-governance.ts", "utf8");
const ingestion = fs.readFileSync("api/ingestion-dispatch.ts", "utf8");
const agentUi = fs.readFileSync("prototype/tenant-agent-runtime.js", "utf8");
const preparationUi = fs.readFileSync("prototype/private-knowledge.js", "utf8");
assert.ok(governance.includes("privateIngestionRuns") && governance.includes('eq("tenant_id", actor.tenantId)'), "El historial no está acotado por tenant");
assert.ok(ingestion.includes('["queued", "running"]') && ingestion.includes("Ya existe un análisis documental"), "La cola admite ejecuciones privadas duplicadas");
assert.ok(agentUi.includes("tenant-document-analysis-status") && agentUi.includes("analysis?.actionLabel"), "La tarjeta no deriva el texto del historial");
assert.ok(preparationUi.includes("analysis?.active") && preparationUi.includes("analysis.detail"), "El modal no comparte el estado de la tarjeta");
assert.ok(preparationUi.includes('analysis?.run?.status === "completed"') && preparationUi.includes("Gestionar conocimiento"), "Una ejecución completada no abre la gestión del conocimiento");
for (const expected of ["Estado y uso del conocimiento", "No necesitas entender cómo funciona el RAG", "Archivo histórico", "no se consultan al redactar"]) {
  assert.ok(preparationUi.includes(expected), `La gestión de conocimiento no explica: ${expected}`);
}
assert.ok(preparationUi.includes("data-private-update-analysis"), "No existe una acción voluntaria separada para actualizar el análisis");

console.log(JSON.stringify({ ok: true, states: ["not_started", "queued", "running", "completed", "failed"], tenantScoped: true, duplicateActiveRunBlocked: true }, null, 2));
