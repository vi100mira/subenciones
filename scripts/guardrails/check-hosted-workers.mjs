import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/workers-alojados.yml", "utf8").replace(/\r\n/g, "\n");
const draftApi = fs.readFileSync("api/draft-agent-runs.ts", "utf8");
const draftWorker = fs.readFileSync("scripts/workers/run-draft-agent.mjs", "utf8");
const researchApi = fs.readFileSync("api/entity-research-runs.ts", "utf8");
const matchApi = fs.readFileSync("api/tenant-match-runs.ts", "utf8");
const documentReviewApi = fs.readFileSync("api/document-review-runs.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(workflow.includes("permissions:\n  contents: read"), "El workflow alojado tiene permisos excesivos");
assert(workflow.includes('cron: "15 5 * * *"'), "Falta el consumo diario de radares");
assert(workflow.includes('cron: "*/15 * * * *"'), "Falta el cron de recuperación del redactor");
assert(workflow.includes("tesseract-ocr-spa"), "El runner no instala OCR en español");
assert(workflow.includes("secrets.SUPABASE_SERVICE_ROLE_KEY"), "Supabase no se obtiene desde secretos");
assert(!workflow.includes("Programador de Windows"), "El workflow conserva una dependencia de Windows");
assert(!/SUPABASE_SERVICE_ROLE_KEY:\s*[^$\s]/.test(workflow), "Hay una clave de servicio literal en el workflow");
assert(draftApi.includes("DRAFT_WORKER_GITHUB_TOKEN"), "Falta la credencial server-only del despacho inmediato");
assert(draftApi.includes('inputs: { proceso: "redactor" }'), "El despacho inmediato no limita el workflow al redactor");
assert(draftApi.includes('status: "fallback_cron"'), "Falta la recuperación segura cuando el despacho falla");

assert(draftApi.includes('agent_key: "draft_agent"'), "La API no etiqueta la ejecucion del redactor");
assert(draftApi.includes('.eq("agent_key", "draft_agent")'), "La lectura del redactor mezcla otros agentes");
assert(draftWorker.includes('.eq("agent_key", "draft_agent")'), "El worker redactor puede reclamar otra cola");
assert(workflow.includes("scripts/workers/run-entity-research.mjs"), "El investigador no tiene runner alojado");
assert(workflow.includes("inputs.proceso == 'investigador'"), "Falta despacho selectivo del investigador");
assert(researchApi.includes('agent_key: "entity_research"'), "La API no etiqueta la investigacion");
assert(researchApi.includes('inputs: { proceso: "investigador" }'), "La API no despacha el investigador");
assert(researchApi.includes('status !== "ready"'), "La API no respeta el estado reconciliado");
assert(workflow.includes("scripts/workers/run-tenant-match.mjs"), "El encaje no tiene runner alojado");
assert(matchApi.includes('agent_key: "match_agent"'), "La API no etiqueta el encaje");
assert(matchApi.includes('inputs: { proceso: "encaje" }'), "La API no despacha el encaje");
assert(workflow.includes("scripts/workers/run-document-review.mjs"), "La revisión documental no tiene runner alojado");
assert(workflow.includes("inputs.proceso == 'documentos'"), "Falta despacho selectivo documental");
assert(documentReviewApi.includes('inputs: { proceso: "documentos" }'), "La API no despacha revisión documental");
assert(matchApi.includes("human_review_status"), "La API no permite revisión humana del encaje");

console.log(JSON.stringify({ ok: true, radares: "alojados", redactor: "alojado y aislado", investigador: "alojado y bajo demanda", encaje: "alojado y revisable", documentos: "alojado y revisable", ocr: "Tesseract en runner", permissions: "contents: read" }, null, 2));
