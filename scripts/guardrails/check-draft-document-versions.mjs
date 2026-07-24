import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";
import { pathToFileURL } from "node:url";
import path from "node:path";

const source = await fs.readFile("src/draftDocumentVersion.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const modulePath = path.resolve(".tmp/draft-document-version.mjs");
await fs.mkdir(path.dirname(modulePath), { recursive: true });
await fs.copyFile("src/canonicalJson.mjs", path.resolve(".tmp/canonicalJson.mjs"));
await fs.writeFile(modulePath, compiled);
const { applyDraftEdits, draftContentHash, isEditableDraft } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);

const base = {
  title: "Memoria", humanReviewRequired: true, submissionAllowed: false,
  evidenceRefs: ["bases:p7"], uncertainties: [], documentPlan: [],
  documents: [{ documentRef: "document:1", title: "Memoria técnica", role: "primary_proposal",
    requirementRefs: ["requirement:1"], evidenceRefs: ["bases:p7"], missingInputs: [],
    sections: [{ title: "Objetivos", paragraphs: ["Texto de IA"], evidenceRefs: ["bases:p7"] }] }]
};
assert.equal(isEditableDraft(base), true);
const edited = applyDraftEdits(base, [{ documentRef: "document:1", sections: [
  { title: "Objetivos", paragraphs: ["Texto corregido por Novaterra"] }
] }], "user-1", "2026-07-22T12:00:00Z");
assert.equal(edited.documents[0].sections[0].paragraphs[0], "Texto corregido por Novaterra");
assert.deepEqual(edited.documents[0].sections[0].evidenceRefs, ["bases:p7"]);
assert.deepEqual(edited.documents[0].requirementRefs, ["requirement:1"]);
assert.equal(edited.documents[0].sections[0].editProvenance.mode, "human_edit");
assert.equal(edited.submissionAllowed, false);
assert.match(draftContentHash(edited), /^[a-f0-9]{64}$/);
assert.equal(draftContentHash({ b: { y: 2, x: 1 }, a: 0 }),
  draftContentHash({ a: 0, b: { x: 1, y: 2 } }), "El hash cambia por el orden no semántico de jsonb");
assert.throws(() => applyDraftEdits(base, [{ documentRef: "document:1", sections: [
  { title: "Objetivos", paragraphs: [] }
] }], "user-1", "2026-07-22T12:00:00Z"), /no puede quedar vacío/);

const [migration, api, exportApi, reviewApi, editor, viewer, index] = await Promise.all([
  fs.readFile("supabase/migrations/20260722200000_tenant_draft_versions.sql", "utf8"),
  fs.readFile("api/draft-document-versions.ts", "utf8"),
  fs.readFile("api/approved-draft-document.ts", "utf8"),
  fs.readFile("api/draft-agent-runs.ts", "utf8"),
  fs.readFile("prototype/document-version-editor.js", "utf8"),
  fs.readFile("prototype/opportunity-requirements.js", "utf8"),
  fs.readFile("prototype/index.html", "utf8")
]);
assert(migration.includes("tenant_draft_versions") && migration.includes("unique (tenant_id, agent_run_id, version_number)"), "El historial no es tenant-scoped o versionado");
assert(!/tenant_draft_versions for (insert|update|delete|all)/.test(migration), "El cliente puede eludir la API de versiones");
assert(migration.includes('drop policy if exists "admins can review tenant drafts"'), "La política heredada permite decidir una revisión sin versión ni auditoría");
assert(api.includes("draft_document.version_created") && api.includes("draft_document.${action}"), "Crear y decidir versiones no queda auditado");
assert(api.includes("content_hash") && api.includes("submission_allowed: false") && api.includes("docx_blob_path: null"), "La nueva versión no invalida exportaciones previas");
assert(exportApi.includes("review.draft_version_id") && exportApi.includes("tenant_draft_versions") && exportApi.includes("version.data.content_hash !== draftContentHash"), "La exportación no usa o verifica la versión aprobada");
assert(reviewApi.includes("Este borrador tiene versiones humanas"), "La aprobación antigua puede saltarse el editor versionado");
assert(editor.includes("Guardar nueva versión") && editor.includes("Historial de versiones") && editor.includes("Aprobar esta versión"), "El editor no ofrece evolución y revisión humana");
assert(viewer.includes("data-document-version-edit") && index.includes("document-version-editor.js"), "El visor no abre el editor versionado");

console.log(JSON.stringify({ assertions: 19, editable: "paragraphs_only", immutableVersions: true,
  provenancePreserved: true, approvalHash: "version_scoped", submissionAllowed: false, status: "passed" }, null, 2));
