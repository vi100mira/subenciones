import fs from "node:fs";

const migrationPath = "supabase/migrations/20260713173000_tenant_agent_registry.sql";
const sql = fs.readFileSync(migrationPath, "utf8");
const provisioningSql = fs.readFileSync(
  "supabase/migrations/20260713180000_tenant_suite_provisioning.sql",
  "utf8"
);
const provisioningApi = fs.readFileSync("api/admin-tenant-provision.ts", "utf8");
const researchEvidenceSql = fs.readFileSync(
  "supabase/migrations/20260713190000_entity_research_evidence.sql",
  "utf8"
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredAgents = [
  "grant_search",
  "entity_research",
  "match_agent",
  "document_review",
  "draft_agent",
  "alert_agent"
];

assert(sql.includes("platform_agent_definitions"), "Falta el catálogo de agentes");
assert(sql.includes("tenant_agent_configs"), "Falta la configuración aislada por tenant");
assert(sql.includes("enable row level security"), "El registro debe activar RLS");
assert(sql.includes("public.is_org_member(tenant_id)"), "Falta lectura limitada a miembros del tenant");
assert(sql.includes("public_web_analysis"), "El investigador debe exigir consentimiento web");
assert(sql.includes("alter column opportunity_id drop not null"), "La cola debe admitir agentes sin convocatoria");
assert(sql.includes("tenant_agent_runs_active_dedupe_idx"), "Falta idempotencia de ejecuciones activas");
assert(!sql.toLowerCase().includes("novaterra"), "El contrato no puede depender del tenant piloto");

for (const agent of requiredAgents) {
  assert(sql.includes(`('${agent}'`), `Falta la capacidad ${agent}`);
}

assert(provisioningSql.includes("provision_tenant_agent_suite"), "Falta provisión idempotente");
assert(provisioningSql.includes("reconcile_tenant_agent_suite"), "Falta reconciliar estados reales");
assert(provisioningSql.includes("on conflict (slug) do update"), "La provisión debe poder repetirse");
assert(provisioningSql.includes("grant execute") && provisioningSql.includes("service_role"), "RPC sin cierre service-role");
assert(provisioningSql.includes("Falta consentimiento de web pública"), "Falta puerta del investigador");
assert(provisioningSql.includes("Falta aprobar el perfil de entidad"), "Falta puerta del encaje");
assert(provisioningSql.includes("Falta consentimiento de procesamiento IA"), "Falta puerta del redactor");
assert(!provisioningSql.toLowerCase().includes("novaterra"), "La provisión no puede depender del piloto");
assert(provisioningApi.includes("requirePlatformAdmin"), "La provisión debe exigir administración de plataforma");
assert(provisioningApi.includes('req.method !== "POST"'), "La provisión solo debe aceptar POST");
assert(provisioningApi.includes('rpc("provision_tenant_agent_suite"'), "La API debe usar la transacción SQL");
assert(!provisioningApi.toLowerCase().includes("novaterra"), "La API no puede depender del piloto");
assert(researchEvidenceSql.includes("source_document_id"), "La sugerencia no enlaza su snapshot");
assert(researchEvidenceSql.includes("evidence_excerpt"), "La sugerencia no conserva fragmento de evidencia");
assert(researchEvidenceSql.includes("source_sha256"), "La sugerencia no conserva hash de evidencia");

console.log(JSON.stringify({
  ok: true,
  catalog: requiredAgents,
  tenantIsolation: "RLS + tenant_id",
  entityResearchGate: "public_web_analysis",
  queue: "multi-agent e idempotente",
  provisioning: "blueprint v1 + reconciliación por puertas"
}, null, 2));
