import { actionableDocumentRequirements, preparationForCategory } from "./document-requirement-classifier.mjs";

const PAGE_UNITS = new Set(["pages", "folios", "sides"]);
const DOCUMENT_CATEGORIES = new Set(["generated_draft", "official_form", "supporting_evidence", "declaration", "other"]);
const PREPARATION_STATES = new Set(["drafted_in_proposal", "official_template_required", "tenant_evidence_required", "human_completion_required", "pending_classification"]);

export function contractForConstraints(constraints = {}) {
  const limits = constraints.limits || [];
  return {
    version: "draft-output-v3",
    language: "es",
    requiredFields: ["title", "documents", "documentPlan", "evidenceRefs", "uncertainties", "humanReviewRequired", "submissionAllowed"],
    sectionShape: { title: "string", paragraphs: "string[]", evidenceRefs: "string[]" },
    documentShape: { documentRef: "string", role: "enum", title: "string", documentType: "string", requirementRefs: "string[]", sections: "section[]", evidenceRefs: "string[]", missingInputs: "string[]" },
    documentPlanShape: { title: "string", category: "enum", preparation: "enum", requirementRefs: "string[]", draftDocumentRefs: "string[]", evidenceRefs: "string[]", missingInputs: "string[]" },
    hardLimits: limits.map((limit) => ({ documentType: limit.documentType, unit: limit.unit, maximum: limit.value, sourceUrl: limit.sourceUrl, sourcePage: limit.sourcePage, documentSha256: limit.documentSha256 })),
    formatRules: constraints.formatRules || [],
    renderValidationRequired: limits.some((limit) => PAGE_UNITS.has(limit.unit)),
    humanReviewRequired: true,
    submissionAllowed: false,
    rules: [
      "No inventar hechos, importes, elegibilidad ni experiencia.",
      "Cada afirmacion verificable debe apuntar a evidencia oficial o a un hecho interno aprobado.",
      "Declarar incertidumbres y campos incompletos.",
      "No declarar el documento listo hasta superar el renderizado y la revision humana."
    ]
  };
}

function sectionsText(sections = []) {
  return sections.flatMap((section) => [section.title, ...(section.paragraphs || [])]).join(" ").trim();
}

export function validateDraftOutput(output, constraints = {}, requirementsContract = {}) {
  const errors = [];
  if (!output || typeof output !== "object") return { valid: false, errors: ["La salida no es un objeto."], validationState: "rejected" };
  if (typeof output.title !== "string" || !output.title.trim()) errors.push("Falta titulo.");
  const documentsByRef = new Map();
  if (!Array.isArray(output.documents) || !output.documents.length || output.documents.length > 20) errors.push("Se requieren entre 1 y 20 borradores documentales.");
  for (const document of output.documents || []) {
    if (typeof document.documentRef !== "string" || !document.documentRef.trim() || documentsByRef.has(document.documentRef)) errors.push("Hay una referencia documental vacia o duplicada.");
    else documentsByRef.set(document.documentRef, document);
    if (!["primary_proposal", "supporting_draft"].includes(document.role)) errors.push(`Rol documental no valido en ${document.title || "sin titulo"}.`);
    if (typeof document.title !== "string" || !document.title.trim()) errors.push("Hay un borrador sin titulo.");
    if (typeof document.documentType !== "string" || !document.documentType.trim()) errors.push(`Falta el tipo documental en ${document.title || "sin titulo"}.`);
    if (!Array.isArray(document.requirementRefs) || !document.requirementRefs.length) errors.push(`El borrador ${document.title || "sin titulo"} no indica requisitos.`);
    if (!Array.isArray(document.sections) || !document.sections.length || document.sections.length > 20) errors.push(`El borrador ${document.title || "sin titulo"} no contiene secciones.`);
    if (!Array.isArray(document.evidenceRefs) || !document.evidenceRefs.length) errors.push(`El borrador ${document.title || "sin titulo"} no cita evidencia.`);
    if (!Array.isArray(document.missingInputs)) errors.push(`El borrador ${document.title || "sin titulo"} no declara datos pendientes.`);
    for (const section of document.sections || []) {
      if (typeof section.title !== "string" || !section.title.trim()) errors.push(`Hay una seccion sin titulo en ${document.title || "sin titulo"}.`);
      if (!Array.isArray(section.paragraphs) || !section.paragraphs.length) errors.push(`La seccion ${section.title || "sin titulo"} no tiene parrafos.`);
      if (!Array.isArray(section.evidenceRefs) || !section.evidenceRefs.length) errors.push(`La seccion ${section.title || "sin titulo"} no tiene evidencia.`);
    }
  }
  if ((output.documents || []).filter((document) => document.role === "primary_proposal").length !== 1) errors.push("Debe existir exactamente un documento principal.");

  const actionableRequirements = actionableDocumentRequirements(requirementsContract).slice(0, 40);
  const expectedRequirementRefs = actionableRequirements.map((_, index) => `required-document:${index + 1}`);
  const coveredRequirementRefs = new Set();
  if (!Array.isArray(output.documentPlan) || !output.documentPlan.length || output.documentPlan.length > 40) errors.push("Se requiere un plan de entre 1 y 40 documentos.");
  for (const item of output.documentPlan || []) {
    if (typeof item.title !== "string" || !item.title.trim()) errors.push("Hay un documento sin titulo.");
    if (!DOCUMENT_CATEGORIES.has(item.category)) errors.push(`Categoria documental no valida en ${item.title || "sin titulo"}.`);
    if (!PREPARATION_STATES.has(item.preparation)) errors.push(`Estado de preparacion no valido en ${item.title || "sin titulo"}.`);
    if (!Array.isArray(item.requirementRefs) || !item.requirementRefs.length) errors.push(`El documento ${item.title || "sin titulo"} no indica que requisito cubre.`);
    if (!Array.isArray(item.draftDocumentRefs)) errors.push(`El documento ${item.title || "sin titulo"} no enlaza sus borradores.`);
    if (!Array.isArray(item.evidenceRefs) || !item.evidenceRefs.length) errors.push(`El documento ${item.title || "sin titulo"} no cita evidencia.`);
    if (!Array.isArray(item.missingInputs)) errors.push(`El documento ${item.title || "sin titulo"} no declara datos pendientes.`);
    for (const reference of item.requirementRefs || []) coveredRequirementRefs.add(reference);
    for (const reference of item.draftDocumentRefs || []) if (!documentsByRef.has(reference)) errors.push(`El plan enlaza un borrador inexistente: ${reference}.`);
    if (item.preparation === "drafted_in_proposal" && !item.draftDocumentRefs?.length) errors.push(`Falta redactar el documento ${item.title || "sin titulo"}.`);
    for (const reference of item.requirementRefs || []) {
      const expected = actionableRequirements[Number(reference.split(":")[1]) - 1]?.classification;
      if (!expected || expected.recommendedCategory === "mixed_bundle" || !expected.planningReady) continue;
      if (item.category !== expected.recommendedCategory) errors.push(`${item.title}: la categoria contradice la base (${expected.recommendedCategory}).`);
      if (item.preparation !== expected.recommendedPreparation) errors.push(`${item.title}: la preparacion contradice la base (${expected.recommendedPreparation}).`);
    }
  }
  for (const document of output.documents || []) {
    if (!(output.documentPlan || []).some((item) => (item.draftDocumentRefs || []).includes(document.documentRef))) errors.push(`El borrador ${document.documentRef || "sin referencia"} no esta enlazado al plan.`);
  }
  const missingRequirementRefs = expectedRequirementRefs.filter((reference) => !coveredRequirementRefs.has(reference));
  for (const [index, requirement] of actionableRequirements.entries()) {
    if (requirement.classification.recommendedCategory !== "mixed_bundle") continue;
    const reference = `required-document:${index + 1}`;
    const related = (output.documentPlan || []).filter((item) => item.requirementRefs?.includes(reference));
    for (const category of requirement.classification.detectedCategories) {
      const item = related.find((candidate) => candidate.category === category);
      if (!item) errors.push(`La clausula agrupada ${reference} no desglosa ${category}.`);
      else if (item.preparation !== preparationForCategory(category)) errors.push(`${item.title}: preparacion insegura para ${category}.`);
    }
  }
  if (missingRequirementRefs.length) errors.push(`El plan documental no cubre: ${missingRequirementRefs.join(", ")}.`);
  if (!Array.isArray(output.evidenceRefs) || !output.evidenceRefs.length) errors.push("Faltan referencias globales de evidencia.");
  if (!Array.isArray(output.uncertainties)) errors.push("Falta la lista de incertidumbres.");
  if (output.humanReviewRequired !== true) errors.push("La revision humana debe ser obligatoria.");
  if (output.submissionAllowed !== false) errors.push("La presentacion automatica debe estar prohibida.");

  for (const limit of constraints.limits || []) {
    const targets = (output.documents || []).filter((document) => !limit.documentType || document.documentType === limit.documentType);
    if (!targets.length) errors.push(`No existe borrador para el limite ${limit.documentType || limit.unit}.`);
    for (const document of targets) {
      const value = sectionsText(document.sections);
      const actual = limit.unit === "words" ? value.split(/\s+/).filter(Boolean).length : limit.unit === "characters" ? value.length : null;
      if (actual !== null && actual > Number(limit.value)) errors.push(`${document.title}: ${actual} ${limit.unit} superan el maximo ${limit.value}.`);
    }
  }
  const renderRequired = (constraints.limits || []).some((limit) => PAGE_UNITS.has(limit.unit));
  return { valid: errors.length === 0, errors, validationState: errors.length ? "rejected" : renderRequired ? "render_required" : "human_review_required",
    documentCoverage: { total: expectedRequirementRefs.length, covered: expectedRequirementRefs.length - missingRequirementRefs.length, missingRequirementRefs },
    generatedDocuments: { total: documentsByRef.size, primary: (output.documents || []).filter((document) => document.role === "primary_proposal").length } };
}
