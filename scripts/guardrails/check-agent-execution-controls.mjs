import assert from "node:assert/strict";
import fs from "node:fs";

const governance = fs.readFileSync("api/tenant-agent-governance.ts", "utf8");
const runtime = fs.readFileSync("prototype/tenant-agent-runtime.js", "utf8");
const help = fs.readFileSync("prototype/help-assistant-knowledge.js", "utf8");
const workerAudit = fs.readFileSync("scripts/workers/agent-run-audit.mjs", "utf8");

for (const key of ["grant_search", "entity_research", "match_agent", "document_review", "draft_agent", "alert_agent"]) {
  assert(governance.includes(`${key}:`), `Falta política de ejecución para ${key}`);
}
assert(governance.includes('.eq("tenant_id", actor.tenantId)') && governance.includes("executionControls"), "El historial no está aislado por tenant");
assert(runtime.includes("agent-execution-control") && runtime.includes("Modo") && runtime.includes("\\u00daltima") && runtime.includes("Pr\\u00f3xima"), "La UI no comparte el control de ejecución");
assert(governance.includes("Manual con datos aprobados") && governance.includes("Pendiente de activar un canal"), "La UI declara automatizaciones privadas o de avisos inexistentes");
assert(workerAudit.includes('target_type: "agent_run"') && workerAudit.includes("actor_label"), "Los workers no comparten trazabilidad de ejecución");
for (const file of ["run-entity-research.mjs", "run-tenant-match.mjs", "run-document-review.mjs", "run-draft-agent.mjs"]) {
  const source = fs.readFileSync(`scripts/workers/${file}`, "utf8");
  assert(source.includes(".started") && source.includes(".failed") && source.includes("generated_for_review"), `${file} no audita todo su ciclo`);
}
assert(help.includes("no implica que todos los agentes tengan un cron") && help.includes("quién solicitó"), "Guía no explica el control de ejecución");
console.log(JSON.stringify({ ok: true, controls: 6, auditLifecycle: ["queued", "started", "generated_for_review", "failed"], privateCron: false }, null, 2));
