const PAGE_UNITS = new Set(["pages", "folios", "sides"]);

export function contractForConstraints(constraints = {}) {
  const limits = constraints.limits || [];
  return {
    version: "draft-output-v1",
    language: "es",
    requiredFields: ["title", "sections", "evidenceRefs", "uncertainties", "humanReviewRequired", "submissionAllowed"],
    sectionShape: { title: "string", paragraphs: "string[]", evidenceRefs: "string[]" },
    hardLimits: limits.map((limit) => ({ documentType: limit.documentType, unit: limit.unit, maximum: limit.value, sourceUrl: limit.sourceUrl, sourcePage: limit.sourcePage, documentSha256: limit.documentSha256 })),
    formatRules: constraints.formatRules || [],
    renderValidationRequired: limits.some((limit) => PAGE_UNITS.has(limit.unit)),
    humanReviewRequired: true,
    submissionAllowed: false,
    rules: [
      "No inventar hechos, importes, elegibilidad ni experiencia.",
      "Cada afirmación verificable debe apuntar a evidencia oficial o a un hecho interno aprobado.",
      "Declarar incertidumbres y campos incompletos.",
      "No declarar el documento listo hasta superar el renderizado y la revisión humana."
    ]
  };
}

function textOf(output) {
  return (output.sections || []).flatMap((section) => [section.title, ...(section.paragraphs || [])]).join(" ").trim();
}

export function validateDraftOutput(output, constraints = {}) {
  const errors = [];
  if (!output || typeof output !== "object") return { valid: false, errors: ["La salida no es un objeto."], validationState: "rejected" };
  if (typeof output.title !== "string" || !output.title.trim()) errors.push("Falta título.");
  if (!Array.isArray(output.sections) || !output.sections.length || output.sections.length > 20) errors.push("Se requieren entre 1 y 20 secciones.");
  for (const section of output.sections || []) {
    if (typeof section.title !== "string" || !section.title.trim()) errors.push("Hay una sección sin título.");
    if (!Array.isArray(section.paragraphs) || !section.paragraphs.length) errors.push(`La sección ${section.title || "sin título"} no tiene párrafos.`);
    if (!Array.isArray(section.evidenceRefs) || !section.evidenceRefs.length) errors.push(`La sección ${section.title || "sin título"} no tiene referencias de evidencia.`);
  }
  if (!Array.isArray(output.evidenceRefs) || !output.evidenceRefs.length) errors.push("Faltan referencias globales de evidencia.");
  if (!Array.isArray(output.uncertainties)) errors.push("Falta la lista de incertidumbres.");
  if (output.humanReviewRequired !== true) errors.push("La revisión humana debe ser obligatoria.");
  if (output.submissionAllowed !== false) errors.push("La presentación automática debe estar prohibida.");

  const text = textOf(output);
  for (const limit of constraints.limits || []) {
    const actual = limit.unit === "words" ? text.split(/\s+/).filter(Boolean).length : limit.unit === "characters" ? text.length : null;
    if (actual !== null && actual > Number(limit.value)) errors.push(`${actual} ${limit.unit} superan el máximo ${limit.value}.`);
  }
  const renderRequired = (constraints.limits || []).some((limit) => PAGE_UNITS.has(limit.unit));
  return { valid: errors.length === 0, errors, validationState: errors.length ? "rejected" : renderRequired ? "render_required" : "human_review_required" };
}
