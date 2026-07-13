function plain(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function values(input) {
  return (Array.isArray(input) ? input : [input]).filter(Boolean).map((value) => String(value));
}

function firstHit(haystack, needles) {
  const text = plain(haystack);
  return values(needles).find((needle) => text.includes(plain(needle))) || null;
}

function evidence(opportunity, text) {
  return {
    sourceUrl: opportunity.officialUrl || opportunity.sourceUrl,
    excerpt: String(text || "").slice(0, 360),
    opportunityVersionId: opportunity.versionId
  };
}

export function matchOpportunity(profile, opportunity) {
  const reasons = [];
  const risks = [];
  const missingInformation = [];
  let score = 0;
  const opportunityText = [
    opportunity.title,
    opportunity.territory,
    ...(opportunity.themes || []),
    opportunity.eligibilityText,
    opportunity.criteriaText
  ].join(" ");

  if (["open", "rolling"].includes(opportunity.deadlineStatus)) {
    score += 15;
    reasons.push({ code: "deadline_open", text: "Plazo abierto o continuo según la versión oficial.", evidence: evidence(opportunity, opportunity.deadlineText) });
  } else {
    risks.push({ code: "deadline_unconfirmed", text: "El plazo no está confirmado como abierto.", evidence: evidence(opportunity, opportunity.deadlineText) });
  }
  if (["low", "uncertain"].includes(opportunity.deadlineConfidence)) {
    risks.push({ code: "deadline_confidence", text: "La fecha requiere comprobación humana en la fuente oficial.", evidence: evidence(opportunity, opportunity.deadlineText) });
  }

  const territory = firstHit(opportunity.territory, profile.territories);
  const national = firstHit(opportunity.territory, ["españa", "estatal", "nacional", "todo el territorio"]);
  if (territory || national) {
    score += 25;
    reasons.push({ code: "territory", text: territory ? `Territorio compatible: ${territory}.` : "Ámbito estatal compatible.", evidence: evidence(opportunity, opportunity.territory) });
  } else if (!opportunity.territory) {
    score += 5;
    missingInformation.push("Confirmar el ámbito territorial de la convocatoria.");
  } else {
    risks.push({ code: "territory", text: "No se ha demostrado compatibilidad territorial.", evidence: evidence(opportunity, opportunity.territory) });
  }

  const themeHits = values(profile.themes).filter((theme) => plain(opportunityText).includes(plain(theme)));
  if (themeHits.length) {
    score += Math.min(30, 15 + themeHits.length * 5);
    reasons.push({ code: "themes", text: `Coincidencias temáticas: ${themeHits.slice(0, 4).join(", ")}.`, evidence: evidence(opportunity, opportunity.criteriaText || opportunityText) });
  } else {
    missingInformation.push("Revisar si las actividades elegibles encajan con los programas aprobados de la entidad.");
  }

  const legalHit = firstHit(opportunity.eligibilityText, profile.legalForms);
  if (legalHit) {
    score += 15;
    reasons.push({ code: "legal_form", text: `La forma jurídica ${legalHit} aparece en la elegibilidad.`, evidence: evidence(opportunity, opportunity.eligibilityText) });
  } else if (opportunity.eligibilityText) {
    risks.push({ code: "legal_form", text: "La forma jurídica de la entidad no aparece confirmada en la elegibilidad extraída.", evidence: evidence(opportunity, opportunity.eligibilityText) });
  } else {
    missingInformation.push("Comprobar beneficiarios y forma jurídica admitida en las bases.");
  }

  const activityHit = firstHit(opportunityText, [...values(profile.programs), ...values(profile.collectives)]);
  if (activityHit) {
    score += 10;
    reasons.push({ code: "activity", text: `Señal de actividad o colectivo: ${activityHit}.`, evidence: evidence(opportunity, opportunity.criteriaText || opportunityText) });
  }
  if (opportunity.officialUrl || opportunity.sourceUrl) score += 5;

  const boundedScore = Math.max(0, Math.min(100, score));
  const recommendationStatus = boundedScore >= 60 ? "candidate" : boundedScore >= 35 ? "review" : "low_fit";
  return {
    score: boundedScore,
    recommendationStatus,
    reasons,
    risks,
    missingInformation,
    evidence: [...reasons, ...risks].map((item) => item.evidence).filter(Boolean),
    internalFactRefs: values(profile.approvedFactRefs),
    humanReviewStatus: "pending",
    advisoryOnly: true
  };
}
