import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/workers-alojados.yml", "utf8");
const draftApi = fs.readFileSync("api/draft-agent-runs.ts", "utf8");

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

console.log(JSON.stringify({ ok: true, radares: "alojados", redactor: "alojado", ocr: "Tesseract en runner", permissions: "contents: read" }, null, 2));
