import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { basesAcceptanceContractHash, combineApprovedBasesRows } from "../../src/basesContract.mjs";

const contract = {
  sections: {
    beneficiaries: [{ text: "Entidades sociales", sourcePage: 2 }],
    eligibleActivities: [{ text: "Itinerarios de inserción", sourcePage: 4 }],
    requiredDocuments: [{ text: "Memoria técnica", sourcePage: 8 }],
    submission: [{ text: "Sede electrónica", sourcePage: 12 }]
  },
  proposalConstraints: { limits: [{ unit: "pages", value: 10, sourcePage: 9 }], formatRules: [] }
};
const reviewRow = { id: "interpretation-tenant", status: "review_required", citations_verified: true, contract_json: contract };
const platformRow = { ...reviewRow, id: "interpretation-platform", status: "approved" };

assert.equal(combineApprovedBasesRows([reviewRow]).requirementsContract.documentaryGate, "blocked_missing_core_requirements");
const accepted = combineApprovedBasesRows([reviewRow], [reviewRow.id]);
assert.equal(accepted.requirementsContract.documentaryGate, "requirements_approved");
assert.equal(accepted.proposalConstraints.draftingGate, "constraints_verified");
assert.deepEqual(accepted.approvedInterpretationIds, [reviewRow.id]);
assert.equal(combineApprovedBasesRows([platformRow]).requirementsContract.documentaryGate, "requirements_approved");
const hash = basesAcceptanceContractHash([reviewRow], [reviewRow.id]);
assert.match(hash, /^[a-f0-9]{64}$/);
assert.equal(hash, basesAcceptanceContractHash([reviewRow], [reviewRow.id]));
const reorderedContract = {
  proposalConstraints: { formatRules: [], limits: [{ sourcePage: 9, value: 10, unit: "pages" }] },
  sections: {
    submission: [{ sourcePage: 12, text: "Sede electrónica" }],
    requiredDocuments: [{ sourcePage: 8, text: "Memoria técnica" }],
    eligibleActivities: [{ sourcePage: 4, text: "Itinerarios de inserción" }],
    beneficiaries: [{ sourcePage: 2, text: "Entidades sociales" }]
  }
};
assert.equal(hash, basesAcceptanceContractHash([{ ...reviewRow, contract_json: reorderedContract }], [reviewRow.id]),
  "El hash cambia por el orden no semántico de jsonb");
assert.notEqual(hash, basesAcceptanceContractHash([{ ...reviewRow, contract_json: { ...contract, sections: { ...contract.sections, submission: [{ text: "Registro presencial" }] } } }], [reviewRow.id]));

const [migration, api, loader, queue, worker, exportApi, ui] = await Promise.all([
  fs.readFile("supabase/migrations/20260722190000_tenant_bases_acceptances.sql", "utf8"),
  fs.readFile("api/bases-review-request.ts", "utf8"),
  fs.readFile("src/platformBases.ts", "utf8"),
  fs.readFile("api/draft-agent-runs.ts", "utf8"),
  fs.readFile("scripts/workers/run-draft-agent.mjs", "utf8"),
  fs.readFile("api/approved-draft-document.ts", "utf8"),
  fs.readFile("prototype/opportunity-requirements.js", "utf8")
]);
assert(migration.includes("tenant_bases_acceptances") && !/for (insert|update|delete|all)/.test(migration), "La decisión permite eludir la API auditada");
assert(api.includes("bases_review.accepted_by_entity") && api.includes("bases_review.discrepancy_reported"), "La API no audita ambas decisiones");
assert(api.includes("affects_other_tenants: false") && api.includes("contract_hash: contractHash"), "La aceptación pierde aislamiento o hash");
assert(loader.includes('acceptance?.status === "discrepancy_reported"') && loader.includes("basesAcceptanceContractHash"), "La carga efectiva no bloquea discrepancias o contratos alterados");
assert(queue.includes("version.id, actor.tenantId") && exportApi.includes("run.opportunity_version_id, actor.tenantId"), "Encolado o exportación no revalidan por tenant");
assert(worker.includes("run.tenant_id") && worker.includes("basesAcceptanceContractHash") && worker.includes("discrepancia vigente"), "El worker no revalida tenant, hash y discrepancia");
assert(ui.includes("Validación experta de tu equipo") && ui.includes("data-confirm-bases-accept") && ui.includes("data-confirm-bases-discrepancy"), "El tenant no puede aceptar o discrepar en su panel");
assert(ui.includes("Revisa las cláusulas y sus citas") && !ui.includes('title: "Validación de plataforma"'), "El panel conserva el rol equivocado");

console.log(JSON.stringify({ assertions: 19, tenantIsolation: true, contractHash: true,
  audit: ["accepted_by_entity", "discrepancy_reported"], gates: ["queue", "worker", "export"], status: "passed" }, null, 2));
