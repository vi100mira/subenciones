import { classifyDocumentRequirement } from "../workers/document-requirement-classifier.mjs";

const core = (pattern) => ({ pattern, coreEvidence: true });

const SECTION_RULES = {
  beneficiaries: [core(/(?:^|\n)\s*(?:(?:base|articulo)\s+)?(?:primero|primera|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|sexto|sexta|septimo|septima|octavo|octava|noveno|novena|decimo|decima|\d+)[.)ºª -]*(?:requisitos (?:y|de (?:las|los)) )?beneficiari[oa]s?\b/), core(/(?:^|\n)\s*clausula\s*\d+[.)ºª -]*(?:asociaciones y entidades )?beneficiari[oa]s?\b/), core(/(?:^|\n)\s*beneficiari[oa]s?\.?\s*(?:\n|$)/), core(/requisitos (?:especificos )?para obtener la condicion de beneficiari/), core(/requisitos para solicitar (?:la|las|esta) subvencion/), core(/requisitos generales y comunes a las prestaciones/), core(/requisitos de (?:las )?(?:personas|entidades|sujetos) beneficiari/), core(/requisitos de (?:los|las) (?:solicitantes|participantes)/), core(/requisitos de (?:las )?(?:personas|administraciones y entidades) participantes/), core(/entidades beneficiarias, requisitos/), core(/sujetos beneficiarios/), core(/seran (?:(?:personas|entidades|sujetos)\s+)?beneficiari/), core(/podran ser beneficiari/), core(/pueden ser beneficiari/), core(/podran beneficiarse de (?:las )?subvencion(?:es)?/), core(/podran ser solicitantes? (?:de|del|para)/), core(/podran presentar una solicitud de ayuda/), core(/podran participar (?:las|los|les|els)/), core(/personas? beneficiarias? deberan cumplir los siguientes requisitos/), core(/podran obtener la condicion de beneficiari/), core(/podran solicitar (?:estas )?subvencion(?:es)?/), core(/podran optar a (?:(?:las )?subvencion(?:es)?|los premios)/), core(/solicitantes? y (?:posibles )?beneficiari[oa]s?/), /personas? beneficiarias?/, /entidades? solicitantes?/],
  eligibilityRequirements: [/requisitos? (?:de las personas|de las entidades|para obtener)/, /deberan reunir/, /no podran obtener la condicion/],
  eligibleActivities: [core(/actuaciones? subvencionables?/), core(/actuacions? subvencionables?/), core(/proyectos? subvencionables?/), core(/(?:^|\n)\s*(?:(?:base|articulo|clausula)\s+)?(?:primero|primera|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|\d+)[.)ºª -]*(?:objeto|finalidad|obxecto|finalidade|objecte|finalitat)\b/), core(/(?:^|\n)\s*(?:objeto|finalidad)\s*[:.]?\s*(?:\n|$)/), core(/articulo\s*\d+[.) -]+(?:el )?(?:objeto|finalidad)\b/), core(/objeto(?:, condiciones)? y finalidad/), core(/objeto de (?:esta|las bases|la convocatoria|la subvencion)/), core(/(?:constituye|tiene como) (?:el|su) objeto/), core(/(?:es|tiene por) objeto de? (?:esta|la presente)/), core(/(?:el objeto de|la presente) (?:esta |la presente )?convocatoria/), core(/las ayudas que se convocan tendran por objeto/), core(/el objeto es/), core(/(?:podran?|seran) ser objeto de subvencion/), core(/conceptos? subvencionables? (?:lo )?constituyen?/), core(/la subvencion tiene por finalidad/)],
  requiredDocuments: [core(/documentacion (?:que debe|a presentar|a aportar|exigida|requerida)/), core(/(?:^|\n)\s*(?:articulo|base)\s+\d+[.)ºª -]*documentacion\b/), core(/para solicitar cualquiera de las ayudas[^.\n]{0,160}aportar los siguientes documentos/), core(/(?:^|\n)\s*(?:(?:base|article)\s+)?(?:vuitena|8)[.)ºª -]*documentacio\b/), core(/documentacio comuna a les dues linies d.?ajut/), core(/documentacio que cal afegir a la linia d.?ajuts/), core(/documentacio preceptiva que s.?assenyala a continuacio/), core(/(?:entidades|personas) solicitantes deberan presentar la siguiente documentacion/), core(/solicitudes? y documentacion/), core(/presentacion de solicitudes y documentacion/), core(/solicitud(?:es)? (?:se )?acompanara/), core(/solicitudes? (?:deberan )?ir(?:an)? acompanadas? (?:de|por)/), core(/sol[^a-z0-9]{0,3}licituds?[^.\n]{0,100}hauran d.?anar acompanyades? de[^.\n]{0,40}documentaci/), core(/solicitudes?[^.\n]{0,80}acompanaran los documentos/), core(/junto con la solicitud[,:]?\s*se acompanara/), core(/junto con la solicitud se deberan adjuntar/), core(/el formulario de solicitud incorporara/), core(/solicitud[^.\n]{0,100}debera ir acompanada de la documentacion/), core(/deberan acompanarse de la documentacion que se indica/), core(/(?:debe|debera|deberan) acompanarse de los siguientes documentos/), core(/aportaran junto con la solicitud/), core(/documentacion adicional que se adjuntara/), core(/documentos? que (?:deben|deberan) acompanarse/), core(/debera (?:aportarse|adjuntar)/), core(/anexos? obligatorios?/)],
  evaluationCriteria: [/criterios? de valoracion/, /criterios? de evaluacion/, /baremacion/, /puntuacion maxima/],
  budgetRules: [/gastos? subvencionables?/, /costes? elegibles?/, /cuantia (?:maxima|de la subvencion)/, /importe maximo/, /cofinanciacion/],
  submission: [core(/forma y plazo de presentacion/), core(/lugar y plazo de presentacion/), core(/presentacion de (?:las )?solicitudes/), core(/presentacio de sol[^a-z0-9]{0,3}licituds/), core(/plazo de presentacion de (?:las )?(?:solicitudes|instancias)/), core(/plazo (?:inicial )?para presentar solicitudes/), core(/periodo de solicitud/), core(/solicitudes? se (?:podran )?presentar/), /sede electronica/, /registro electronico/, /registre electronic/],
  obligations: [/obligaciones? de (?:las personas|los beneficiarios|la entidad)/, /justificacion de la subvencion/, /plazo de justificacion/],
  exclusions: [/gastos? no subvencionables?/, /exclusiones?/, /incompatibilidades?/, /no seran subvencionables?/]
};

const CORE_SECTIONS = ["beneficiaries", "eligibleActivities", "requiredDocuments", "submission"];

function plain(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function clean(value = "") {
  return String(value).replace(/-\s*\n\s*/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function flexibleWhitespace(source) {
  let inClass = false;
  let escaped = false;
  let output = "";
  for (const character of source) {
    if (escaped) {
      output += character;
      escaped = false;
    } else if (character === "\\") {
      output += character;
      escaped = true;
    } else if (character === "[") {
      output += character;
      inClass = true;
    } else if (character === "]") {
      output += character;
      inClass = false;
    } else {
      output += character === " " && !inClass ? "\\s+" : character;
    }
  }
  return output;
}

function sentenceBreak(after, minimum) {
  const matcher = /(?<!\d)\.\s+/g;
  for (const match of after.matchAll(matcher)) if (match.index >= minimum) return match.index + 1;
  return -1;
}

function evidenceExcerpt(text, index, matchLength, section) {
  const documentMode = section === "requiredDocuments";
  const before = text.slice(Math.max(0, index - 220), index);
  const afterMaximum = documentMode ? 1500 : 620;
  const after = text.slice(index + matchLength, Math.min(text.length, index + matchLength + afterMaximum));
  const startBreak = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("."), before.lastIndexOf(";"));
  const minimum = documentMode ? 500 : 80;
  const endings = [after.indexOf("\n\n"), sentenceBreak(after, minimum), after.indexOf("; ")].filter((value) => value >= minimum);
  const fallback = documentMode ? 1300 : 520;
  const endBreak = endings.length ? Math.min(...endings) + 1 : Math.min(after.length, fallback);
  return clean(`${before.slice(startBreak + 1)}${text.slice(index, index + matchLength)}${after.slice(0, endBreak)}`).slice(0, documentMode ? 1800 : 900);
}

function evidenceItem(page, match, options, coreEvidence, section) {
  const excerpt = evidenceExcerpt(page.text, match.index, match[0].length, section);
  return {
    text: excerpt,
    sourceUrl: options.sourceUrl || null,
    documentSha256: options.documentSha256 || null,
    sourcePage: page.page ?? null,
    evidenceExcerpt: excerpt,
    confidence: coreEvidence || /^\s*(?:\d+[.)-]?\s*)?(?:requisitos|documentacion|criterios|gastos|obligaciones|forma y plazo)/i.test(excerpt) ? "high" : "medium",
    coreEvidence
  };
}

function dedupe(items) {
  const seen = new Set();
  return [...items].sort((a, b) => Number(b.coreEvidence) - Number(a.coreEvidence)).filter((item) => {
    const key = plain(item.text).replace(/\W/g, "").slice(0, 180);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function refineDocumentMentions(items) {
  const classified = dedupe(items).map((item) => {
    const documentClassification = classifyDocumentRequirement(item);
    return { ...item, documentClassification, coreEvidence: Boolean(item.coreEvidence && documentClassification.planningReady) };
  });
  return {
    requiredDocuments: classified.filter((item) => item.documentClassification.phase === "application"),
    excludedDocumentMentions: classified.filter((item) => item.documentClassification.phase !== "application")
  };
}

function continuedDocumentLists(pages, options) {
  const header = /(?:a la solicitud[\s\S]{0,120}siguiente documentacion|junto con la solicitud[\s\S]{0,120}siguiente documentacion|para solicitar cualquiera de las ayudas[\s\S]{0,180}aportar los siguientes documentos|(?:entidades|personas) solicitantes deberan presentar la siguiente documentacion|sol.?licituds?[\s\S]{0,180}acompanyades[\s\S]{0,60}seguent documentacio)/;
  const items = [];
  for (let index = 0; index < pages.length - 1; index += 1) {
    if (!header.test(plain(pages[index].text))) continue;
    const nextPage = pages[index + 1];
    const excerpt = clean(nextPage.text).slice(0, 1800);
    const classification = classifyDocumentRequirement(excerpt);
    if (!classification.planningReady) continue;
    items.push({ text: excerpt, sourceUrl: options.sourceUrl || null, documentSha256: options.documentSha256 || null,
      sourcePage: nextPage.page ?? null, continuedFromPage: pages[index].page ?? null, evidenceExcerpt: excerpt,
      confidence: "high", coreEvidence: true });
  }
  return items;
}

function officialProcedureDocuments(pages, options) {
  const items = [];
  for (const page of pages) {
    const normalized = plain(page.text);
    const start = normalized.search(/documentaci.n (?:opcional|obligatoria)/);
    if (!/c.digo sia/.test(normalized) || start < 0) continue;
    const endMatch = normalized.slice(start).search(/\nnormativa aplicable\b/);
    const block = page.text.slice(start, endMatch > 0 ? start + endMatch : undefined);
    for (const rawLine of block.split(/\r?\n/)) {
      const line = clean(rawLine).replace(/^[•·*-]+\s*/, "");
      const key = plain(line);
      if (line.length < 8 || /^(?:documentaci.n (?:opcional|obligatoria)|adicionalmente|requisito de validez|original o copia|copia simple|esta administracion|ver normativa)/.test(key)) continue;
      items.push({ text: `Documentacion de solicitud en ficha oficial SIA: ${line}`, sourceUrl: options.sourceUrl || null,
        documentSha256: options.documentSha256 || null, sourcePage: page.page ?? null, evidenceExcerpt: line,
        confidence: "high", coreEvidence: true, sourceKind: "official_procedure",
        conditional: /si procede|en el caso|cuando corresponda|en algunos casos/.test(key) });
    }
  }
  const seenHeadings = new Set();
  return dedupe(items).filter((item) => {
    const heading = plain(item.evidenceExcerpt).split(/[^a-z0-9]+/).filter((token) => token.length > 2).slice(0, 8).join(" ");
    if (!heading || seenHeadings.has(heading)) return false;
    seenHeadings.add(heading);
    return true;
  }).slice(0, 24);
}

function officialProcedureInfo(pages) {
  const match = plain(pages.map((page) => page.text).join("\n")).match(/c.digo sia\s*:?\s*(\d{5,})/);
  return match ? { siaCode: match[1], applicationFormAccess: "requires_portal_interaction" } : null;
}

function summarize(sections) {
  const covered = Object.entries(sections).filter(([, items]) => items.length).map(([key]) => key);
  const coreCovered = CORE_SECTIONS.filter((key) => sections[key].some((item) => item.coreEvidence));
  const missingCore = CORE_SECTIONS.filter((key) => !coreCovered.includes(key));
  return {
    status: missingCore.length ? "partial_requires_review" : "extracted_requires_review",
    documentaryGate: missingCore.length ? "blocked_missing_core_requirements" : "requirements_extracted_for_review",
    requiresHumanReview: true,
    coveredSections: covered,
    coreCoveredSections: coreCovered,
    missingCoreSections: missingCore
  };
}

function publicationReference(pages, options) {
  for (const page of pages) {
    const text = plain(page.text);
    const match = text.match(/(?:proceder a la publicacion|se encontraran a disposicion)[\s\S]{0,650}(?:boletin oficial|pagina web|tablon de anuncios)/);
    if (!match) continue;
    const excerpt = clean(page.text.slice(match.index, match.index + Math.min(match[0].length + 180, 900)));
    const channels = [];
    if (/boletin oficial/.test(match[0])) channels.push("official_journal");
    if (/pagina web/.test(match[0])) channels.push("issuing_body");
    if (/tablon de anuncios/.test(match[0])) channels.push("electronic_noticeboard");
    return { text: excerpt, sourceUrl: options.sourceUrl || null, sourcePage: page.page ?? null,
      documentSha256: options.documentSha256 || null, channels };
  }
  return null;
}

function documentRecovery(sections, excludedDocumentMentions = [], publication = null, context = {}) {
  const application = sections.requiredDocuments || [];
  const ready = application.filter((item) => item.documentClassification?.planningReady);
  const references = application.filter((item) => item.documentClassification?.specificity === "reference_only");
  const contextual = excludedDocumentMentions.filter((item) => item.documentClassification?.phase === "contextual");
  const postAward = excludedDocumentMentions.filter((item) => item.documentClassification?.phase === "post_award");
  const status = ready.length ? "application_documents_detected"
    : references.length ? "cross_reference_only"
    : context.officialNotice ? "official_notice_without_application_documents"
    : publication ? "awaiting_official_publication"
    : contextual.length ? "context_only"
    : postAward.length ? "post_award_only"
    : "not_found_in_evidence";
  const nextAction = status === "application_documents_detected" ? "review_and_approve_citations"
    : status === "cross_reference_only" ? "locate_referenced_official_source"
    : status === "official_notice_without_application_documents" ? "locate_full_bases_and_application_form"
    : status === "awaiting_official_publication" ? "monitor_official_publication_channels"
    : "locate_application_bases_or_form";
  return {
    status,
    nextAction,
    requiresAdditionalOfficialSource: status !== "application_documents_detected",
    planningReadyCount: ready.length,
    referenceCount: references.length,
    contextualCount: contextual.length,
    postAwardCount: postAward.length,
    publicationChannels: publication?.channels || [],
    publicationEvidence: publication ? { text: publication.text, sourceUrl: publication.sourceUrl, sourcePage: publication.sourcePage, documentSha256: publication.documentSha256 } : null,
    officialNoticeLocated: Boolean(context.officialNotice),
    references: references.slice(0, 6).map((item) => ({
      text: item.text,
      sourceUrl: item.sourceUrl,
      sourcePage: item.sourcePage,
      documentSha256: item.documentSha256,
      reason: item.documentClassification?.reason
    }))
  };
}

export function extractGrantRequirements(text = "", options = {}) {
  const pages = options.pageEvidence?.length
    ? options.pageEvidence.map((page) => ({ page: page.page, text: page.text || "" }))
    : [{ page: null, text }];
  const sections = Object.fromEntries(Object.keys(SECTION_RULES).map((key) => [key, []]));
  const ruleHits = new Map();

  for (const page of pages) {
    const normalized = plain(page.text);
    for (const [section, rules] of Object.entries(SECTION_RULES)) {
      for (const [ruleIndex, rule] of rules.entries()) {
        const ruleKey = `${section}:${ruleIndex}`;
        if ((ruleHits.get(ruleKey) || 0) >= 12) continue;
        const pattern = rule.pattern || rule;
        const matcher = new RegExp(flexibleWhitespace(pattern.source), "gi");
        for (const match of normalized.matchAll(matcher)) {
          sections[section].push(evidenceItem(page, match, options, Boolean(rule.coreEvidence), section));
          ruleHits.set(ruleKey, (ruleHits.get(ruleKey) || 0) + 1);
          if (ruleHits.get(ruleKey) >= 12) break;
        }
      }
    }
  }
  const procedureDocuments = officialProcedureDocuments(pages, options);
  sections.requiredDocuments = procedureDocuments.length
    ? procedureDocuments
    : [...sections.requiredDocuments, ...continuedDocumentLists(pages, options)];
  for (const key of Object.keys(sections)) sections[key] = dedupe(sections[key]).slice(0, key === "requiredDocuments" ? 20 : 8);
  const refined = refineDocumentMentions(sections.requiredDocuments);
  sections.requiredDocuments = refined.requiredDocuments.slice(0, 24);
  const excludedDocumentMentions = refined.excludedDocumentMentions.slice(0, 20);
  const officialNotice = options.sourceAuthority === "official_journal"
    && sections.beneficiaries.some((item) => item.coreEvidence)
    && sections.submission.some((item) => item.coreEvidence);
  return { schemaVersion: 3, ...summarize(sections), documentRecovery: documentRecovery(sections, excludedDocumentMentions, publicationReference(pages, options), { officialNotice }),
    officialProcedure: officialProcedureInfo(pages), sections, excludedDocumentMentions };
}

export function combineGrantRequirements(contracts = []) {
  const sections = Object.fromEntries(Object.keys(SECTION_RULES).map((key) => [key, []]));
  const excludedDocumentMentions = [];
  for (const contract of contracts.filter(Boolean)) {
    for (const key of Object.keys(sections)) sections[key].push(...(contract.sections?.[key] || []));
    excludedDocumentMentions.push(...(contract.excludedDocumentMentions || []));
  }
  for (const key of Object.keys(sections)) sections[key] = dedupe(sections[key]).slice(0, key === "requiredDocuments" ? 24 : 12);
  const refined = refineDocumentMentions(sections.requiredDocuments);
  sections.requiredDocuments = refined.requiredDocuments.slice(0, 20);
  const combinedExcluded = dedupe([...excludedDocumentMentions, ...refined.excludedDocumentMentions]).slice(0, 40);
  const publication = contracts.map((contract) => contract.documentRecovery?.publicationEvidence ? { ...contract.documentRecovery.publicationEvidence, channels: contract.documentRecovery.publicationChannels || [] } : null).find(Boolean);
  const officialNotice = contracts.some((contract) => contract.documentRecovery?.officialNoticeLocated);
  const officialProcedure = contracts.map((contract) => contract.officialProcedure).find(Boolean) || null;
  return { schemaVersion: 3, ...summarize(sections), documentRecovery: documentRecovery(sections, combinedExcluded, publication, { officialNotice }), sections,
    officialProcedure, excludedDocumentMentions: combinedExcluded };
}
