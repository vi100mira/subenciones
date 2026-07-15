import fs from "node:fs";

const ui = fs.readFileSync("prototype/ui-polish.js", "utf8");
const flows = fs.readFileSync("prototype/visual-flows.js", "utf8");
const theme = fs.readFileSync("prototype/stitch-theme.css", "utf8");
const app = ["prototype/app.js", "prototype/dashboard-renderer.js"]
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const plan = fs.readFileSync("prototype/tenant-plan.js", "utf8");
const scope = fs.readFileSync("prototype/opportunity-scope.js", "utf8");
const index = fs.readFileSync("prototype/index.html", "utf8");
const viewerApi = fs.readFileSync("api/public-document-viewer.ts", "utf8");
const coverage = fs.readFileSync("prototype/platform-coverage-data.js", "utf8");
const mocks = fs.readFileSync("prototype/mock-data.js", "utf8");
const tenantRecommendations = fs.readFileSync("prototype/tenant-recommendations-runtime.js", "utf8");
const styles = fs.readFileSync("prototype/styles.css", "utf8");
const requirements = fs.readFileSync("prototype/opportunity-requirements.js", "utf8");
const stitch = fs.readFileSync("prototype/stitch-theme.css", "utf8");
const matchAccounting = fs.readFileSync("prototype/match-accounting.js", "utf8");
const recommendationReconciliation = fs.readFileSync("prototype/recommendation-reconciliation.js", "utf8");
const tenantMatchReview = fs.readFileSync("prototype/tenant-match-review.js", "utf8");
const tenantMatchReviewApi = fs.readFileSync("api/tenant-match-review.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!flows.includes("Como leer una oportunidad"), "Sigue presente la guia ambigua de oportunidades");
assert(!ui.includes("data-grid-page"), "La tabla conserva controles de paginacion");
assert(!ui.includes('["candidate", "Candidatura"]'), "Candidatura sigue siendo una columna independiente");
assert(ui.includes('["actions", "Acciones"]'), "Acciones no ofrece el filtro de candidatura");
assert(ui.includes("${candidateCell(item)}"), "Preseleccionar no esta integrado en Acciones");
assert(!ui.includes(">Preseleccionar</button>"), "Preseleccionar sigue siendo un boton de texto");
assert(["bookmark-plus", "folder-plus", "folder-open"].every((icon) => ui.includes(icon)), "Faltan iconos para las acciones de candidatura");
assert(ui.includes('data-action-info="bases"') && ui.includes('data-action-info="source"'), "Bases y fuente oficial no abren informacion contextual");
assert(ui.includes('data-action-info="unavailable"') && ui.includes("No se ha creado ninguna candidatura"), "La preseleccion degradada no explica que no persiste una candidatura");
assert(ui.includes("Consulta el documento oficial antes de decidir") && ui.includes("Abrir ficha oficial"), "Las acciones externas no ofrecen una transicion informativa");
assert(ui.includes("document-viewer-frame") && ui.includes("data-document-viewer-download"), "Las bases no disponen de visor con descarga secundaria");
assert(viewerApi.includes("Content-Disposition") && viewerApi.includes('"inline"') && viewerApi.includes('"attachment"'), "El proxy documental no diferencia visualizacion y descarga");
assert(viewerApi.includes("ALLOWED_SOURCES") && viewerApi.includes("MAX_DOCUMENT_BYTES"), "El visor publico carece de limites de origen o tamano");
assert(app.includes("function sourceCoverage") && app.includes("source-node-number") && app.includes("source-preview-list"), "El mapa de fuentes no ofrece contador y visor desplegable");
assert(app.includes("Ninguna se presenta como viva sin bases y vigencia confirmadas"), "El radar privado no explica por que no aparece en oportunidades vivas");
assert(coverage.includes("loadedRows: 18") && coverage.includes("monitorOnly: 16"), "La cobertura privada no coincide con el catalogo visible");
assert(mocks.includes("18 monitorizadas") && mocks.includes("16 por verificar"), "La tarjeta privada conserva un recuento obsoleto");
assert(index.includes('<details class="metric">') && app.includes("function metricPreview"), "Las metricas del Panel no ofrecen visor desplegable");
assert(app.includes("function matchDashboardState") && app.includes('"tenant-match-load-state", "tenant-match-state", "role-session-applied"'), "El estado del encaje no se sincroniza con el Panel");
assert(tenantRecommendations.includes('"#view-dashboard"'), "El Panel no refresca periodicamente el encaje persistido");
assert(tenantRecommendations.includes("function publishLoadState") && tenantRecommendations.includes("blockedSessionSignature"), "El refresco del encaje puede alternar estados sin cambios reales");
assert(styles.includes(".metric > summary > strong"), "El tamano del contador se aplica tambien al contenido desplegado");
assert(requirements.includes("data-workspace-back") && requirements.includes("Volver a candidaturas"), "El expediente documental no ofrece una salida clara");
assert(requirements.includes("data-constructed-doc-view") && requirements.includes("data-download-constructed-doc"), "Las plantillas preconstruidas no disponen de visor y descarga");
assert(requirements.includes("No es el documento final") && stitch.includes(".constructed-doc-preview"), "El visor no diferencia la plantilla del documento final");
assert(requirements.includes("data-requirement-preselect") && !requirements.includes("Abrir expediente documental") && !requirements.includes("Abrir candidatura</button>"), "El analisis de oportunidad permite saltarse la preseleccion");
assert(matchAccounting.includes("pendingClassification") && tenantRecommendations.includes("entityUnmappedMatchCount"), "El encaje no reconcilia resultados visibles y no sincronizados");
assert(app.includes("Ultimo calculo de encaje") && app.includes("fuera del criterio de vigencia actual") && app.includes("requieren conciliacion tecnica"), "El Panel no explica la suma completa del encaje");
assert(ui.includes("Bajo encaje") && ui.includes("entityHumanDismissedCount"), "La UI sigue confundiendo bajo encaje con descarte humano");
assert(app.includes('opportunities: "Gesti\\u00f3n de oportunidades"') && !app.includes("Oportunidades vivas"), "La pantalla sigue presentandose como un listado solo de oportunidades vivas");
assert(ui.includes('data-entity-scope="sync"') && ui.includes("function openSyncIssue") && ui.includes("Reintentar conciliacion"), "Las incidencias de sincronizacion no tienen visor y accion propia");
assert(ui.includes("Abrir fuente oficial") && ui.includes("Descartar como obsoleta") && ui.includes("data-sync-dismiss"), "El validador no dispone de acciones suficientes para resolver una incidencia");
assert(ui.indexOf("if (item.syncIssue)") < ui.indexOf("const persisted = window.TenantMatchReview?.candidateCell(item)"), "Una incidencia puede llegar a ofrecer preseleccion antes de conciliarse");
assert(tenantMatchReview.includes('data-match-decision="dismissed"') && tenantMatchReviewApi.includes("await audit") && tenantMatchReviewApi.includes("match_agent.${decisionStatus}"), "El descarte de una incidencia no reutiliza la decision humana auditada");
assert(ui.includes("Fuera de vigencia") && ui.includes("conservan para trazabilidad") && ui.includes("function notCurrentRows"), "Las oportunidades no vigentes siguen ocultas o sin explicacion");
assert(index.includes("recommendation-reconciliation.js") && tenantRecommendations.includes("entityAutoReconciledByUrlCount") && tenantRecommendations.includes("RADAR_SYNC_PENDING"), "La conciliacion automatica por fuente oficial no esta conectada al runtime");
assert(index.includes("Estos contadores no se suman entre si"), "El mapa de fuentes no advierte que sus coberturas se solapan");

globalThis.MatchAccounting = undefined;
await import(`../../prototype/match-accounting.js?guard=${Date.now()}`);
const reconciled = globalThis.MatchAccounting.reconcile({ total: 84, following: 15, outside: 31, archived: 0, mappedActive: 28, unmapped: 25 });
assert(reconciled.notCurrent === 13 && reconciled.pendingClassification === 0 && reconciled.overcount === 0, "La reconciliacion 15 + 31 + 13 + 25 no produce 84");
globalThis.RecommendationReconciliation = undefined;
await import(`../../prototype/recommendation-reconciliation.js?guard=${Date.now()}`);
const reconciliationIndex = globalThis.RecommendationReconciliation.createIndex([{ id: "new-key", officialUrl: "https://fuente.test/convocatoria/42?vista=1" }]);
const recovered = globalThis.RecommendationReconciliation.resolve({ platform_opportunities: { canonical_key: "old-key" }, platform_opportunity_versions: { official_url: "https://fuente.test/convocatoria/42" } }, reconciliationIndex);
assert(recovered.row?.id === "new-key" && recovered.method === "official_url", "Una recomendacion con clave antigua no se recupera por URL oficial");
assert(ui.includes("window.OpportunityScope?.rows()"), "Oportunidades no usa la seleccion comun");
assert(app.includes("window.OpportunityScope?.summary()"), "El Panel no usa el resumen comun");
assert(scope.includes("window.OpportunityScope"), "No existe una unica seleccion compartida");
assert(index.includes("Versión estable") && !index.includes("Modo prototipo"), "La barra lateral no identifica la version estable");
assert(!index.includes("Ranking explicable") && !index.includes("data-filter="), "Siguen visibles los filtros superiores redundantes");
assert(ui.includes('class="sr-only" id="opportunity-pagination"'), "El resumen de resultados sigue ocupando espacio visual");
assert(ui.includes('aria-label="Conversar con el radar"') && !ui.includes("> Conversar con radar</button>"), "El chat no es una accion de icono accesible");
assert(theme.includes("position: fixed") && theme.includes(".radar-chat-button"), "El chat no permanece flotante");
assert(ui.includes("gridState.visibleRows + gridState.loadStep"), "No existe carga progresiva al desplazarse");
assert(theme.includes("border-collapse: separate"), "La tabla no usa el modo compatible con cabeceras adhesivas");
assert(theme.includes("overscroll-behavior: contain"), "La tabla puede transferir el scroll a toda la pagina");
assert(/\.tenant-grid-head \{\r?\n  position: sticky/.test(theme), "Los grids de tenants pierden la cabecera al desplazarse");
assert(theme.includes("max-height: min(560px, 65dvh)"), "Los grids de tenants no tienen scroll interno en escritorio");
assert(/\.platform-monitor-grid \.tenant-grid-row \{\r?\n    grid-template-columns: 1fr/.test(theme), "Monitorizacion conserva cinco columnas en movil");
assert(!app.includes("data-tenant-page") && !plan.includes("data-tenant-page"), "Un grid secundario conserva paginacion");
assert(app.includes('screenId === "opportunities"'), "Nueva busqueda no esta limitada a Oportunidades");
assert(app.includes('const refreshScreens = ["opportunities", "agents", "audit", "operations"]'), "Actualizar no tiene una politica explicita por pantalla");

console.log(JSON.stringify({
  ok: true,
  guide: "retirada",
  candidate: "integrada en Acciones",
  pagination: "sustituida por carga continua",
  header: "adhesiva dentro de la tabla",
  secondaryGrids: "continuos con cabecera adhesiva en escritorio",
  consistency: "Panel y Oportunidades comparten seleccion",
  density: "cabecera y resumen redundantes retirados",
  chat: "icono flotante accesible"
}, null, 2));
