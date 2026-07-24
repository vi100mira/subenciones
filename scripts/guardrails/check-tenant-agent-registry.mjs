import fs from "node:fs";

const migrationPath = "supabase/migrations/20260713173000_tenant_agent_registry.sql";
const sql = fs.readFileSync(migrationPath, "utf8");
const provisioningSql = fs.readFileSync(
  "supabase/migrations/20260713180000_tenant_suite_provisioning.sql",
  "utf8"
);
const reconcileFixSql = fs.readFileSync("supabase/migrations/20260713211000_fix_reconcile_ambiguous_columns.sql", "utf8");
const reconcileConflictFixSql = fs.readFileSync("supabase/migrations/20260713212000_fix_reconcile_conflict_target.sql", "utf8");
const publicDraftSql = fs.readFileSync("supabase/migrations/20260716122500_public_document_drafts_without_ai_consent.sql", "utf8");
const progressiveKnowledgeSql = fs.readFileSync("supabase/migrations/20260716193000_draft_agent_progressive_tenant_knowledge.sql", "utf8");
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
const tenantAgentRuntime = fs.readFileSync("prototype/tenant-agent-runtime.js", "utf8");
const dashboardRuntime = fs.readFileSync("prototype/dashboard-renderer.js", "utf8");
const auditRuntime = fs.readFileSync("prototype/audit-runtime.js", "utf8");
const permissionRuntime = fs.readFileSync("src/supabaseAdmin.ts", "utf8");
const credentialRuntime = fs.readFileSync("prototype/auth-credentials.js", "utf8");
const profileReviewApi = fs.readFileSync("api/tenant-profile-review.ts", "utf8");
const lifecycleApi = fs.readFileSync("api/admin-tenant-lifecycle.ts", "utf8");
const authApi = fs.readFileSync("api/auth-session.ts", "utf8");
const recoveryVerifier = fs.readFileSync("scripts/admin/verify-tenant-recovery.mjs", "utf8");

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
assert(reconcileFixSql.includes("consent.status = 'granted'"), "La reconciliación conserva columnas PL/pgSQL ambiguas");
assert(reconcileFixSql.includes("config.profile_json"), "El perfil reconciliado no usa alias explícito");
assert(reconcileConflictFixSql.includes("on conflict on constraint tenant_agent_configs_pkey"), "La reconciliación conserva agent_key ambiguo en ON CONFLICT");
assert(publicDraftSql.includes("'grant_search', 'document_review', 'draft_agent', 'alert_agent'"), "El Gestor documental público sigue bloqueado por consentimiento");
assert(publicDraftSql.includes("Operativo con bases públicas; datos internos no autorizados"), "La reconciliación no distingue borrador público de personalización interna");
assert(publicDraftSql.includes("internal_facts_requires_consent"), "El contrato no limita el consentimiento a hechos internos");
assert(publicDraftSql.includes("perform 1 from public.reconcile_tenant_agent_suite"), "La migración no reconcilia los tenants existentes");
assert(progressiveKnowledgeSql.includes("tenant_knowledge_curator") && progressiveKnowledgeSql.includes("document_drafter"), "Preparación documental no declara sus dos capacidades internas");
assert(progressiveKnowledgeSql.includes("approved_tenant_knowledge_only") && progressiveKnowledgeSql.includes("external_submission_allowed', false"), "La mejora documental carece de límites de aprendizaje o presentación");
assert(provisioningApi.includes("requirePlatformAdmin"), "La provisión debe exigir administración de plataforma");
assert(provisioningApi.includes('req.method !== "POST"'), "La provisión solo debe aceptar POST");
assert(provisioningApi.includes('rpc("provision_tenant_agent_suite"'), "La API debe usar la transacción SQL");
assert(provisioningApi.includes("supabase.auth.admin.listUsers"), "La provisión no resuelve un propietario Auth existente");
assert(provisioningApi.includes("El propietario debe existir primero"), "La provisión crea propietarios implícitamente");
assert(!provisioningApi.includes("createUser"), "La provisión no debe crear cuentas sin flujo de invitación");
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
assert(governanceApi.includes("profileReviewState"), "El gobierno no expone la finalización persistida del perfil");
assert(governanceApi.includes("tenantDocumentSummary") && governanceApi.includes('from("source_documents")'),
  "El panel tenant conserva el contador documental simulado");
assert(tenantAgentRuntime.includes("response.status === 401") && tenantAgentRuntime.includes("handleUnauthorized"),
  "Los asistentes conservan una sesión tenant caducada");
assert(dashboardRuntime.includes("TENANT_DOCUMENT_SUMMARY") && dashboardRuntime.includes("documentCount"),
  "El panel no consume el inventario privado aislado del tenant");
assert(permissionRuntime.includes("if (membershipError) {")
  && permissionRuntime.includes("throw membershipError")
  && permissionRuntime.includes("Token sin pertenencia activa a entidad"),
  "Una sesión con tenant obsoleto sigue respondiendo 400");
assert(auditRuntime.includes("response.status === 401") && auditRuntime.includes("handleUnauthorized"),
  "Auditoría conserva una sesión tenant caducada");
assert(permissionRuntime.includes("requestedTenant") && permissionRuntime.includes("Token con tenant invalido"),
  "El servidor consulta Supabase con un tenantId antiguo o mal formado");
assert(credentialRuntime.includes("hasInvalidTenantScope") && credentialRuntime.includes("session?.role === \"entity\""),
  "El navegador conserva una sesión tenant con identificador obsoleto");
assert(governanceApi.includes("reconcile_tenant_agent_suite"), "Los cambios no reconcilian agentes");
assert(governanceApi.includes('"pause_agent", "resume_agent"'), "Falta pausa reversible de agentes");
assert(governanceApi.includes("tenant_governance.${action}"), "Falta auditoría de gobierno");
assert(!governanceApi.toLowerCase().includes("novaterra"), "El gobierno depende del piloto");
assert(profileReviewApi.includes('.eq("status", "pending")'), "La revisión puede sobrescribir decisiones previas");
assert(profileReviewApi.includes("sugerencias por revisar antes de aprobar") && profileReviewApi.includes('approveMaster ? "la plantilla maestra" : "el perfil"'), "El perfil o la plantilla maestra pueden aprobarse con sugerencias pendientes");
assert(profileReviewApi.includes('review_state: "approved"'), "La revisión no aprueba el perfil explícitamente");
assert(profileReviewApi.includes("reconcile_tenant_agent_suite"), "Aprobar perfil no habilita capacidades reconciliadas");
assert(profileReviewApi.includes("evidence_excerpt"), "La revisión no muestra evidencia");
assert(!profileReviewApi.toLowerCase().includes("novaterra"), "La revisión depende del piloto");
assert(lifecycleApi.includes('"activate", "archive", "restore"'), "Falta activación o archivo reversible del tenant");
assert(lifecycleApi.includes('currentConfig?.status !== "onboarding"'), "La activación no limita su estado de origen");
assert(lifecycleApi.includes('hard_delete: false'), "El archivo se confunde con borrado definitivo");
assert(lifecycleApi.includes("reconcile_tenant_agent_suite"), "Restaurar no reconcilia agentes");
assert(authApi.includes("auth.login_blocked"), "Un tenant archivado todavía puede iniciar sesión");
assert(!authApi.includes("Novaterra tiene todos los agentes"), "Login conserva habilitación específica del piloto");
assert(recoveryVerifier.includes("recovery-fixture-"), "La prueba de recuperación no limita el tenant desechable");
assert(!recoveryVerifier.toLowerCase().includes('slug: "novaterra'), "La prueba de recuperación apunta al piloto");
assert(recoveryVerifier.includes("recreateSameSlug"), "La prueba no demuestra reconstrucción del mismo slug");
assert(recoveryVerifier.includes("consentsRegrantedAutomatically: false"), "La prueba copia consentimientos tras borrar");

console.log(JSON.stringify({
  ok: true,
  catalog: requiredAgents,
  tenantIsolation: "RLS + tenant_id",
  entityResearchGate: "public_web_analysis",
  queue: "multi-agent e idempotente",
  provisioning: "blueprint v1 + reconciliación por puertas"
}, null, 2));
