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
const matchSql = fs.readFileSync(
  "supabase/migrations/20260713200000_tenant_match_recommendations.sql",
  "utf8"
);
const governanceApi = fs.readFileSync("api/tenant-agent-governance.ts", "utf8");
const profileReviewApi = fs.readFileSync("api/tenant-profile-review.ts", "utf8");
const lifecycleApi = fs.readFileSync("api/admin-tenant-lifecycle.ts", "utf8");
const authApi = fs.readFileSync("api/auth-session.ts", "utf8");

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
assert(provisioningSql.includes("tenant_agent_configs.status in ('paused', 'disabled')"), "La reconciliación ignora pausas explícitas");
assert(!provisioningSql.toLowerCase().includes("novaterra"), "La provisión no puede depender del piloto");
assert(provisioningApi.includes("requirePlatformAdmin"), "La provisión debe exigir administración de plataforma");
assert(provisioningApi.includes('req.method !== "POST"'), "La provisión solo debe aceptar POST");
assert(provisioningApi.includes('rpc("provision_tenant_agent_suite"'), "La API debe usar la transacción SQL");
assert(provisioningApi.includes("tenant.blueprint_exported"), "Falta exportar blueprint antes de borrar");
assert(provisioningApi.includes("consents_exported: false"), "El blueprint no advierte que excluye consentimientos");
assert(!provisioningApi.includes('from("tenant_data_consents")'), "El blueprint exporta consentimientos");
assert(!provisioningApi.toLowerCase().includes("novaterra"), "La API no puede depender del piloto");
assert(researchEvidenceSql.includes("source_document_id"), "La sugerencia no enlaza su snapshot");
assert(researchEvidenceSql.includes("evidence_excerpt"), "La sugerencia no conserva fragmento de evidencia");
assert(researchEvidenceSql.includes("source_sha256"), "La sugerencia no conserva hash de evidencia");
assert(matchSql.includes("tenant_opportunity_recommendations"), "Falta persistencia del encaje");
assert(matchSql.includes("internal_fact_refs_json"), "El encaje no declara hechos internos usados");
assert(matchSql.includes("missing_information_json"), "El encaje no conserva información faltante");
assert(matchSql.includes("human_review_status"), "El encaje no exige revisión humana");
assert(matchSql.includes("public.is_org_member(tenant_id)"), "El encaje no está aislado por tenant");
assert(governanceApi.includes("requireSourcePermission"), "El gobierno no exige rol tenant");
assert(governanceApi.includes("Falta alcance explícito"), "El consentimiento no exige alcance");
assert(governanceApi.includes("validConsentScope"), "El consentimiento no valida su alcance");
assert(governanceApi.includes("scope_keys"), "La auditoría conserva el alcance completo");
assert(governanceApi.includes("reconcile_tenant_agent_suite"), "Los cambios no reconcilian agentes");
assert(governanceApi.includes('"pause_agent", "resume_agent"'), "Falta pausa reversible de agentes");
assert(governanceApi.includes("tenant_governance.${action}"), "Falta auditoría de gobierno");
assert(!governanceApi.toLowerCase().includes("novaterra"), "El gobierno depende del piloto");
assert(profileReviewApi.includes('.eq("status", "pending")'), "La revisión puede sobrescribir decisiones previas");
assert(profileReviewApi.includes('review_state: "approved"'), "La revisión no aprueba el perfil explícitamente");
assert(profileReviewApi.includes("reconcile_tenant_agent_suite"), "Aprobar perfil no habilita capacidades reconciliadas");
assert(profileReviewApi.includes("evidence_excerpt"), "La revisión no muestra evidencia");
assert(!profileReviewApi.toLowerCase().includes("novaterra"), "La revisión depende del piloto");
assert(lifecycleApi.includes('"archive", "restore"'), "Falta archivo reversible del tenant");
assert(lifecycleApi.includes('hard_delete: false'), "El archivo se confunde con borrado definitivo");
assert(lifecycleApi.includes("reconcile_tenant_agent_suite"), "Restaurar no reconcilia agentes");
assert(authApi.includes("auth.login_blocked"), "Un tenant archivado todavía puede iniciar sesión");
assert(!authApi.includes("Novaterra tiene todos los agentes"), "Login conserva habilitación específica del piloto");

console.log(JSON.stringify({
  ok: true,
  catalog: requiredAgents,
  tenantIsolation: "RLS + tenant_id",
  entityResearchGate: "public_web_analysis",
  queue: "multi-agent e idempotente",
  provisioning: "blueprint v1 + reconciliación por puertas"
}, null, 2));
