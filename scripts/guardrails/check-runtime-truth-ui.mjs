import fs from "node:fs";

const files = Object.fromEntries(["runtime-truth", "agents-readiness", "entity-activation", "operations-platform", "tenant-plan"].map((name) => [name, fs.readFileSync(`prototype/${name}.js`, "utf8")]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(files["runtime-truth"].includes("mismas que aparecen en la vista Oportunidades"), "El Panel no explica la coherencia con Oportunidades");
assert(files["agents-readiness"].includes("Qué está disponible hoy"), "Asistentes no explica su disponibilidad en lenguaje claro");
assert(files["entity-activation"].includes("Gestor de subvenciones"), "Entidad conserva un rol poco claro");
assert(files["operations-platform"].includes("Publicaciones revisadas"), "Operaciones no diferencia publicaciones revisadas y oportunidades");
assert(files["operations-platform"].includes("Financiadores privados"), "Operaciones no explica el seguimiento privado");
const visibleContract = Object.values(files).join("\n");
assert(!/\b(worker|RAG|RLS|telemetr(?:ia|ía)|determinista)\b/i.test(visibleContract), "Las pantallas conservan tecnicismos de desarrollo");
assert(!files["tenant-plan"].includes("8,40 EUR"), "Plan conserva un coste IA simulado");
assert(files["tenant-plan"].includes("0,00 EUR"), "Plan no muestra el coste IA real nulo");

console.log(JSON.stringify({ ok: true, panel: "coherente", entidad: "lenguaje claro", asistentes: "lenguaje claro", plan: "sin costes simulados", operaciones: "magnitudes diferenciadas" }, null, 2));
