function plain(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const POST_AWARD = /justificaci|documentacion justificativa|candidaturas? ganadoras|aceptacion de la subvencion|despues de la concesion|tras la concesion|una vez concedid|nominas? y justificantes? bancarios|recibos? de liquidacion/;
const POST_AWARD_STRONG = /memoria[- ]evaluacion[^.]{0,160}actividad realizada|memoria justificativa|cuenta justificativa|gasto ejecutado|subvencion concedida|documentacion administrativa[^.]{0,120}(?:abono|premio)/;
const APPLICATION = /junto con la solicitud|acompan(?:ara|ada|aran)|documentacion a (?:presentar|aportar)|debera (?:aportarse|adjuntarse)|se debera adjuntar|solicitud y documentacion|anexos? obligatorios?|documentacion obligatoria|sol.?licituds?.{0,120}acompanyades|documentacio a (?:presentar|aportar)/;
const CONTEXT_ONLY = /subsan|no presentacion|se ha presentado toda|presentado toda|plazo de presentacion|documentacion exigida se obtienen|podra requerir|se requerira a la persona interesada|junto con la documentacion requerida|documentacion requerida al efecto|la presentacion (?:de las solicitudes )?presume la aceptacion|solicitud y documentacion\.\s+las solicitudes[^.]{0,220}(?:sede|registro)/;
const LEADING_PROCEDURE = /^(?:[-—•]\s*)?(?:subsanacion|si la solicitud no reune|la presentacion de las solicitudes presume)/;
const CROSS_REFERENCE = /(?:relacionad|determinad|detallad|senalad)[oa]s? en (?:el )?(?:anexo|base|clausula)|segun (?:el )?(?:anexo|modelo)|conforme a la documentacion exigida/;

const CATEGORY_PATTERNS = {
  official_form: /modelo|formulario|solicitud normalizada|instancia|ficha|anexo\s+[ivxlcdm0-9]+|model normalitzat|formulari|annex\s+[ivxlcdm0-9]+/,
  generated_draft: /memoria|proyecto detallado|plan de (?:actuacion|trabajo)|presupuesto|cronograma|programa de actividades|propuesta tecnica|projecte detallat|pressupost/,
  declaration: /declaracion|autoriza(?:cion| al)|consentimiento|declaracio|autoritzacio|(?:documento|carta|modelo|anexo)[^.;]{0,60}aceptacion|aceptacion[^.;]{0,60}(?:documento|carta|modelo|anexo)/,
  supporting_evidence: /certificad|certificat|\bdni\b|\bnie\b|\bnif\b|\bcif\b|estatutos?|estatuts|escritura|escriptura|inscripcion|inscripcio|registro de asociaciones|poder suficiente|representacion|representacio|documento acreditativo|acreditacion|acreditacio|informe tecnico|informe tecnic|contrato|contracte|factura|nomina|extractos? bancarios?|extracte bancari|justificante|justificant|titularidad bancaria|titularitat bancaria|permiso de trabajo|libro de familia|alta a terceros|sentencia|convenio regulador|grado de discapacidad/
};

const PREPARATION = {
  official_form: "official_template_required",
  generated_draft: "drafted_in_proposal",
  declaration: "human_completion_required",
  supporting_evidence: "tenant_evidence_required",
  other: "pending_classification"
};

export function preparationForCategory(category) {
  return PREPARATION[category] || PREPARATION.other;
}

export function classifyDocumentRequirement(value) {
  const text = plain(value?.text || value?.evidenceExcerpt || value);
  const categoryHits = Object.entries(CATEGORY_PATTERNS).filter(([, pattern]) => pattern.test(text)).map(([key]) => key);
  const itemized = /(?:^|\s)(?:[a-h]\)|\d+[.)]|[-•▪])\s*[a-z]/.test(text);
  const postIndex = text.search(POST_AWARD);
  const applicationIndex = text.search(APPLICATION);
  const explicitPostIndex = text.search(/documentacion (?:a aportar )?para la justificacion|documentacion justificativa|candidaturas? ganadoras/);
  const explicitPostAward = explicitPostIndex >= 0 && (applicationIndex < 0 || explicitPostIndex <= applicationIndex + 60);
  const postAward = POST_AWARD_STRONG.test(text) || explicitPostAward || postIndex >= 0 && (applicationIndex < 0 || postIndex <= applicationIndex);
  const applicationSignal = applicationIndex >= 0 || categoryHits.length > 0;
  const contextual = LEADING_PROCEDURE.test(text) || CONTEXT_ONLY.test(text) && !categoryHits.length;
  const phase = postAward ? "post_award" : contextual || !applicationSignal ? "contextual" : "application";
  const specificity = phase !== "application" ? "contextual" : !categoryHits.length || CROSS_REFERENCE.test(text) && categoryHits.length <= 1 && !itemized
    ? "reference_only" : itemized || categoryHits.length > 1 ? "itemized" : "specific";
  const recommendedCategory = itemized && categoryHits.length > 1 ? "mixed_bundle" : categoryHits[0] || "other";
  const recommendedPreparation = recommendedCategory === "mixed_bundle" ? "pending_classification" : preparationForCategory(recommendedCategory);
  const planningReady = phase === "application" && specificity !== "reference_only" && recommendedCategory !== "other";
  const reason = phase === "post_award" ? "Documentacion posterior a la concesion o de justificacion."
    : phase === "contextual" ? "Mencion procedimental sin documento concreto identificable."
    : specificity === "reference_only" ? "Remite a otra base o anexo sin especificar aqui la lista completa."
    : recommendedCategory === "mixed_bundle" ? "La clausula agrupa documentos de distinta naturaleza y debe desglosarse."
    : `Documento de solicitud clasificado como ${recommendedCategory}.`;
  return { phase, specificity, detectedCategories: categoryHits, recommendedCategory, recommendedPreparation, planningReady, reason };
}

export function actionableDocumentRequirements(requirementsContract = {}) {
  return (requirementsContract.sections?.requiredDocuments || []).map((clause) => ({ clause, classification: classifyDocumentRequirement(clause) }))
    .filter((item) => item.classification.phase === "application");
}
