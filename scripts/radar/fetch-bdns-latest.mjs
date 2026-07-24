import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API_BASE = "https://www.infosubvenciones.es/bdnstrans/api";
const PORTAL = "GE";
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));

const pages = Number(args.get("pages") || 1);
const pageSize = Number(args.get("page-size") || 25);
const maxDetails = Number(args.get("max-details") || pages * pageSize);
const outDir = args.get("out-dir") || "data/public-radar";
const prototypeOut = args.get("prototype-out") || "prototype/radar-data.js";
const campaign = args.get("campaign") || "";
const mode = campaign ? "search" : args.get("mode") || "latest";
const campaignDescriptions = campaign === "municipal-social"
  ? ["accion social", "inclusion", "empleo", "asociaciones", "entidades sin animo de lucro"]
  : campaign === "general-social" ? ["social"]
  : [];
const detailDelayMs = Number(args.get("detail-delay-ms") || 250);
const retryCount = Number(args.get("retries") || 2);
const detailIds = (args.get("detail-ids") || "").split(",").map((value) => value.trim()).filter(Boolean);
const today = args.get("today") || new Date().toISOString().slice(0, 10);
const currentYear = Number(today.slice(0, 4));

function apiUrl(endpoint, params) {
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

async function getJson(url) {
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (response.ok) return response.json();
    if (response.status !== 429 || attempt === retryCount) throw new Error(`BDNS ${response.status} en ${url}`);
    await sleep(700 * (attempt + 1));
  }
  throw new Error(`BDNS sin respuesta en ${url}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function textList(items, field = "descripcion") {
  return Array.isArray(items) ? items.map((item) => item?.[field]).filter(Boolean) : [];
}

function normalizeDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function addDays(isoDate, days) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function plainText(value) {
  return typeof value === "string" ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function urlsFrom(value) {
  return typeof value === "string"
    ? [...value.matchAll(/https?:\/\/[^\s,;]+/g)].map((match) => match[0].replace(/[.)]+$/, ""))
    : [];
}

export function documentDownloadUrl(id) {
  return id ? `${API_BASE}/convocatorias/documentos?idDocumento=${encodeURIComponent(id)}` : "";
}

function documentLabel(document) {
  return `${document.description || ""} ${document.filename || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function declaredSpanishCall(document) {
  return /documento de la convocatoria en espanol|texto en castellano de la convocatoria/.test(documentLabel(document));
}

function applicationDocument(document) {
  return /documentacion a presentar|\bsolicitud\b|ficha terceros|declaracion responsable|memoria (?:tecnica|del proyecto)|modalidad \d|anexo (?:i{1,3}|[123])\b/.test(documentLabel(document));
}

function regulatoryDocument(document) {
  return /\b(bases|normas|ordenanza)\b/.test(documentLabel(document));
}

function excludedDocument(document) {
  return /extracto|cuenta justificativa|justificacion|certificado de difusion|aceptacion|reformulacion|resolucion de concesion|concesion (?:provisional|definitiva)|correccion/.test(documentLabel(document));
}

export function primaryCallDocument(documents) {
  const score = (document) => {
    const text = documentLabel(document);
    if (excludedDocument(document) && !declaredSpanishCall(document)) return -1;
    let value = 0;
    if (declaredSpanishCall(document)) value += 140;
    if (regulatoryDocument(document)) value += 120;
    if (/convocatoria/.test(text)) value += 60;
    if (/lengua cooficial|otra lengua|euskera/.test(text)) value -= 80;
    return value;
  };
  return [...documents].map((document) => ({ document, score: score(document) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.document.id).localeCompare(String(b.document.id)))[0]?.document || null;
}

export function callDocumentSet(documents) {
  const primary = primaryCallDocument(documents);
  if (!primary) return [];
  const hasSpanishCall = documents.some(declaredSpanishCall);
  const selected = documents.filter((document) => {
    if (document.id === primary.id) return true;
    const text = documentLabel(document);
    if (excludedDocument(document)) return false;
    if (hasSpanishCall && /lengua cooficial|otra lengua|euskera/.test(text)) return false;
    return declaredSpanishCall(document) || regulatoryDocument(document) || applicationDocument(document)
      || (/convocatoria/.test(text) && !/extracto/.test(text));
  });
  return [primary, ...selected.filter((document) => document.id !== primary.id)]
    .filter((document, index, list) => list.findIndex((candidate) => candidate.id === document.id) === index)
    .slice(0, 8);
}

export function isSpecificOfficialDocumentUrl(value) {
  try {
    const url = new URL(value);
    const pathAndQuery = `${url.pathname}${url.search}`.toLowerCase();
    if (url.pathname === "/" || /^\/(?:info\.0|portalbop)\/?$/i.test(url.pathname)) return false;
    return /\.pdf(?:$|[?#])|preview-document|download|document|anuncio|boletines?\//.test(pathAndQuery);
  } catch {
    return false;
  }
}

function basisDocumentRole(document, primary) {
  if (document.id === primary?.id) return "primary";
  if (applicationDocument(document)) return "application_form";
  if (regulatoryDocument(document)) return "regulatory";
  return "call";
}

export function buildBasisDocuments(documents, regulatoryBasesUrls = []) {
  const callDocuments = callDocumentSet(documents);
  const primaryDocument = callDocuments[0] || null;
  const registryDocuments = callDocuments.map((document) => ({
    id: document.id,
    url: document.downloadUrl,
    role: basisDocumentRole(document, primaryDocument),
    description: document.description,
    filename: document.filename
  }));
  const seenUrls = new Set(registryDocuments.map((document) => document.url));
  const externalRegulations = regulatoryBasesUrls
    .filter((url) => isSpecificOfficialDocumentUrl(url) && !seenUrls.has(url))
    .map((url, index) => ({
      id: null,
      url,
      role: registryDocuments.length || index ? "regulatory" : "primary",
      description: "Bases reguladoras oficiales",
      filename: ""
    }));
  return [...registryDocuments, ...externalRegulations].slice(0, 8);
}

function isCompetitive(detail) {
  const type = `${detail.tipoConvocatoria || ""} ${detail.descripcion || ""}`.toLowerCase();
  return !/concesion directa|concesión directa|instrumental|nominativa|convenio de colaboracion|convenio de colaboración/.test(type);
}

function addWorkingDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (![0, 6].includes(date.getUTCDay())) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

function dateFromSpanishText(value = "") {
  const text = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const numeric = text.match(/(?:hasta(?:\s+el)?\s+)?(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  const months = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const written = text.match(/(?:hasta(?:\s+el)?\s+)?(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(20\d{2})/);
  return written && months[written[2]] ? `${written[3]}-${String(months[written[2]]).padStart(2, "0")}-${written[1].padStart(2, "0")}` : null;
}

function matchingTokens(value = "") {
  const weak = new Set(["convocatoria", "subvenciones", "ayudas", "bases", "municipales", "programa", "para", "del", "2023", "2026", "2027"]);
  return [...new Set(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .split(/[^a-z0-9]+/).filter((token) => token.length >= 4 && !weak.has(token)))];
}

export function resolveCorunaReferenceFromHtml(item, html) {
  const announcementText = (item.announcements || []).map((entry) => `${entry.officialJournal || ""} ${entry.textPreview || ""}`).join(" ");
  if (!/b\.?o\.?p\.?[^.]{0,40}(?:a\s+)?coru[nñ]a/i.test(announcementText)) return "";
  const citedDate = dateFromSpanishText(announcementText);
  if (!citedDate) return "";
  const targetTokens = matchingTokens(`${item.organism || ""} ${item.title || ""}`);
  const candidates = [...html.matchAll(/<div[^>]+class\s*=\s*["']bloqueAnuncio["'][^>]*>([\s\S]*?)<\/div>/gi)].map((match) => {
    const block = match[1];
    const filename = block.match(/href\s*=\s*["'](20\d{2}_\d{10}\.pdf)["']/i)?.[1] || "";
    const text = plainText(block);
    const score = targetTokens.filter((token) => matchingTokens(text).includes(token)).length;
    return { filename, score };
  }).filter((entry) => entry.filename && entry.score >= 2).sort((a, b) => b.score - a.score || a.filename.localeCompare(b.filename));
  if (!candidates.length || (candidates[1] && candidates[1].score === candidates[0].score)) return "";
  const [year, month, day] = citedDate.split("-");
  return `https://bop.dacoruna.gal/bopportal/publicado/${year}/${month}/${day}/${candidates[0].filename}`;
}

async function resolveOfficialBopReferences(opportunities) {
  for (const item of opportunities.filter((entry) => entry.deadlineStatus === "open" && !entry.basesUrl)) {
    const announcementText = (item.announcements || []).map((entry) => `${entry.officialJournal || ""} ${entry.textPreview || ""}`).join(" ");
    if (!/b\.?o\.?p\.?[^.]{0,40}(?:a\s+)?coru[nñ]a/i.test(announcementText)) continue;
    const citedDate = dateFromSpanishText(announcementText);
    if (!citedDate) continue;
    const [year, month, day] = citedDate.split("-");
    const summaryUrl = `https://bop.dacoruna.gal/bopportal/cambioBoletin?fechaInput=${day}%2F${month}%2F${year}`;
    try {
      const response = await fetch(summaryUrl, { headers: { accept: "text/html" } });
      if (!response.ok) continue;
      const basesUrl = resolveCorunaReferenceFromHtml(item, await response.text());
      if (!basesUrl) continue;
      item.basesUrl = basesUrl;
      item.basesUrls = [basesUrl];
      item.basesStatus = "located";
      item.basesSourceStrategy = "official_bop_reference_resolver";
      item.actionable = true;
    } catch {
      // Network or portal failures preserve review_required; no inferred bases are emitted.
    }
  }
}

function relativeDeadline(detail, announcements) {
  const absolute = dateFromSpanishText(detail.textFin || "");
  if (absolute) return { end: absolute, method: "official_text_absolute" };
  const published = announcements.map((item) => normalizeDate(item.publishedAt)).filter(Boolean).sort().at(-1);
  if (!published) return null;
  const text = (detail.textFin || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = { diez: 10, quince: 15, veinte: 20, treinta: 30, trigesimo: 30 };
  const match = text.match(/(\d+|diez|quince|veinte|treinta|trigesimo)\s+dias?/);
  if (!match) return null;
  const days = Number(match[1]) || words[match[1]];
  const end = text.includes("habil") ? addWorkingDays(published, days) : addDays(published, days).slice(0, 10);
  return { end, method: text.includes("habil") ? "official_announcement_business_days" : "official_announcement_calendar_days", published };
}

function evidenceYear(detail, documents, announcements) {
  const datedValues = [
    detail.fechaInicioSolicitud,
    detail.fechaFinSolicitud,
    detail.fechaRegistro,
    ...documents.flatMap((item) => [item.publishedAt, item.modifiedAt]),
    ...announcements.map((item) => item.publishedAt)
  ].filter(Boolean);
  const years = datedValues.flatMap((value) => String(value).match(/20\d{2}/g) || []).map(Number);
  return years.length ? Math.max(...years) : null;
}

function deadlineStatus(detail, documents, announcements, hasOfficialBases) {
  const derived = relativeDeadline(detail, announcements);
  const end = normalizeDate(detail.fechaFinSolicitud) || derived?.end || null;
  const acceptsOpenApplications = isCompetitive(detail);
  if (end) {
    const open = end >= today && acceptsOpenApplications;
    return { status: open ? "open" : "closed", confidence: derived ? "Media" : "Alta", actionable: open && hasOfficialBases, lifecycle: open ? "current" : acceptsOpenApplications ? "historical" : "not_open_to_applicants", end, deadlineMethod: derived?.method || "structured" };
  }

  const observedYear = evidenceYear(detail, documents, announcements);
  const currentEvidence = observedYear !== null && observedYear >= currentYear;
  if (detail.abierto === true && acceptsOpenApplications && currentEvidence) return { status: "open", confidence: "Media", actionable: hasOfficialBases, lifecycle: "current", end: null, deadlineMethod: "bdns_open_flag" };
  return {
    status: "uncertain",
    confidence: "Baja",
    actionable: false,
    lifecycle: observedYear !== null && observedYear < currentYear ? "historical" : "review_required"
  };
}

function deadlineEvidence(detail, documents, announcements) {
  const announcement = announcements[0];
  const document = documents[0];
  if (announcement) return { label: announcement.officialJournal || "Anuncio oficial", url: announcement.url, date: announcement.publishedAt };
  if (document) return { label: document.description || document.filename || "Documento oficial", url: document.downloadUrl || "", date: document.publishedAt || document.modifiedAt };
  return { label: "Ficha BDNS/SNPSAP", url: `https://www.infosubvenciones.es/bdnstrans/api/convocatorias?vpd=${PORTAL}&numConv=${detail.codigoBDNS}`, date: "" };
}

function deadlineTraceFields(detail, deadline, documents, announcements, generatedAt) {
  const evidence = deadlineEvidence(detail, documents, announcements);
  const resolved = Boolean(deadline.end);
  const status = deadline.status;
  return {
    deadlineObserved: deadline.end ? `${detail.textFin || detail.fechaFinSolicitud || "Plazo"} · fin ${deadline.end}` : detail.textFin || "Plazo no estructurado",
    deadlineEvidenceLabel: evidence.label,
    deadlineEvidenceUrl: evidence.url,
    deadlineEvidenceDate: evidence.date || "",
    deadlineReadAt: generatedAt,
    deadlineNextReviewAt: addDays(generatedAt, status === "closed" ? 7 : 1),
    deadlineUncertaintyReason: resolved ? "" : "BDNS no ofrece fecha fin estructurada o no hay anuncio oficial suficiente para resolver el plazo relativo.",
    deadlineCalculationMethod: deadline.deadlineMethod || "unresolved",
    tenantAlarmPolicy: status === "closed" ? "No alertar salvo reapertura, rectificacion o nueva version." : "Alertar a tenants afectados si cambia fecha fin, texto de plazo, anuncio oficial o confianza."
  };
}

function estimateScore(detail) {
  const haystack = [
    detail.descripcion,
    detail.descripcionFinalidad,
    ...textList(detail.sectores),
    ...textList(detail.tiposBeneficiarios)
  ].join(" ").toLowerCase();
  let score = 45;
  for (const term of ["social", "servicios sociales", "empleo", "inclusion", "formacion", "vulnerab", "humanitaria"]) {
    if (haystack.includes(term)) score += 8;
  }
  if (detail.fechaFinSolicitud) score += 6;
  if (detail.urlBasesReguladoras || detail.sedeElectronica) score += 4;
  return Math.min(score, 92);
}

function normalizeGrant(detail, generatedAt) {
  const title = detail.descripcion || `Convocatoria BDNS ${detail.codigoBDNS}`;
  const territory = textList(detail.regiones).join(", ") || detail.organo?.nivel2 || detail.organo?.nivel1 || "Estatal";
  const beneficiaries = textList(detail.tiposBeneficiarios);
  const sectors = textList(detail.sectores);
  const documents = (detail.documentos || []).map((doc) => ({
    id: doc.id,
    description: doc.descripcion,
    filename: doc.nombreFic,
    sizeBytes: doc.long,
    modifiedAt: doc.datMod,
    publishedAt: doc.datPublicacion,
    downloadUrl: documentDownloadUrl(doc.id)
  }));
  const announcements = (detail.anuncios || []).map((item) => ({
    id: item.numAnuncio,
    title: item.titulo,
    url: item.url,
    cve: item.cve,
    officialJournal: item.desDiarioOficial,
    publishedAt: item.datPublicacion,
    textPreview: plainText(item.texto).slice(0, 900)
  }));
  const regulatoryBasesUrls = urlsFrom(detail.urlBasesReguladoras);
  const basisDocuments = buildBasisDocuments(documents, regulatoryBasesUrls);
  const primaryDocument = basisDocuments.find((document) => document.role === "primary") || null;
  const basesUrls = basisDocuments.map((document) => document.url);
  const basesUrl = basesUrls[0] || "";
  const deadline = deadlineStatus(detail, documents, announcements, basesUrls.length > 0);
  const evidence = [
    `BDNS ${detail.codigoBDNS}: ${title}`,
    detail.descripcionFinalidad ? `Finalidad: ${detail.descripcionFinalidad}` : "",
    beneficiaries.length ? `Beneficiarios: ${beneficiaries.join("; ")}` : "",
    detail.textFin ? `Plazo indicado: ${detail.textFin}` : ""
  ].filter(Boolean);

  const trace = deadlineTraceFields(detail, deadline, documents, announcements, generatedAt);

  return {
    id: `bdns-${detail.codigoBDNS}`,
    sourceId: "bdns-snpsap",
    source: "BDNS/SNPSAP",
    title,
    organism: [detail.organo?.nivel1, detail.organo?.nivel2, detail.organo?.nivel3].filter(Boolean).join(" / "),
    territory,
    administrationLevel: detail.organo?.nivel1 || "",
    sector: sectors.join(", ") || detail.descripcionFinalidad || "Sin clasificar",
    beneficiaryTypes: beneficiaries,
    objective: detail.descripcionFinalidad || title,
    eligibleActivities: textList(detail.objetivos),
    budgetTotal: detail.presupuestoTotal ?? null,
    amount: detail.presupuestoTotal ? `${Number(detail.presupuestoTotal).toLocaleString("es-ES")} EUR presupuesto` : "No indicado",
    deadlineStart: normalizeDate(detail.fechaInicioSolicitud),
    deadlineEnd: deadline.end,
    deadline: deadline.end || detail.textFin || "Plazo no estructurado",
    deadlineStatus: deadline.status,
    deadlineConfidence: deadline.confidence,
    actionable: deadline.actionable,
    lifecycleStatus: deadline.lifecycle,
    sourceAuthority: "official_registry",
    basesStatus: basesUrl ? "located" : "missing",
    applicationAccessStatus: isCompetitive(detail) ? "competitive_or_open_call" : "not_open_to_applicants",
    ...trace,
    officialUrl: `https://www.infosubvenciones.es/bdnstrans/api/convocatorias?vpd=${PORTAL}&numConv=${detail.codigoBDNS}`,
    basesUrl,
    basesUrls,
    basisDocuments,
    supplementaryBasesUrls: primaryDocument?.id ? regulatoryBasesUrls : [],
    basesSourceStrategy: primaryDocument?.id ? "bdns_call_document_set" : regulatoryBasesUrls.length ? "official_regulatory_url" : "missing",
    applicationUrl: detail.sedeElectronica || "",
    documents,
    announcements,
    theme: detail.descripcionFinalidad || sectors[0] || "Subvencion publica",
    score: estimateScore(detail),
    fit: [
      `Fuente oficial BDNS/SNPSAP con codigo ${detail.codigoBDNS}.`,
      territory ? `Territorio detectado: ${territory}.` : "Territorio pendiente de revisar.",
      beneficiaries.length ? `Tipo de beneficiario: ${beneficiaries.join("; ")}.` : "Tipo de beneficiario pendiente de revisar."
    ],
    risks: [
      deadline.confidence === "Alta" ? "Revisar requisitos y anexos antes de decidir candidatura." : "Plazo no estructurado o relativo: requiere lectura de bases/anuncio.",
      detail.sePublicaDiarioOficial ? "Puede depender de publicacion en diario oficial." : "Confirmar si hay publicacion o sede adicional."
    ],
    evidence,
    internalFacts: ["Perfil minimo entidad"],
    extractedText: [
      title,
      detail.descripcionFinalidad,
      detail.descripcionBasesReguladoras,
      ...announcements.map((item) => item.textPreview)
    ].filter(Boolean).join("\n\n")
  };
}

function searchParams(page, description = args.get("descripcion")) {
  return {
    page,
    pageSize,
    vpd: PORTAL,
    descripcion: description,
    descripcionTipoBusqueda: args.get("descripcion-tipo") || (description ? 1 : undefined),
    numeroConvocatoria: args.get("numero-convocatoria"),
    mrr: args.get("mrr"),
    contribucion: args.get("contribucion"),
    fechaDesde: args.get("fecha-desde"),
    fechaHasta: args.get("fecha-hasta"),
    tipoAdministracion: campaign === "municipal-social" ? "L" : campaign === "general-social" ? undefined : args.get("tipo-administracion") || "C",
    organos: args.get("organos"),
    regiones: args.get("regiones"),
    tiposBeneficiario: args.get("tipos-beneficiario"),
    instrumentos: args.get("instrumentos"),
    finalidad: args.get("finalidad"),
    ayudaEstado: args.get("ayuda-estado")
  };
}

function qualitySummary(opportunities, listedCount, uniqueListedCount, detailErrors) {
  const byStatus = {};
  const byAdministration = {};
  for (const item of opportunities) {
    byStatus[item.deadlineStatus] = (byStatus[item.deadlineStatus] || 0) + 1;
    const admin = item.administrationLevel || "Sin nivel";
    byAdministration[admin] = (byAdministration[admin] || 0) + 1;
  }
  return {
    listedCount,
    normalizedCount: opportunities.length,
    uniqueListedCount,
    duplicateCount: listedCount - uniqueListedCount,
    detailErrorCount: detailErrors.length,
    byStatus,
    byAdministration,
    withStructuredDeadline: opportunities.filter((item) => item.deadlineEnd).length,
    withBasesUrl: opportunities.filter((item) => item.basesUrl).length,
    withDocuments: opportunities.filter((item) => item.documents.length).length,
    withAnnouncements: opportunities.filter((item) => item.announcements.length).length,
    uncertainDeadline: opportunities.filter((item) => item.deadlineStatus === "uncertain").length,
    actionableCount: opportunities.filter((item) => item.actionable).length,
    historicalCount: opportunities.filter((item) => item.lifecycleStatus === "historical").length
  };
}

async function main() {
  const listed = [];
  let totalElements = null;
  const queryTotals = [];
  const descriptions = campaignDescriptions.length ? campaignDescriptions : [args.get("descripcion")];
  if (detailIds.length) {
    listed.push(...detailIds.map((numeroConvocatoria) => ({ numeroConvocatoria })));
    totalElements = detailIds.length;
  } else {
    for (const description of descriptions) {
      for (let page = 0; page < pages; page += 1) {
        const endpoint = mode === "search" ? "/convocatorias/busqueda" : "/convocatorias/ultimas";
        const params = mode === "search" ? searchParams(page, description) : { page, pageSize, vpd: PORTAL };
        const url = apiUrl(endpoint, params);
        const payload = await getJson(url);
        totalElements = descriptions.length === 1 ? payload.totalElements ?? totalElements : null;
        if (page === 0) queryTotals.push({ description: description || null, totalElements: payload.totalElements ?? null });
        listed.push(...(payload.content || []));
      }
    }
  }

  const unique = [...new Map(listed.map((item) => [item.numeroConvocatoria, item])).values()];
  const selected = unique.slice(0, maxDetails);
  const details = [];
  const detailErrors = [];
  for (const item of selected) {
    if (detailDelayMs > 0) await sleep(detailDelayMs);
    const url = apiUrl("/convocatorias", { vpd: PORTAL, numConv: item.numeroConvocatoria });
    try {
      details.push(await getJson(url));
    } catch (error) {
      detailErrors.push({ numeroConvocatoria: item.numeroConvocatoria, message: error.message });
    }
  }

  const generatedAt = new Date().toISOString();
  const opportunities = details.map((detail) => normalizeGrant(detail, generatedAt));
  await resolveOfficialBopReferences(opportunities);
  const query = mode === "search" ? { ...searchParams(0, descriptions[0]), descriptions } : { pageSize, vpd: PORTAL };
  const dataset = {
    generatedAt,
    source: "BDNS/SNPSAP",
    apiBase: API_BASE,
    mode,
    query,
    pages,
    pageSize,
    totalElements,
    queryTotals,
    count: opportunities.length,
    quality: qualitySummary(opportunities, listed.length, unique.length, detailErrors),
    detailErrors,
    opportunities
  };

  await fs.mkdir(outDir, { recursive: true });
  const outputName = args.get("output-name") || (campaign ? `bdns-${campaign}.json` : mode === "search" ? "bdns-search.json" : "bdns-latest.json");
  await fs.writeFile(path.join(outDir, outputName), `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  const prototypeDataset = {
    ...dataset,
    historicalCount: opportunities.filter((item) => item.lifecycleStatus === "historical").length,
    opportunities: opportunities.filter((item) => item.actionable)
  };
  await fs.writeFile(prototypeOut, `window.RADAR = ${JSON.stringify(prototypeDataset, null, 2)};\nwindow.RADAR_PLATFORM_OPPORTUNITIES = window.RADAR.opportunities.map((item) => ({ ...item }));\n`, "utf8");
  console.log(JSON.stringify({ generatedAt, mode, totalElements, count: opportunities.length, quality: dataset.quality, output: path.join(outDir, outputName), prototypeOut }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
