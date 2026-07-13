import fs from "node:fs";

const files = Object.fromEntries(["runtime-truth", "agents-readiness", "entity-activation", "operations-platform", "tenant-plan", "tenant-agent-runtime", "tenant-recommendations-runtime", "document-review-ui"].map((name) => [name, fs.readFileSync(`prototype/${name}.js`, "utf8")]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(files["runtime-truth"].includes("mismas que aparecen en la vista Oportunidades"), "El Panel no explica la coherencia con Oportunidades");
assert(files["agents-readiness"].includes("Qué está disponible hoy"), "Asistentes no explica su disponibilidad en lenguaje claro");
assert(files["entity-activation"].includes("Gestor de subvenciones"), "Entidad conserva un rol poco claro");
assert(!files["entity-activation"].includes("Servicios contratados") && !files["entity-activation"].includes("Suite completa contratada"), "Entidad duplica el catálogo de asistentes");
assert(files["agents-readiness"].includes("agents-status-legend"), "Asistentes ha perdido el estado operativo de los agentes");
assert(files["tenant-agent-runtime"].includes("/api/tenant-agent-governance"), "Asistentes no carga estado real del tenant");
assert(files["tenant-agent-runtime"].includes("Autorizar web pública"), "Falta activar consentimiento web desde Asistentes");
assert(files["tenant-agent-runtime"].includes("Investigar ahora"), "Falta ejecutar el Investigador desde Asistentes");
assert(files["tenant-agent-runtime"].includes("Aprobar perfil revisado"), "Falta revisión humana del perfil");
assert(files["tenant-agent-runtime"].includes("Calcular encaje"), "Falta ejecutar encaje persistido");
assert(files["tenant-recommendations-runtime"].includes("/api/tenant-match-runs"), "Oportunidades no carga encaje persistido");
assert(files["tenant-recommendations-runtime"].includes("perfil aprobado"), "Oportunidades no explica el origen del encaje");
assert(files["tenant-agent-runtime"].includes("tenant-recommendations-applied"), "La recarga del radar puede borrar el estado real de los agentes");
assert(files["entity-activation"].includes("data-tenant-web-status"), "Entidad conserva autorización web fija");
assert(files["tenant-agent-runtime"].includes("consent?.status !== \"granted\""), "Entidad no consulta consentimiento web real");
assert(!files["tenant-plan"].includes("Todos los agentes habilitados para Novaterra"), "Plan habilita agentes por ser el piloto");
assert(files["document-review-ui"].includes("/api/document-review-runs"), "La revisión documental sigue siendo solo local");
assert(files["document-review-ui"].includes("Revisión humana"), "La revisión documental no muestra control humano");
assert(!fs.readFileSync("prototype/index.html", "utf8").includes("entity-fit.js"), "La UI todavía carga reglas específicas del piloto");
assert(files["operations-platform"].includes("Publicaciones revisadas"), "Operaciones no diferencia publicaciones revisadas y oportunidades");
assert(files["operations-platform"].includes("Financiadores privados"), "Operaciones no explica el seguimiento privado");
const visibleContract = Object.values(files).join("\n");
assert(!/\b(worker|RAG|RLS|telemetr(?:ia|ía)|determinista)\b/i.test(visibleContract), "Las pantallas conservan tecnicismos de desarrollo");
assert(!files["tenant-plan"].includes("8,40 EUR"), "Plan conserva un coste IA simulado");
assert(files["tenant-plan"].includes("0,00 EUR"), "Plan no muestra el coste IA real nulo");

console.log(JSON.stringify({ ok: true, panel: "coherente", entidad: "lenguaje claro", asistentes: "lenguaje claro", plan: "sin costes simulados", operaciones: "magnitudes diferenciadas" }, null, 2));
