import fs from "node:fs/promises";
import path from "node:path";

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
const mode = args.get("mode") || "latest";
const detailDelayMs = Number(args.get("detail-delay-ms") || 250);
const retryCount = Number(args.get("retries") || 2);

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

function deadlineStatus(detail) {
  const end = normalizeDate(detail.fechaFinSolicitud);
  if (!end) return { status: detail.abierto ? "open" : "uncertain", confidence: detail.abierto ? "Media" : "Baja" };
  const today = new Date().toISOString().slice(0, 10);
  return { status: end >= today ? "open" : "closed", confidence: "Alta" };
}

function deadlineEvidence(detail, documents, announcements) {
  const announcement = announcements[0];
  const document = documents[0];
  if (announcement) return { label: announcement.officialJournal || "Anuncio oficial", url: announcement.url, date: announcement.publishedAt };
  if (document) return { label: document.description || document.filename || "Documento oficial", url: "", date: document.publishedAt || document.modifiedAt };
  return { label: "Ficha BDNS/SNPSAP", url: `https://www.infosubvenciones.es/bdnstrans/api/convocatorias?vpd=${PORTAL}&numConv=${detail.codigoBDNS}`, date: "" };
}

function deadlineTraceFields(detail, deadline, documents, announcements, generatedAt) {
  const evidence = deadlineEvidence(detail, documents, announcements);
  const structured = Boolean(normalizeDate(detail.fechaFinSolicitud));
  const status = deadline.status;
  return {
    deadlineObserved: detail.fechaFinSolicitud || detail.textFin || "Plazo no estructurado",
    deadlineEvidenceLabel: evidence.label,
    deadlineEvidenceUrl: evidence.url,
    deadlineEvidenceDate: evidence.date || "",
    deadlineReadAt: generatedAt,
    deadlineNextReviewAt: addDays(generatedAt, status === "closed" ? 7 : 1),
    deadlineUncertaintyReason: structured ? "" : "BDNS no ofrece fecha fin estructurada o expresa el plazo como texto relativo; requiere revisar bases/anuncio.",
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
  const deadline = deadlineStatus(detail);
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
    publishedAt: doc.datPublicacion
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
    deadlineEnd: normalizeDate(detail.fechaFinSolicitud),
    deadline: detail.fechaFinSolicitud || detail.textFin || "Plazo no estructurado",
    deadlineStatus: deadline.status,
    deadlineConfidence: deadline.confidence,
    ...trace,
    officialUrl: `https://www.infosubvenciones.es/bdnstrans/api/convocatorias?vpd=${PORTAL}&numConv=${detail.codigoBDNS}`,
    basesUrl: detail.urlBasesReguladoras || detail.sedeElectronica || "",
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

function searchParams(page) {
  return {
    page,
    pageSize,
    vpd: PORTAL,
    descripcion: args.get("descripcion"),
    descripcionTipoBusqueda: args.get("descripcion-tipo") || (args.has("descripcion") ? 1 : undefined),
    numeroConvocatoria: args.get("numero-convocatoria"),
    mrr: args.get("mrr"),
    contribucion: args.get("contribucion"),
    fechaDesde: args.get("fecha-desde"),
    fechaHasta: args.get("fecha-hasta"),
    tipoAdministracion: args.get("tipo-administracion") || "C",
    organos: args.get("organos"),
    regiones: args.get("regiones"),
    tiposBeneficiario: args.get("tipos-beneficiario"),
    instrumentos: args.get("instrumentos"),
    finalidad: args.get("finalidad"),
    ayudaEstado: args.get("ayuda-estado")
  };
}

function qualitySummary(opportunities, listedCount, detailErrors) {
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
    duplicateCount: listedCount - new Set(opportunities.map((item) => item.id)).size,
    detailErrorCount: detailErrors.length,
    byStatus,
    byAdministration,
    withStructuredDeadline: opportunities.filter((item) => item.deadlineEnd).length,
    withBasesUrl: opportunities.filter((item) => item.basesUrl).length,
    withDocuments: opportunities.filter((item) => item.documents.length).length,
    withAnnouncements: opportunities.filter((item) => item.announcements.length).length,
    uncertainDeadline: opportunities.filter((item) => item.deadlineStatus === "uncertain").length
  };
}

async function main() {
  const listed = [];
  let totalElements = null;
  for (let page = 0; page < pages; page += 1) {
    const endpoint = mode === "search" ? "/convocatorias/busqueda" : "/convocatorias/ultimas";
    const params = mode === "search" ? searchParams(page) : { page, pageSize, vpd: PORTAL };
    const url = apiUrl(endpoint, params);
    const payload = await getJson(url);
    totalElements = payload.totalElements ?? totalElements;
    listed.push(...(payload.content || []));
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
  const query = mode === "search" ? searchParams(0) : { pageSize, vpd: PORTAL };
  const dataset = {
    generatedAt,
    source: "BDNS/SNPSAP",
    apiBase: API_BASE,
    mode,
    query,
    pages,
    pageSize,
    totalElements,
    count: opportunities.length,
    quality: qualitySummary(opportunities, listed.length, detailErrors),
    detailErrors,
    opportunities
  };

  await fs.mkdir(outDir, { recursive: true });
  const outputName = mode === "search" ? "bdns-search.json" : "bdns-latest.json";
  await fs.writeFile(path.join(outDir, outputName), `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  await fs.writeFile(prototypeOut, `window.RADAR = ${JSON.stringify(dataset, null, 2)};\nwindow.RADAR_PLATFORM_OPPORTUNITIES = window.RADAR.opportunities.map((item) => ({ ...item }));\n`, "utf8");
  console.log(JSON.stringify({ generatedAt, mode, totalElements, count: opportunities.length, quality: dataset.quality, output: path.join(outDir, outputName), prototypeOut }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
