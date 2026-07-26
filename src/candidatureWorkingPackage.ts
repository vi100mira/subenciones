import { createHash } from "node:crypto";
import JSZip from "jszip";
import { buildApprovedDraftDocx, type DraftDocumentPlanItem, type GeneratedDraftDocument } from "./candidatureDocx.js";
import type { ProjectFolderCheck } from "./candidatureProjectFolder.js";

type TenantFile = { buffer: Buffer; mimeType: string; title: string };
type WorkingPackageInput = {
  title: string;
  opportunityTitle: string;
  funderName?: string;
  tenantName?: string;
  documents: GeneratedDraftDocument[];
  documentPlan: DraftDocumentPlanItem[];
  evidenceRefs: string[];
  uncertainties: string[];
  reviewedAt: string;
  reviewerLabel: string;
  checks: ProjectFolderCheck[];
  scope: "document" | "check" | "all";
  scopeRef: string;
  fileId?: string | null;
  tenantFiles: Map<string, TenantFile>;
};

function digest(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function safeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "documento";
}

function extension(title: string, mimeType: string) {
  const fromTitle = title.match(/\.([a-z0-9]{2,6})$/i)?.[1];
  if (fromTitle) return fromTitle.toLowerCase();
  return ({ "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx" } as Record<string, string>)[mimeType] || "bin";
}

async function generatedBuffer(input: WorkingPackageInput, document: GeneratedDraftDocument) {
  const relatedPlan = input.documentPlan.filter((item) => item.draftDocumentRefs.includes(document.documentRef));
  return buildApprovedDraftDocx({
    title: document.title, opportunityTitle: input.opportunityTitle, funderName: input.funderName, tenantName: input.tenantName,
    sections: document.sections, documentPlan: relatedPlan,
    evidenceRefs: [...new Set([...document.evidenceRefs, ...document.sections.flatMap((section) => section.evidenceRefs || [])])],
    uncertainties: [...input.uncertainties, ...document.missingInputs.map((item) => `${document.title}: ${item}`)],
    reviewedAt: input.reviewedAt, reviewerLabel: input.reviewerLabel, workingCopy: true
  });
}

function selectedChecks(input: WorkingPackageInput) {
  if (input.scope === "all") return input.checks;
  if (input.scope === "check") return input.checks.filter((check) => check.id === input.scopeRef);
  return input.checks.map((check) => ({ ...check, files: check.files.filter((file) => file.id === input.fileId) }))
    .filter((check) => check.files.length);
}

export async function buildWorkingDownload(input: WorkingPackageInput) {
  const checks = selectedChecks(input);
  if (!checks.length) throw new Error("No se encontró el contenido solicitado en la carpeta de proyecto");
  const documentByRef = new Map(input.documents.map((document) => [document.documentRef, document]));
  const requestedFiles = checks.flatMap((check) => check.files);
  if (input.scope === "document" && requestedFiles.length === 1) {
    const file = requestedFiles[0];
    if (!file.available) throw new Error("El original todavía no está archivado y no puede descargarse");
    if (file.kind === "generated") {
      const generated = documentByRef.get(file.id);
      if (!generated) throw new Error("La versión generada ya no está disponible");
      const buffer = await generatedBuffer(input, generated);
      return { buffer, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: `${safeName(file.title)}-borrador-trabajo.docx`, artifactCount: 1,
        manifest: { scope: input.scope, scopeRef: input.scopeRef, workingCopy: true, submissionAllowed: false,
          artifacts: [{ id: file.id, title: file.title, sha256: digest(buffer), size: buffer.byteLength }] } };
    }
    const stored = input.tenantFiles.get(file.id);
    if (!stored) throw new Error("El original privado no está disponible en el almacenamiento del tenant");
    return { buffer: stored.buffer, contentType: stored.mimeType, fileName: `${safeName(stored.title)}.${extension(stored.title, stored.mimeType)}`,
      artifactCount: 1, manifest: { scope: input.scope, scopeRef: input.scopeRef, workingCopy: true, submissionAllowed: false,
        artifacts: [{ id: file.id, title: stored.title, sha256: digest(stored.buffer), size: stored.buffer.byteLength }] } };
  }

  const zip = new JSZip();
  const artifacts: any[] = [];
  const missing: any[] = [];
  for (const [checkIndex, check] of checks.entries()) {
    const folder = zip.folder(`${String(checkIndex + 1).padStart(2, "0")}-${safeName(check.title)}`)!;
    for (const [fileIndex, file] of check.files.entries()) {
      if (!file.available) { missing.push({ checkId: check.id, fileId: file.id, title: file.title, reason: "original_not_archived" }); continue; }
      let buffer: Buffer; let mimeType = file.mimeType; let suffix = extension(file.title, mimeType);
      if (file.kind === "generated") {
        const generated = documentByRef.get(file.id);
        if (!generated) { missing.push({ checkId: check.id, fileId: file.id, title: file.title, reason: "version_not_found" }); continue; }
        buffer = await generatedBuffer(input, generated); mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; suffix = "docx";
      } else {
        const stored = input.tenantFiles.get(file.id);
        if (!stored) { missing.push({ checkId: check.id, fileId: file.id, title: file.title, reason: "private_blob_unavailable" }); continue; }
        buffer = stored.buffer; mimeType = stored.mimeType; suffix = extension(stored.title, stored.mimeType);
      }
      const fileName = `${String(fileIndex + 1).padStart(2, "0")}-${safeName(file.title)}.${suffix}`;
      folder.file(fileName, buffer);
      artifacts.push({ checkId: check.id, fileId: file.id, title: file.title, kind: file.kind, mimeType, fileName, sha256: digest(buffer), size: buffer.byteLength });
    }
    for (const pending of check.missingInputs) missing.push({ checkId: check.id, title: check.title, reason: pending });
  }
  if (!artifacts.length) throw new Error("No hay ficheros disponibles para esta descarga");
  const control = await buildApprovedDraftDocx({
    title: "Índice y control de la carpeta de proyecto", opportunityTitle: input.opportunityTitle,
    funderName: input.funderName, tenantName: input.tenantName,
    sections: checks.map((check) => ({ title: check.title, paragraphs: [
      `${check.files.length} ficheros previstos; ${check.files.filter((file) => file.available).length} disponibles.`,
      ...check.missingInputs.map((item) => `Pendiente: ${item}`)
    ], evidenceRefs: check.evidenceRefs })), documentPlan: input.documentPlan,
    evidenceRefs: input.evidenceRefs, uncertainties: [...input.uncertainties, ...missing.map((item) => `${item.title}: ${item.reason}`)],
    reviewedAt: input.reviewedAt, reviewerLabel: input.reviewerLabel, workingCopy: true
  });
  zip.file("00-indice-y-control.docx", control);
  const manifest = { schemaVersion: "candidature-working-folder-v1", generatedAt: new Date().toISOString(),
    scope: input.scope, scopeRef: input.scopeRef, workingCopy: true, humanReview: "acknowledged_for_work", submissionAllowed: false,
    artifacts, missing };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { buffer, contentType: "application/zip", fileName: input.scope === "check" ? `${safeName(checks[0].title)}-trabajo.zip` : "carpeta-proyecto-trabajo.zip",
    artifactCount: artifacts.length, manifest };
}
