import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import JSZip from "jszip";

const migration = await fs.readFile("supabase/migrations/20260714180000_tenant_draft_human_review.sql", "utf8");
const reviewApi = await fs.readFile("api/draft-agent-runs.ts", "utf8");
const exportApi = await fs.readFile("api/approved-draft-document.ts", "utf8");
const downloadApi = await fs.readFile("api/private-draft-download.ts", "utf8");
const ui = await fs.readFile("prototype/draft-agent-ui.js", "utf8");

assert(migration.includes("tenant_draft_reviews") && migration.includes("output_hash"), "Falta persistir la decision humana sobre una salida inmutable");
assert(reviewApi.includes('reviewStatus === "rejected"') && reviewApi.includes("Indica el motivo del rechazo"), "El revisor no puede aprobar/rechazar con motivo");
assert(exportApi.includes('review.status !== "approved"') && exportApi.includes("review.output_hash !== outputHash"), "La exportacion no exige aprobacion del contenido exacto");
assert(exportApi.includes('version_status !== "current"') && exportApi.includes('documentaryGate !== "requirements_approved"'), "La exportacion no revalida version y bases");
assert(exportApi.includes('draftingGate !== "constraints_verified"') && exportApi.includes("validateRenderedPages"), "La exportacion no respeta limites ni validacion PDF");
assert(exportApi.includes("output.documents") && exportApi.includes('role === "primary_proposal"'), "La exportacion no consume el expediente mult-documento");
assert((exportApi.match(/access: "private"/g) || []).length === 3, "DOCX, PDF y expediente ZIP no quedan privados");
assert(downloadApi.includes('"sources:write"') && downloadApi.includes('Cache-Control", "private, no-store') && downloadApi.includes('type === "package"'), "La descarga privada no protege el expediente completo");
assert(ui.includes("Aprobar para exportar") && ui.includes("Rechazar y corregir") && ui.includes("Descargar expediente ZIP"), "La interfaz no muestra el control humano final y el expediente");

const source = await fs.readFile("src/candidatureDocx.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const outputDir = path.resolve(".tmp/approved-draft-docx");
await fs.mkdir(outputDir, { recursive: true });
const modulePath = path.join(outputDir, "candidatureDocx.mjs");
await fs.writeFile(modulePath, compiled);
await fs.writeFile(path.join(outputDir, "candidatureDocx.js"), compiled);
const { buildApprovedDraftDocx } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
const approvedInput = {
  title: "Programa de insercion y acompañamiento 2026",
  opportunityTitle: "Convocatoria de proyectos sociales",
  funderName: "Administracion publica de ejemplo",
  tenantName: "Entidad social de ejemplo",
  reviewedAt: "2026-07-14T12:00:00Z",
  reviewerLabel: "Responsable de candidatura",
  sections: [
    { title: "Necesidad y objetivos", paragraphs: ["El proyecto plantea itinerarios individualizados de insercion laboral para personas en situacion de vulnerabilidad."], evidenceRefs: ["https://oficial.example/bases.pdf#page=7", "approved-fact:fact-1"] },
    { title: "Metodologia", paragraphs: ["La intervencion combina diagnostico, formacion, intermediacion y seguimiento mediante indicadores revisables."], evidenceRefs: ["https://oficial.example/bases.pdf#page=12"] }
  ],
  documentPlan: [
    { title: "Memoria tecnica", category: "generated_draft", preparation: "drafted_in_proposal", requirementRefs: ["required-document:1"], draftDocumentRefs: ["draft-document:1"], evidenceRefs: ["https://oficial.example/bases.pdf#page=7"], missingInputs: [] },
    { title: "Declaracion responsable", category: "declaration", preparation: "human_completion_required", requirementRefs: ["required-document:2"], draftDocumentRefs: ["draft-document:2"], evidenceRefs: ["https://oficial.example/bases.pdf#page=15"], missingInputs: ["Identidad de la persona firmante"] }
  ],
  evidenceRefs: ["https://oficial.example/bases.pdf#page=7", "approved-fact:fact-1"],
  uncertainties: ["Confirmar el importe solicitado y el calendario definitivo antes de presentar."]
};
const buffer = await buildApprovedDraftDocx(approvedInput);
assert(buffer.byteLength > 5000, "El DOCX generado es demasiado pequeño o vacio");
const docxPath = path.join(outputDir, "approved-draft.docx");
await fs.writeFile(docxPath, buffer);
const zip = await JSZip.loadAsync(buffer);
const documentXml = await zip.file("word/document.xml")?.async("string");
assert(documentXml?.includes("Programa de insercion") && documentXml.includes("Revisión humana"), "El OOXML no contiene titulo y control humano");
assert(documentXml.includes("approved-fact:fact-1") && documentXml.includes("oficial.example/bases.pdf"), "El DOCX pierde trazabilidad publica o interna aprobada");
assert(documentXml.includes("Hoja interna de control documental") && documentXml.includes("Declaracion responsable"), "El DOCX no conserva el plan documental completo");
assert(zip.file("word/numbering.xml"), "El DOCX no usa listas Word reales");

const packageSource = await fs.readFile("src/candidaturePackage.ts", "utf8");
const packageCompiled = ts.transpileModule(packageSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const packagePath = path.join(outputDir, "candidaturePackage.mjs");
await fs.writeFile(packagePath, packageCompiled);
const { buildApprovedDraftPackage } = await import(`${pathToFileURL(packagePath).href}?v=${Date.now()}`);
const packageResult = await buildApprovedDraftPackage({ ...approvedInput, documents: [
  { documentRef: "draft-document:1", role: "primary_proposal", title: "Memoria tecnica", documentType: "memoria", requirementRefs: ["required-document:1"], sections: approvedInput.sections, evidenceRefs: approvedInput.evidenceRefs, missingInputs: [] },
  { documentRef: "draft-document:2", role: "supporting_draft", title: "Declaracion responsable", documentType: "declaracion", requirementRefs: ["required-document:2"], sections: [{ title: "Declaracion", paragraphs: ["Texto sujeto a firma y comprobacion humana."], evidenceRefs: ["https://oficial.example/bases.pdf#page=15"] }], evidenceRefs: ["https://oficial.example/bases.pdf#page=15"], missingInputs: ["Identidad de la persona firmante"] }
] });
const packageZip = await JSZip.loadAsync(packageResult.buffer);
const manifest = JSON.parse(await packageZip.file("manifest.json").async("string"));
assert.equal(manifest.artifacts.length, 2, "El manifiesto no enumera todos los borradores");
assert(packageZip.file("00-indice-y-control.docx") && packageZip.file(manifest.artifacts[0].fileName) && packageZip.file(manifest.artifacts[1].fileName), "El ZIP no contiene indice y documentos separados");
assert.equal(manifest.submissionAllowed, false, "El expediente habilita una presentacion automatica");

console.log(JSON.stringify({ assertions: 17, docxPath, bytes: buffer.byteLength, packageBytes: packageResult.buffer.byteLength, packageArtifacts: manifest.artifacts.length, lifecycle: ["generated", "human_approved", "private_export"], documentPlan: "included", multiDocumentOutput: "packaged", submissionAllowed: false }, null, 2));
