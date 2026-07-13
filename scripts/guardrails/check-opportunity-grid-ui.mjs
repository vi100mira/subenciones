import fs from "node:fs";

const ui = fs.readFileSync("prototype/ui-polish.js", "utf8");
const flows = fs.readFileSync("prototype/visual-flows.js", "utf8");
const theme = fs.readFileSync("prototype/stitch-theme.css", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!flows.includes("Como leer una oportunidad"), "Sigue presente la guia ambigua de oportunidades");
assert(!ui.includes("data-grid-page"), "La tabla conserva controles de paginacion");
assert(!ui.includes('["candidate", "Candidatura"]'), "Candidatura sigue siendo una columna independiente");
assert(ui.includes('["actions", "Acciones"]'), "Acciones no ofrece el filtro de candidatura");
assert(ui.includes("${candidateCell(item)}"), "Preseleccionar no esta integrado en Acciones");
assert(ui.includes("gridState.visibleRows + gridState.loadStep"), "No existe carga progresiva al desplazarse");
assert(theme.includes("border-collapse: separate"), "La tabla no usa el modo compatible con cabeceras adhesivas");
assert(theme.includes("overscroll-behavior: contain"), "La tabla puede transferir el scroll a toda la pagina");

console.log(JSON.stringify({
  ok: true,
  guide: "retirada",
  candidate: "integrada en Acciones",
  pagination: "sustituida por carga continua",
  header: "adhesiva dentro de la tabla"
}, null, 2));
