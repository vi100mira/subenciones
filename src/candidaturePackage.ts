import { createHash } from "node:crypto";
import JSZip from "jszip";
import { buildApprovedDraftDocx, type ApprovedDraftDocument, type GeneratedDraftDocument } from "./candidatureDocx.js";

export type ApprovedDraftPackageInput = Omit<ApprovedDraftDocument, "sections"> & {
  documents: GeneratedDraftDocument[];
};

function digest(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "documento";
}

export async function buildApprovedDraftPackage(input: ApprovedDraftPackageInput) {
  const zip = new JSZip();
  const artifacts = [];
  const control = await buildApprovedDraftDocx({
    ...input,
    title: "Indice y control del expediente",
    sections: [{ title: "Borradores incluidos", paragraphs: input.documents.map((document) => `${document.title} (${document.role === "primary_proposal" ? "principal" : "anexo"}).`), evidenceRefs: input.evidenceRefs }]
  });
  zip.file("00-indice-y-control.docx", control);

  for (const [index, document] of input.documents.entries()) {
    const relatedPlan = input.documentPlan.filter((item) => item.draftDocumentRefs.includes(document.documentRef));
    const buffer = await buildApprovedDraftDocx({
      ...input,
      title: document.title,
      sections: document.sections,
      documentPlan: relatedPlan,
      evidenceRefs: [...new Set([...document.evidenceRefs, ...document.sections.flatMap((section) => section.evidenceRefs || [])])],
      uncertainties: [...input.uncertainties, ...document.missingInputs.map((item) => `${document.title}: ${item}`)]
    });
    const fileName = `${String(index + 1).padStart(2, "0")}-${safeFileName(document.title)}.docx`;
    const sha256 = digest(buffer);
    zip.file(fileName, buffer);
    artifacts.push({ documentRef: document.documentRef, role: document.role, title: document.title, documentType: document.documentType,
      requirementRefs: document.requirementRefs, fileName, sha256, size: buffer.byteLength });
  }

  const manifest = { schemaVersion: "approved-draft-package-v1", generatedAt: new Date().toISOString(), humanReview: "approved",
    submissionAllowed: false, artifacts };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  return { buffer: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), manifest, artifacts };
}
