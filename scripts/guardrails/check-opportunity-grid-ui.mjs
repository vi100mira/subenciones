import fs from "node:fs";

const ui = fs.readFileSync("prototype/ui-polish.js", "utf8");
const flows = fs.readFileSync("prototype/visual-flows.js", "utf8");
const theme = fs.readFileSync("prototype/stitch-theme.css", "utf8");
const app = fs.readFileSync("prototype/app.js", "utf8");
const plan = fs.readFileSync("prototype/tenant-plan.js", "utf8");
const scope = fs.readFileSync("prototype/opportunity-scope.js", "utf8");

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
assert(ui.includes("gridState.visibleRows + gridState.loadStep"), "No existe carga progresiva al desplazarse");
assert(theme.includes("border-collapse: separate"), "La tabla no usa el modo compatible con cabeceras adhesivas");
assert(theme.includes("overscroll-behavior: contain"), "La tabla puede transferir el scroll a toda la pagina");
assert(theme.includes(".tenant-grid-head {\n  position: sticky"), "Los grids de tenants pierden la cabecera al desplazarse");
assert(theme.includes("max-height: min(560px, 65dvh)"), "Los grids de tenants no tienen scroll interno en escritorio");
assert(theme.includes(".platform-monitor-grid .tenant-grid-row {\n    grid-template-columns: 1fr"), "Monitorizacion conserva cinco columnas en movil");
assert(!app.includes("data-tenant-page") && !plan.includes("data-tenant-page"), "Un grid secundario conserva paginacion");

console.log(JSON.stringify({
  ok: true,
  guide: "retirada",
  candidate: "integrada en Acciones",
  pagination: "sustituida por carga continua",
  header: "adhesiva dentro de la tabla",
  secondaryGrids: "continuos con cabecera adhesiva en escritorio",
  consistency: "Panel y Oportunidades comparten seleccion"
}, null, 2));
