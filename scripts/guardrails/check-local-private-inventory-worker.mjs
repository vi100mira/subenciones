import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync("scripts/workers/run-local-private-inventory.mjs", "utf8");
const backfill = fs.readFileSync("scripts/workers/backfill-private-document-candidates.mjs", "utf8");
const inventory = fs.readFileSync("scripts/private-corpus/inventory_document_templates.py", "utf8");
const quarantine = fs.readFileSync("scripts/private-corpus/build_quarantine_index.py", "utf8");
const preparation = fs.readFileSync("prototype/private-knowledge.js", "utf8");
const sourceMap = fs.readFileSync("docs/product/source-map.md", "utf8");

for (const contract of [
  '.eq("tenant_id", tenantId)',
  '.eq("source_connection_id", sourceId)',
  'source.kind !== "local_simulation"',
  'source.scope !== "tenant_private"',
  'scope.readOnly !== true',
  'scope.externalTransfer !== false',
  'scope.includePersonalData !== false',
  'scope.includeSensitiveData !== false',
  'source.config_json?.preflight?.status',
  'external_ai_calls !== 0',
  'contentStoredRemotely: false',
  'private_ingestion.started',
  'private_ingestion.completed',
  'private_ingestion.failed',
  'fs.rm(result.root, { recursive: true, force: true })'
]) assert.ok(worker.includes(contract), `Falta el contrato del puente local: ${contract}`);

assert.ok(worker.includes('source_type: "uploaded_document"'), "Las propuestas locales no conservan su procedencia privada");
assert.ok(worker.includes('data_class: "internal"'), "Las propuestas locales no se clasifican como internas");
assert.ok(worker.includes('.from("source_documents").upsert(documentRows') && worker.includes("content_stored_remotely: false"), "El inventario no publica metadatos mínimos para la revisión documental");
assert.ok(worker.includes("path.basename(item.relative_path)") && worker.includes("path: `private://${sourceId}/${item.document_id}`"), "El inventario expone rutas locales o no conserva un título revisable");
assert.ok(worker.includes("previousReviews") && worker.includes('metadata_json?.review_status'), "Una nueva lectura pierde decisiones humanas de documentos sin cambios");
assert.ok(worker.includes('".jpg": "image/jpeg"') && inventory.includes('".jpg", ".jpeg", ".png"'), "Las imágenes completas no llegan a la revisión documental");
assert.ok(backfill.includes('run.status !== "completed"') && backfill.includes("content_copied: false"), "El backfill no valida la ejecución o copia contenido");
assert.ok(backfill.includes("reviews.get(externalId)") && backfill.includes('"private_document_candidates.backfilled"'), "El backfill pierde decisiones o no queda auditado");
assert.ok(!/openai|anthropic|gemini/i.test(worker), "El inventario local incorpora un proveedor de IA");
assert.ok(worker.includes("build_quarantine_index.py") && worker.includes('status: "prepared_pending_review"'), "El puente no prepara el índice privado en cuarentena");
assert.ok(quarantine.includes("write_source_manifest") && quarantine.includes('"content_stored_remotely": False'),
  "El inventario no conserva el mapa local necesario para abrir originales sin reelección");
for (const contract of ["local_only", "human_approval_required", "review_status = 'quarantined'", "active = 0", 'embedding_state": "not_started"']) {
  assert.ok(quarantine.includes(contract), `Falta el contrato de cuarentena: ${contract}`);
}
assert.ok(!/openai|anthropic|gemini/i.test(quarantine), "El índice en cuarentena incorpora un proveedor externo");
assert.ok(preparation.includes("Revisar propuestas") && preparation.includes("data-private-update-analysis"), "La UI no separa revisión y nueva ejecución");
assert.ok(sourceMap.includes("cero llamadas de IA") && sourceMap.includes("no requiere pulsar de nuevo"), "La documentación no explica el coste y la ejecución única");

console.log(JSON.stringify({ ok: true, tenantScoped: true, localOnly: true, externalAiCalls: 0, auditLifecycle: true }, null, 2));
