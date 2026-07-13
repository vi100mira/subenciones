function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function clauses(value) {
  return unique(String(value || "").split(/(?:\r?\n|;|\.(?:\s|$))/)).slice(0, 40);
}

function evidence(version, field, text) {
  return {
    versionId: version.id,
    contentHash: version.contentHash,
    field,
    text: clean(text).slice(0, 1000),
    sourceUrl: version.basesUrl || version.officialUrl || version.sourceUrl
  };
}

function section(version, field, label) {
  const items = clauses(version[field]);
  return items.map((text) => ({
    code: field,
    label,
    text,
    evidence: evidence(version, field, text),
    verificationStatus: "pending_human_review"
  }));
}

export function reviewOpportunityDocuments(version) {
  if (!version?.id || !version?.contentHash) throw new Error("Falta versión oficial identificable");
  const requirements = [
    ...section(version, "eligibilityText", "Elegibilidad"),
    ...section(version, "criteriaText", "Criterio de valoración"),
    ...section(version, "requiredDocumentsText", "Documento requerido"),
    ...section(version, "submissionChannelText", "Canal de presentación")
  ];
  const risks = [];
  if (!version.basesUrl) risks.push({ code: "bases_missing", text: "No consta enlace directo a las bases; verificar antes de preparar documentos." });
  if (!version.requiredDocumentsText) risks.push({ code: "documents_missing", text: "La versión estructurada no enumera documentos obligatorios." });
  if (!["high", "medium"].includes(version.deadlineConfidence)) risks.push({ code: "deadline_uncertain", text: "El plazo necesita verificación humana por baja confianza." });
  if (!requirements.length) risks.push({ code: "extraction_empty", text: "No se extrajeron requisitos estructurados de esta versión." });
  const deadline = version.deadlineText ? [{
    code: "deadline", label: "Plazo", text: clean(version.deadlineText),
    evidence: evidence(version, "deadlineText", version.deadlineText),
    verificationStatus: "pending_human_review"
  }] : [];
  return {
    status: "review_required",
    requirements: [...deadline, ...requirements],
    risks,
    sourceManifest: {
      versionId: version.id,
      contentHash: version.contentHash,
      sourceUrl: version.sourceUrl,
      officialUrl: version.officialUrl || null,
      basesUrl: version.basesUrl || null,
      allowedDataClasses: ["public"]
    },
    humanReviewRequired: true,
    externalSubmissionAllowed: false,
    externalAiCalls: 0
  };
}
