import fs from "node:fs";

const ui = fs.readFileSync("prototype/ui-polish.js", "utf8");
const flows = fs.readFileSync("prototype/visual-flows.js", "utf8");
const theme = fs.readFileSync("prototype/stitch-theme.css", "utf8");
const app = fs.readFileSync("prototype/app.js", "utf8");
const plan = fs.readFileSync("prototype/tenant-plan.js", "utf8");
const scope = fs.readFileSync("prototype/opportunity-scope.js", "utf8");
const index = fs.readFileSync("prototype/index.html", "utf8");

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
