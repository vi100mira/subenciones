import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat,
  Packer, PageNumber, Paragraph, ShadingType, TextRun
} from "docx";

export type DraftSection = { title: string; paragraphs: string[]; evidenceRefs?: string[] };
export type GeneratedDraftDocument = { documentRef: string; role: "primary_proposal" | "supporting_draft"; title: string; documentType: string; requirementRefs: string[]; sections: DraftSection[]; evidenceRefs: string[]; missingInputs: string[] };
export type DraftDocumentPlanItem = {
  title: string;
  category: "generated_draft" | "official_form" | "supporting_evidence" | "declaration" | "other";
  preparation: "drafted_in_proposal" | "official_template_required" | "tenant_evidence_required" | "human_completion_required" | "pending_classification";
  requirementRefs: string[];
  evidenceRefs: string[];
  missingInputs: string[];
  draftDocumentRefs: string[];
};
export type ApprovedDraftDocument = {
  title: string;
  opportunityTitle: string;
  funderName?: string;
  tenantName?: string;
  sections: DraftSection[];
  documentPlan: DraftDocumentPlanItem[];
  evidenceRefs: string[];
  uncertainties: string[];
  reviewedAt: string;
  reviewerLabel?: string;
};

const INK = "10231F";
const GREEN = "1F625A";
const MUTED = "5B6E69";
const WARNING = "7A5A00";
const PREPARATION_LABELS: Record<DraftDocumentPlanItem["preparation"], string> = {
  drafted_in_proposal: "Redactado en la propuesta",
  official_template_required: "Requiere plantilla oficial",
  tenant_evidence_required: "Debe aportarlo la entidad",
  human_completion_required: "Requiere cumplimentacion humana",
  pending_classification: "Clasificacion pendiente de revision"
};

function text(value: unknown, maximum = 8000) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maximum);
}

function heading(value: string) {
  return new Paragraph({ text: text(value, 300), heading: HeadingLevel.HEADING_1, keepNext: true });
}

function body(value: string) {
  return new Paragraph({ children: [new TextRun({ text: text(value), color: INK })], spacing: { after: 120, line: 300, lineRule: "auto" } });
}

function bullet(value: string, reference: string) {
  return new Paragraph({ children: [new TextRun({ text: text(value), color: INK })], numbering: { reference, level: 0 } });
}

export async function buildApprovedDraftDocx(input: ApprovedDraftDocument) {
  const reviewDate = new Date(input.reviewedAt);
  const reviewedAt = Number.isNaN(reviewDate.getTime()) ? text(input.reviewedAt, 80) : reviewDate.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" });
  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: text(input.tenantName || "Entidad solicitante", 200), bold: true, size: 22, color: MUTED })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: text(input.title, 500), bold: true, size: 48, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: text(input.opportunityTitle, 700), size: 26, color: GREEN })] }),
    new Paragraph({
      spacing: { before: 80, after: 240 }, shading: { type: ShadingType.CLEAR, fill: "FFF8E6", color: "auto" },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: "D5A93D" }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "D5A93D" }, left: { style: BorderStyle.SINGLE, size: 18, color: "D5A93D" }, right: { style: BorderStyle.SINGLE, size: 6, color: "D5A93D" } },
      children: [new TextRun({ text: `BORRADOR APROBADO PARA EXPORTACION. Revisión humana: ${reviewedAt}. No implica presentación ni elegibilidad.`, bold: true, color: WARNING })]
    }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: `Organismo: ${text(input.funderName || "Pendiente", 300)}. Revisor: ${text(input.reviewerLabel || "Usuario autorizado", 160)}.`, color: MUTED, italics: true })] })
  ];

  for (const section of input.sections.slice(0, 20)) {
    children.push(heading(section.title));
    for (const paragraph of section.paragraphs.slice(0, 40)) children.push(body(paragraph));
    if (section.evidenceRefs?.length) {
      children.push(new Paragraph({ children: [new TextRun({ text: "Evidencia de la sección", bold: true, size: 19, color: MUTED })], spacing: { before: 60, after: 40 } }));
      for (const reference of section.evidenceRefs.slice(0, 12)) children.push(bullet(reference, "evidence"));
    }
  }

  children.push(heading("Hoja interna de control documental"));
  children.push(body("No forma parte de la memoria para presentar. Debe revisarse y retirarse o separarse antes de cualquier uso externo."));
  for (const item of input.documentPlan.slice(0, 40)) {
    const status = PREPARATION_LABELS[item.preparation] || item.preparation;
    children.push(bullet(`${item.title} — ${status}. Requisitos: ${item.requirementRefs.join(", ")}.`, "documents"));
    for (const pending of item.missingInputs.slice(0, 12)) children.push(bullet(`Pendiente: ${pending}`, "documents"));
  }

  children.push(heading("Aspectos pendientes de verificación"));
  if (input.uncertainties.length) for (const item of input.uncertainties.slice(0, 30)) children.push(bullet(item, "uncertainties"));
  else children.push(body("No se declararon incertidumbres adicionales; deben revisarse igualmente todos los datos, importes y anexos antes de presentar."));
  children.push(heading("Fuentes y trazabilidad"));
  for (const reference of input.evidenceRefs.slice(0, 40)) children.push(bullet(reference, "evidence"));

  const document = new Document({
    creator: "INSERTIA", title: text(input.title, 500), description: "Borrador de candidatura sujeto a control humano",
    styles: {
      default: { document: { run: { font: "Calibri", size: 22, color: INK }, paragraph: { spacing: { after: 120, line: 300, lineRule: "auto" } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Calibri", size: 32, bold: true, color: GREEN }, paragraph: { spacing: { before: 320, after: 160 }, keepNext: true, outlineLevel: 0 } }
      ]
    },
    numbering: { config: ["evidence", "uncertainties", "documents"].map((reference) => ({ reference, levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 280 }, spacing: { after: 80, line: 290, lineRule: "auto" } } } }] })) },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 708, footer: 708 } } },
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: "INSERTIA | Candidatura", color: MUTED, size: 18 })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D7E3DF" } } })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Revisión humana obligatoria | Página ", color: MUTED, size: 18 }), new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 18 })] })] }) },
      children
    }]
  });
  return Buffer.from(await Packer.toBuffer(document));
}
