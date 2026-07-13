import fs from "node:fs";
import { reviewOpportunityDocuments } from "../workers/document-review-contract.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const result = reviewOpportunityDocuments({
  id: "version-1",
  contentHash: "sha256-version-1",
  sourceUrl: "https://administracion.example/ficha",
  basesUrl: "https://administracion.example/bases.pdf",
  eligibilityText: "Fundaciones y asociaciones inscritas; domicilio en Comunitat Valenciana.",
  criteriaText: "Impacto social; viabilidad técnica.",
  requiredDocumentsText: "Memoria técnica; presupuesto; certificado registral.",
  submissionChannelText: "Sede electrónica.",
  deadlineText: "Hasta el 30 de septiembre de 2026",
  deadlineConfidence: "high"
});

assert(result.requirements.length === 9, "Extracción documental incompleta");
assert(result.requirements.every((item) => item.evidence.versionId === "version-1"), "Falta versión en evidencia");
assert(result.requirements.every((item) => item.verificationStatus === "pending_human_review"), "Requisito aprobado automáticamente");
assert(result.sourceManifest.allowedDataClasses.join(",") === "public", "El contrato accede a datos tenant no aprobados");
assert(result.externalAiCalls === 0, "La revisión documental consume IA sin necesidad");
assert(result.humanReviewRequired && !result.externalSubmissionAllowed, "Falta control humano o se permite presentar");

const migration = fs.readFileSync("supabase/migrations/20260713210000_tenant_document_reviews.sql", "utf8");
assert(migration.includes("tenant_document_reviews"), "Falta persistencia tenant");
assert(migration.includes("public.is_org_member(tenant_id)"), "Falta aislamiento RLS");
assert(migration.includes("human_review_status"), "Falta revisión humana persistida");

console.log(JSON.stringify({ ok: true, requirements: result.requirements.length, evidence: "versionada", aiCalls: 0, review: "humana obligatoria" }, null, 2));
