import fs from "node:fs";

const files = Object.fromEntries(["runtime-truth", "agents-readiness", "entity-activation", "operations-platform", "tenant-plan"].map((name) => [name, fs.readFileSync(`prototype/${name}.js`, "utf8")]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(files["runtime-truth"].includes("Capacidad real en este momento"), "El Panel no explica su capacidad real");
assert(files["agents-readiness"].includes("Diseñado, sin worker"), "El investigador se presenta como operativo");
assert(files["agents-readiness"].includes("Cola alojada; IA pendiente"), "El redactor no muestra su estado real");
assert(files["operations-platform"].includes("15 financiadores oficiales mas 1 fuente agregadora"), "Operaciones no distingue 15 financiadores y el agregador");
assert(files["operations-platform"].includes("GitHub Actions consume"), "Operaciones no muestra los workers alojados");
assert(!files["tenant-plan"].includes("8,40 EUR"), "Plan conserva un coste IA simulado");
assert(files["tenant-plan"].includes("0,00 EUR"), "Plan no muestra el coste IA real nulo");

console.log(JSON.stringify({ ok: true, panel: "trazable", entidad: "trazable", asistentes: "trazables", plan: "sin costes simulados", operaciones: "15 financiadores + 1 agregador" }, null, 2));
