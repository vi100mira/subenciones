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

export function applyDraftEdits(base: any, edits: DraftDocumentEdit[], actorUserId: string, editedAt: string) {
  if (!isEditableDraft(base)) throw new Error("El borrador base no tiene una estructura editable segura");
  const byDocument = new Map((edits || []).map((edit) => [edit.documentRef, edit]));
  const documents = base.documents.map((document: any) => {
    const edit = byDocument.get(document.documentRef);
    if (!edit) return document;
    const bySection = new Map(edit.sections.map((section) => [section.title, section]));
    return { ...document, sections: document.sections.map((section: any) => {
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
