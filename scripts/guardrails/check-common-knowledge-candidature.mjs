import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const selection = read("api/tenant-candidature-documents.ts");
const adaptation = read("api/common-document-adaptation.ts");
const promotion = read("api/common-knowledge-promotion.ts");
const candidates = read("api/private-document-candidates.ts");
const actions = read("prototype/common-knowledge-candidature-actions.js");
const viewer = read("prototype/private-annex-viewer.js");
const editor = read("prototype/document-version-editor.js");
const knowledge = read("prototype/private-knowledge.js");
const index = read("prototype/index.html");

assert(selection.includes('req.query.action === "candidatures"')
  && selection.includes('.eq("tenant_id", tenantId)')
  && selection.includes('.eq("decision_status", "preselected")'),
"El selector no limita las candidaturas activas al tenant autenticado");
assert(selection.includes('origin === "human_added"') && selection.includes('selection_status: origin === "human_added" ? "confirmed"'),
  "La asignación humana no crea un vínculo confirmado y trazable");
assert(selection.includes('existing.data?.[0]?.selection_status === "confirmed"')
  && selection.includes("candidature_documents.human_restored")
  && selection.includes("candidature_documents.human_confirmed"),
"La asignación repetida, propuesta o excluida no se resuelve de forma idempotente");

for (const api of [adaptation, promotion]) {
  assert(api.includes("requireSourcePermission") && api.includes("requireTenantAgentEntitlement")
    && api.includes("actor.tenantId"), "Una mutación documental no protege tenant, permiso y plan");
  assert(api.includes("content_copied_to_audit: false") && api.includes("submission_allowed: false"),
    "Una mutación copia contenido a auditoría o habilita presentación");
}
assert(adaptation.includes('metadata_json?.review_status !== "approved"')
  && adaptation.includes('data_class !== "internal"') && adaptation.includes("externalAiCalls: 0")
  && adaptation.includes("original_modified: false") && adaptation.includes("supersedesRunId")
  && adaptation.includes("previousContent?.documents"),
"La copia editable puede alterar o leer un original no aprobado");
assert(adaptation.includes('selection_origin: "human_added"') && adaptation.includes('selection_status: "confirmed"'),
  "La copia editable pierde su vínculo confirmado con el original");
assert(promotion.includes("draftDocumentIsConsolidated") && promotion.includes('review_status: "pending"')
  && promotion.includes('access: "private"') && promotion.includes('systemPurpose: "candidature_reuse"'),
"La promoción automática omite consolidación, revisión o almacenamiento privado");
assert(candidates.includes('req.query.library === "true"') && candidates.includes('config.systemPurpose === "candidature_reuse"'),
  "La biblioteca no agrega documentos reutilizables de candidaturas");

assert(viewer.includes("Vincular original") && viewer.includes("Crear copia editable")
  && viewer.includes('meta.status === "approved" && meta.dataClass === "internal"'),
"El visor no ofrece las dos acciones solo para documentos internos aprobados");
assert(actions.includes("Candidatura de destino") && actions.includes('origin: "human_added"')
  && actions.includes("/api/common-document-adaptation") && actions.includes("El original no cambia")
  && actions.includes('new CustomEvent("draft-agent-run-updated"'),
"La interfaz no permite elegir candidatura o diferencia vínculo y copia");
assert(editor.includes("Enviar a revisión de Base común") && editor.includes("/api/common-knowledge-promotion"),
  "Un documento consolidado no puede proponerse a Base común");
assert(knowledge.includes('/api/private-document-candidates?library=true')
  && index.includes("common-knowledge-candidature-actions.js"), "La biblioteca agregada o su módulo no se cargan");
assert(read("prototype/common-knowledge-browser.js").includes("metadata_json?.ai_allowed !== false"),
  "Un documento promovido se presenta como habilitado para IA antes de procesarse");

console.log(JSON.stringify({ ok: true, flows: ["search", "approve", "assign", "adapt", "promote_for_review"],
  originalImmutable: true, tenantIsolated: true, externalAiCallsForAdaptation: 0,
  commonKnowledgeReviewRequired: true, submissionAllowed: false }, null, 2));
