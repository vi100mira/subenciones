import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import JSZip from "jszip";

const [ui, api, migration] = await Promise.all([
  fs.readFile("prototype/opportunity-requirements.js", "utf8"),
  fs.readFile("api/candidature-project-folder.ts", "utf8"),
  fs.readFile("supabase/migrations/20260726120000_tenant_candidature_working_exports.sql", "utf8")
]);
assert(ui.includes('["project-folder", "Checklist · Carpeta de proyecto"') && !ui.includes('["draft", "Borrador Word"'),
  "El mapa no queda reducido a los dos espacios de preparación");
assert(ui.includes('panel("documents"') && ui.includes("draftActionButtons(pack)") && ui.includes('data-project-folder'),
  "La generación no vive en Documentos o falta la carpeta persistente");
assert(api.includes('eq("tenant_id", tenantId)') && api.includes('requireSourcePermission') && api.includes('requireTenantAgentEntitlement'),
  "La carpeta o sus descargas no están aisladas por tenant y plan");
assert(api.includes('requestedFile?.kind !== "tenant"'), "Un tenant sin agente no puede recuperar un original histórico propio");
assert(api.includes("acknowledgeWorkingCopy") && api.includes("candidature_project.working_exported")
  && api.includes("submission_allowed: false"), "La descarga de trabajo no exige revisión o pierde auditoría");
assert(api.includes('contains("detail_json", { recommendation_id: recommendationId })')
  && api.includes("missingWorkingExportTable(exportRow.error)"), "La migración pendiente bloquea el flujo local en vez de usar auditoría compatible");
assert(migration.includes("tenant_candidature_working_exports") && migration.includes("is_org_member(tenant_id)"),
  "Falta persistencia tenant-scoped de las revisiones de trabajo");

const outputDir = path.resolve(".tmp/candidature-project-folder");
await fs.mkdir(outputDir, { recursive: true });
async function compile(sourcePath, outputName) {
  const source = await fs.readFile(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  await fs.writeFile(path.join(outputDir, outputName), compiled);
}
await Promise.all([
  compile("src/candidatureDocx.ts", "candidatureDocx.js"),
  compile("src/draftDocumentVersion.ts", "draftDocumentVersion.js"),
  compile("src/candidatureProjectFolder.ts", "candidatureProjectFolder.js"),
  compile("src/candidatureWorkingPackage.ts", "candidatureWorkingPackage.js"),
  fs.copyFile("src/canonicalJson.mjs", path.join(outputDir, "canonicalJson.mjs"))
]);
const { buildProjectFolder } = await import(`${pathToFileURL(path.join(outputDir, "candidatureProjectFolder.js")).href}?v=${Date.now()}`);
const output = {
  title: "Proyecto social 2026", humanReviewRequired: true, submissionAllowed: false, evidenceRefs: ["bases:p7"], uncertainties: [],
  documents: [{ documentRef: "draft:1", role: "primary_proposal", title: "Memoria técnica", documentType: "memoria",
    requirementRefs: ["req:1"], evidenceRefs: ["bases:p7"], missingInputs: [], sections: [{ title: "Objetivos", paragraphs: ["Contenido revisable"], evidenceRefs: ["bases:p7"] }] }],
  documentPlan: [
    { title: "Memoria técnica", category: "generated_draft", preparation: "drafted_in_proposal", requirementRefs: ["req:1"], evidenceRefs: ["bases:p7"], missingInputs: [], draftDocumentRefs: ["draft:1"] },
    { title: "Certificado vigente", category: "supporting_evidence", preparation: "tenant_evidence_required", requirementRefs: ["req:2"], evidenceRefs: ["bases:p9"], missingInputs: ["Aportar certificado"], draftDocumentRefs: [] }
  ]
};
const baseInput = { recommendationId: "rec:1", canonicalKey: "call:1", run: { id: "run:1", output_json: output, created_at: "2026-07-26T09:00:00Z" },
  review: null, draftVersion: null, workingExports: [], selections: [{ id: "selection:1", selection_status: "confirmed", updated_at: "2026-07-26T10:00:00Z",
    document: { id: "doc:1", title: "Estatutos.pdf", mime_type: "application/pdf", data_class: "internal", source_connection_id: "source:1", source_sha256: "a".repeat(64), stored: true } }] };
const folder = buildProjectFolder(baseInput);
assert.equal(folder.checks.length, 3, "No se combinan plan documental y evidencia del tenant");
assert.equal(folder.summary.totalFiles, 2, "El contador no representa los ficheros reales");
const classified = buildProjectFolder({ ...baseInput, selections: [{ ...baseInput.selections[0], evidence_json: ["req:2"] }] });
assert.equal(classified.checks.length, 2, "Un anexo con referencia de requisito no entra en su check");
assert(classified.checks.find((check) => check.requirementRefs.includes("req:2"))?.files.some((file) => file.kind === "tenant"),
  "El check no muestra sus n ficheros de distintas procedencias");
const reviewed = buildProjectFolder({ ...baseInput, workingExports: [{ scope: "all", scope_ref: "all", snapshot_hash: folder.snapshotHash }] });
assert(reviewed.checks.some((check) => check.status === "reviewed_for_work"), "La revisión de trabajo no persiste para el snapshot vigente");
const changed = buildProjectFolder({ ...baseInput, draftVersion: { id: "version:2", version_number: 2, content_json: { ...output, title: "Proyecto editado" }, created_at: "2026-07-26T11:00:00Z" },
  workingExports: [{ scope: "all", scope_ref: "all", snapshot_hash: folder.snapshotHash }] });
assert.notEqual(changed.snapshotHash, folder.snapshotHash, "Una versión nueva no invalida la revisión de trabajo anterior");
const consolidatedOutput = { ...output, documents: output.documents.map((document) => ({ ...document,
  consolidation: { status: "consolidated", reviewedBy: "user:1", reviewedAt: "2026-07-26T11:30:00Z", documentHash: "d".repeat(64) } })) };
const consolidatedFolder = buildProjectFolder({ ...baseInput, draftVersion: { id: "version:3", version_number: 3,
  content_json: consolidatedOutput, created_at: "2026-07-26T11:30:00Z" } });
assert.equal(consolidatedFolder.checks.flatMap((check) => check.files).find((file) => file.id === "draft:1")?.status, "final_approved",
  "Cerrar un documento no lo muestra consolidado en la carpeta");
assert.equal(consolidatedFolder.summary.consolidatedFiles, 1, "El progreso no cuenta documentos consolidados");
const partialOutput = { ...consolidatedOutput,
  documents: [...consolidatedOutput.documents, { ...output.documents[0], documentRef: "draft:2", title: "Anexo narrativo" }],
  documentPlan: [{ ...output.documentPlan[0], draftDocumentRefs: ["draft:1", "draft:2"] }, output.documentPlan[1]] };
const partialFolder = buildProjectFolder({ ...baseInput, draftVersion: { id: "version:4", version_number: 4,
  content_json: partialOutput, created_at: "2026-07-26T11:45:00Z" } });
assert.equal(partialFolder.summary.consolidatedFiles, 1, "El cierre parcial no se conserva al añadir el siguiente documento");
assert.equal(partialFolder.checks[0].status, "in_progress", "Un documento consolidado cierra por error todo el check");

const { buildWorkingDownload } = await import(`${pathToFileURL(path.join(outputDir, "candidatureWorkingPackage.js")).href}?v=${Date.now()}`);
const download = await buildWorkingDownload({ title: output.title, opportunityTitle: "Convocatoria de prueba", tenantName: "Entidad de prueba",
  documents: output.documents, documentPlan: output.documentPlan, evidenceRefs: output.evidenceRefs, uncertainties: [], reviewedAt: "2026-07-26T12:00:00Z",
  reviewerLabel: "Responsable", checks: folder.checks, scope: "all", scopeRef: "all", tenantFiles: new Map([["selection:1", { buffer: Buffer.from("private-pdf"), mimeType: "application/pdf", title: "Estatutos.pdf" }]]) });
const zip = await JSZip.loadAsync(download.buffer);
const manifest = JSON.parse(await zip.file("manifest.json").async("string"));
assert(zip.file("00-indice-y-control.docx") && manifest.artifacts.length === 2, "El ZIP de trabajo no contiene índice y ficheros disponibles");
assert.equal(manifest.submissionAllowed, false, "La carpeta de trabajo habilita presentación automática");
const controlXml = await JSZip.loadAsync(await zip.file("00-indice-y-control.docx").async("nodebuffer"));
assert((await controlXml.file("word/document.xml").async("string")).includes("BORRADOR DE TRABAJO"), "El índice no identifica el paquete como borrador de trabajo");

console.log(JSON.stringify({ ok: true, checks: folder.checks.length, files: folder.summary.totalFiles, consolidatedFiles: 1,
  downloads: ["document", "check", "all"], workingReviewInvalidatedByNewVersion: true,
  tenantIsolation: true, submissionAllowed: false }, null, 2));
