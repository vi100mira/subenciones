import { readFileSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8"); }
function assert(value, message) { if (!value) throw new Error(message); }

const migration = read("supabase/migrations/20260730130000_catalog_lifecycle_governance.sql");
const governanceApi = read("api/admin-catalog-governance.ts");
const candidateApi = read("api/admin-private-source-candidates.ts");
const tenantReview = read("api/tenant-match-review.ts");
const basesReview = read("api/bases-review-request.ts");
const adminBases = read("api/admin-bases-interpretations.ts");
const index = read("prototype/index.html");
const runtime = read("prototype/platform-runtime.js");
const bdnsImporter = read("scripts/platform/import-bdns-radar.mjs");
const privateImporter = read("scripts/platform/import-open-funders.mjs");
const supplementarySources = read("api/admin-supplementary-basis-sources.ts");

assert(migration.includes("platform_radar_operation_events"), "Falta la auditoría inmutable de operación técnica");
assert(migration.includes("record_opportunity_technical_transition"), "Las transiciones técnicas de oportunidad deben auditarse");
assert(migration.includes("automated_evidence_checked") && migration.includes("operational_exception"), "Faltan estados técnicos conservadores");
assert(governanceApi.includes("requirePlatformAdmin") && governanceApi.includes("private_source_candidate"), "La cola técnica debe ser exclusiva de superadmin y solo operar fuentes");
assert(!governanceApi.includes("platform_opportunities"), "Superadmin no puede aprobar ni rechazar oportunidades");
assert(candidateApi.includes("automatic_evidence_check") && candidateApi.includes("technical_state"), "La validación automática no deja transición técnica auditable");
assert(tenantReview.includes("requireSourcePermission") && tenantReview.includes("match_agent.${decisionStatus}"), "La revisión tenant debe seguir aislada y auditada");
assert(basesReview.includes("accepted_by_entity") && basesReview.includes("affects_other_tenants: false"), "La aceptación de bases debe pertenecer al tenant y no afectar a otros");
assert(!adminBases.includes('req.method === "PATCH"'), "Superadmin no puede aprobar interpretaciones de bases");
assert(index.includes("Operación del radar") && !index.includes("platform-bases-reviews"), "La navegación superadmin no puede presentar una cola de aprobación de bases");
assert(!runtime.includes('request("/api/admin-bases-interpretations?status=review_required")'), "Operación del radar no debe cargar aprobaciones sustantivas de bases");
assert(bdnsImporter.includes("technical_state") && privateImporter.includes("technical_state"), "Los importadores deben clasificar evidencia técnica de oportunidades");
assert(supplementarySources.includes("No aprueba interpretación, elegibilidad ni decisión de aplicar"), "Las fuentes suplementarias solo pueden habilitar captura técnica");
console.log(JSON.stringify({ ok: true, lifecycle: "global_governance_plus_tenant_review" }));
