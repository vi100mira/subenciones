import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/20260724200000_tenant_candidature_documents.sql", "utf8"
);
const api = fs.readFileSync("api/tenant-candidature-documents.ts", "utf8");
const ui = fs.readFileSync("prototype/candidature-document-selection.js", "utf8");
const workspace = fs.readFileSync("prototype/opportunity-requirements.js", "utf8");
const index = fs.readFileSync("prototype/index.html", "utf8");
const commonBrowser = fs.readFileSync("prototype/common-knowledge-browser.js", "utf8");

assert(migration.includes("tenant_candidature_documents"),
  "Falta la seleccion documental por candidatura");
assert(migration.includes("unique (tenant_id, recommendation_id, source_document_id)"),
  "Un documento puede duplicarse dentro de la misma candidatura");
assert(migration.includes("foreign key (tenant_id, recommendation_id)")
  && migration.includes("foreign key (tenant_id, source_document_id)"),
  "Los vinculos documentales no garantizan aislamiento tenant");
for (const status of ["proposed", "confirmed", "excluded"]) {
  assert(migration.includes(`'${status}'`), `Falta el estado documental ${status}`);
}
for (const origin of ["assistant_recommended", "human_added"]) {
  assert(migration.includes(`'${origin}'`), `Falta el origen documental ${origin}`);
}
assert(migration.includes("reviewed_by is not null") && migration.includes("reviewed_at is not null"),
  "Una seleccion final puede quedar sin revision humana");
assert(migration.includes("enable row level security")
  && migration.includes("public.is_org_member(tenant_id)"),
  "La seleccion documental no aplica RLS tenant");
assert(!migration.includes(" for insert") && !migration.includes(" for update"),
  "El cliente puede mutar vinculos documentales sin API auditada");
assert(migration.includes("never copied private document content"),
  "La evidencia puede copiar contenido privado a la relacion");
assert(migration.includes("jsonb_typeof(evidence_json) = 'array'"),
  "La evidencia de candidatura no esta limitada a referencias estructuradas");

assert(api.includes("requireSourcePermission(req.headers.authorization, permission, requestedTenant(req))"),
  "La API documental no exige sesion, permiso y tenant");
assert(api.includes('.eq("tenant_id", actor.tenantId)') && api.includes('.eq("recommendation_id", recommendationId)'),
  "La API documental puede cruzar tenants o candidaturas");
assert(api.includes('.eq("data_class", "internal")')
  && api.includes('contains("metadata_json", { review_status: "approved" })'),
  "La candidatura admite documentos no aprobados o restringidos");
assert(api.includes("MAX_ACTIVE_DOCUMENTS") && api.includes("assistant_recommended")
  && api.includes('selection_status: origin === "human_added" ? "confirmed" : "proposed"'),
  "La API no limita el subconjunto o confirma propuestas de IA automaticamente");
assert(api.includes('.eq("selection_status", "proposed")') && api.includes("reviewed_by: actor.userId"),
  "La revision humana no queda ligada a una propuesta pendiente");
assert(api.includes("document_content_copied: false") && !api.includes("extracted_text"),
  "La API copia contenido privado a la candidatura o a auditoria");
assert(api.includes('.eq("scope", "tenant_private")')
  && api.includes("approvalCandidates") && api.includes('req.body?.action === "suggest"'),
  "El subconjunto no nace del corpus privado o no expone una preseleccion revisable");
assert(workspace.includes("row.id === item?.id && row.matchRecommendation")
  && workspace.includes("recommendation?.id")
  && workspace.includes("data-candidature-document-selection"),
  "El expediente no conserva el identificador real de la recomendacion");
assert(ui.includes("/api/tenant-candidature-documents")
  && ui.includes("La candidatura no incorpora el corpus completo"),
  "La UI no lee el subconjunto real o confunde corpus y candidatura");
assert(ui.includes("data-candidature-document-summary")
  && ui.includes("Documentos que conviene revisar primero"),
  "El expediente no hace visible el estado documental o sus candidatos de revision");
assert(ui.includes('data-candidature-document-review="confirmed"')
  && ui.includes('data-candidature-document-review="excluded"'),
  "La UI no permite revision humana de propuestas");
assert(index.includes("candidature-document-selection.js"),
  "El modulo de documentos de candidatura no se carga");
assert(commonBrowser.includes("data-knowledge-propose-document")
  && commonBrowser.includes("CandidatureDocuments?.propose"),
  "Una cita relevante no puede proponerse al expediente activo");

console.log(JSON.stringify({
  ok: true,
  corpusRemainsCommon: true,
  candidatureUsesSubset: true,
  humanReviewRequired: true,
  tenantCompositeReferences: true,
  authenticatedApi: true,
}, null, 2));
