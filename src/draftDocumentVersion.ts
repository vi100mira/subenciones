import { createHash } from "node:crypto";
import { canonicalJson } from "./canonicalJson.mjs";

export type DraftSectionEdit = { title: string; paragraphs: string[] };
export type DraftDocumentEdit = { documentRef: string; sections: DraftSectionEdit[] };

export function draftContentHash(content: unknown) {
  return createHash("sha256").update(canonicalJson(content)).digest("hex");
}

export function isEditableDraft(content: any) {
  return content && Array.isArray(content.documents) && content.documents.length > 0
    && content.documents.every((document: any) => typeof document.documentRef === "string"
      && Array.isArray(document.sections) && document.sections.length > 0)
    && content.humanReviewRequired === true && content.submissionAllowed === false;
}

export function draftDocumentIsConsolidated(document: any) {
  return document?.consolidation?.status === "consolidated";
}

export function consolidatedDocumentRefs(content: any) {
  return isEditableDraft(content)
    ? content.documents.filter(draftDocumentIsConsolidated).map((document: any) => document.documentRef)
    : [];
}

export function allDraftDocumentsConsolidated(content: any) {
  return isEditableDraft(content) && content.documents.every(draftDocumentIsConsolidated);
}

export function consolidateDraftDocument(content: any, documentRef: string, actorUserId: string, reviewedAt: string) {
  if (!isEditableDraft(content)) throw new Error("El borrador no tiene una estructura consolidable segura");
  let found = false;
  const documents = content.documents.map((document: any) => {
    if (document.documentRef !== documentRef) return document;
    found = true;
    const { consolidation: _previous, ...documentContent } = document;
    const consolidatedTitle = String(documentContent.title || "Documento").replace(/\s*-\s*(borrador|esqueleto|matriz|ficha|paquete|índice|indice).*$/i, "").trim();
    const reviewedDocument = { ...documentContent, title: consolidatedTitle || documentContent.title };
    return { ...reviewedDocument, consolidation: { status: "consolidated", reviewedBy: actorUserId, reviewedAt,
      documentHash: draftContentHash(reviewedDocument) } };
  });
  if (!found) throw new Error("El documento que quieres consolidar no pertenece a este borrador");
  return { ...content, documents, humanReviewRequired: true, submissionAllowed: false };
}

export function applyDraftEdits(base: any, edits: DraftDocumentEdit[], actorUserId: string, editedAt: string) {
  if (!isEditableDraft(base)) throw new Error("El borrador base no tiene una estructura editable segura");
  const byDocument = new Map((edits || []).map((edit) => [edit.documentRef, edit]));
  const documents = base.documents.map((document: any) => {
    const edit = byDocument.get(document.documentRef);
    if (!edit) return document;
    const { consolidation: _previous, ...editableDocument } = document;
    const bySection = new Map(edit.sections.map((section) => [section.title, section]));
    return { ...editableDocument, sections: document.sections.map((section: any) => {
      const sectionEdit = bySection.get(section.title);
      if (!sectionEdit) return section;
      const paragraphs = sectionEdit.paragraphs.map((paragraph) => String(paragraph || "").trim().slice(0, 5000))
        .filter(Boolean).slice(0, 30);
      if (!paragraphs.length) throw new Error(`El apartado «${section.title}» no puede quedar vacío`);
      return { ...section, paragraphs, editProvenance: {
        mode: "human_edit", actorUserId, editedAt,
        evidenceRefsPreserved: [...(section.evidenceRefs || [])]
      } };
    }) };
  });
  return { ...base, documents, humanReviewRequired: true, submissionAllowed: false,
    versionProvenance: { mode: "human_edit", actorUserId, editedAt } };
}
