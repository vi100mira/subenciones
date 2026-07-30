import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {
  PUBLIC_NATIONAL_SOURCE_CATALOG,
  PUBLIC_NATIONAL_SOURCE_CATALOG_VERSION,
  isPublicSourceScanEligible,
  publicSourceScanBlockReason
} from "../platform/public-national-source-catalog.mjs";

const expectedGazettes = new Set([
  "boja", "boa", "bopa", "boib", "boc-canarias", "boc-cantabria", "docm", "bocyl", "dogc",
  "dogv", "doe", "dog", "bocm", "borm", "bon", "bopv", "bor"
]);

assert.equal(PUBLIC_NATIONAL_SOURCE_CATALOG_VERSION, "public-national-v1");
assert.equal(PUBLIC_NATIONAL_SOURCE_CATALOG.length, 19, "BDNS, BOE and 17 autonomous gazettes are required");
assert.equal(new Set(PUBLIC_NATIONAL_SOURCE_CATALOG.map((source) => source.id)).size, 19, "source ids must be unique");

const bdns = PUBLIC_NATIONAL_SOURCE_CATALOG.find((source) => source.id === "bdns-snpsap");
assert.equal(bdns?.source_role, "discovery_canonical");
assert.equal(bdns?.kind, "bdns");
assert.equal(PUBLIC_NATIONAL_SOURCE_CATALOG.find((source) => source.id === "boe")?.source_role, "official_publication");

const approvedButRobotsPending = { ...bdns, review_status: "approved_for_scan", scan_policy: { ...bdns.scan_policy, enabled: true } };
assert.equal(publicSourceScanBlockReason(approvedButRobotsPending), "robots_not_permitted", "approval cannot bypass robots assessment");
const robotsAllowedTermsPending = { ...approvedButRobotsPending, access: { ...bdns.access, robots_status: "permitted" } };
assert.equal(publicSourceScanBlockReason(robotsAllowedTermsPending), "terms_not_permitted", "robots permission cannot bypass terms assessment");

for (const source of PUBLIC_NATIONAL_SOURCE_CATALOG) {
  assert.equal(source.scope, "platform_global", `${source.id} must not be tenant scoped`);
  assert.equal("tenant_id" in source, false, `${source.id} must not contain tenant_id`);
  assert.equal(source.opportunity_policy, "evidence_only_never_create_opportunities", `${source.id} must not create opportunities`);
  assert.equal(source.review_status, "pending_assessment", `${source.id} needs review before any scan`);
  assert.equal(source.access.robots_status, "pending_assessment", `${source.id} must record robots state`);
  assert.equal(source.access.terms_status, "pending_assessment", `${source.id} must record terms state`);
  assert.equal(source.scan_policy.enabled, false, `${source.id} must start disabled`);
  assert.equal(source.scan_policy.requestsPerMinute, 0, `${source.id} must have no initial request budget`);
  assert.equal(isPublicSourceScanEligible(source), false, `${source.id} must not be scan eligible`);
  assert.equal(publicSourceScanBlockReason(source), "review_pending", `${source.id} needs an explicit human review`);
  assert.match(source.url, /^https:\/\//, `${source.id} requires an HTTPS provenance URL`);
  if (source.procedure_evidence_url) {
    assert.equal(source.procedure_evidence_role, "procedure_evidence", `${source.id} must classify procedure evidence`);
    assert.match(source.procedure_evidence_url, /^https:\/\//, `${source.id} procedure evidence must be HTTPS`);
  }
}

assert.deepEqual(new Set(PUBLIC_NATIONAL_SOURCE_CATALOG.filter((source) => source.kind === "gazette" && source.territory_codes[0] !== "ES").map((source) => source.id)), expectedGazettes);
assert.equal(new Set(PUBLIC_NATIONAL_SOURCE_CATALOG.filter((source) => source.kind === "gazette" && source.territory_codes[0] !== "ES").map((source) => source.territory_codes[0])).size, 17, "each autonomous gazette must retain its territory");

const uiCode = fs.readFileSync("prototype/public-national-source-catalog-ui.js", "utf8");
const uiContext = { window: {} }; vm.runInNewContext(uiCode, uiContext);
const uiCatalog = uiContext.window.NationalSourceCatalogUI;
assert.equal(uiCatalog?.version, PUBLIC_NATIONAL_SOURCE_CATALOG_VERSION, "superadmin UI must use the catalog version");
assert.deepEqual([...uiCatalog.sources.map((source) => source.id)], PUBLIC_NATIONAL_SOURCE_CATALOG.map((source) => source.id), "superadmin UI must mirror the canonical source ids");
assert.equal(uiCatalog.summary.scanEligible, 0, "superadmin UI must not imply active scanning");
assert(!/\bGVA\b|\bLABORA\b/.test(uiCode), "superadmin catalog must not revive inherited mock categories");
assert(!uiCode.includes("fetch("), "superadmin catalog view must not add network calls");
assert(uiCode.includes("readModel?.territories?.length"), "superadmin catalog must render the persisted national opportunity read-model");
assert(uiCode.includes("abiertas verificadas"), "superadmin catalog must distinguish verified open opportunities");
assert(uiCode.includes("Datos de oportunidades procedentes de BDNS") && uiCode.includes("Estas cifras no dependen del conector territorial"), "BDNS opportunity data must remain separate from connector status");
assert(uiCode.includes("Conector territorial") && uiCode.includes("no se ha programado ningún rastreo") && uiCode.includes("Siguiente paso:"), "territorial connector must explain its inactive technical state without a simulated queue");
assert(!uiCode.includes("Pendiente de revision y permisos"), "territorial connector must not be presented as a generic review queue");
const dashboardCode = fs.readFileSync("prototype/dashboard-renderer.js", "utf8");
assert(dashboardCode.includes("if (isPlatform && nationalCatalog)"), "national catalog must render only in the superadmin branch");
const platformRuntimeCode = fs.readFileSync("prototype/platform-runtime.js", "utf8");
assert(platformRuntimeCode.includes("nationalOpportunityMap"), "superadmin runtime must request the national opportunity read-model through its existing API response");
const dashboardHtml = fs.readFileSync("prototype/index.html", "utf8");
const sourceMapNote = dashboardHtml.match(/source-map-accounting-note">([^<]*)<\/p>/)?.[1] || "";
assert(!sourceMapNote.includes("DOGV/BOP"), "source map must not retain inherited territorial mock wording");
console.log(JSON.stringify({ ok: true, sources: PUBLIC_NATIONAL_SOURCE_CATALOG.length, gazettes: expectedGazettes.size, scanEligible: 0 }));
