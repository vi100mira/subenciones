import fs from "node:fs";
import { matchOpportunity } from "../workers/tenant-match-contract.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const profile = {
  territories: ["Comunitat Valenciana", "Valencia"],
  themes: ["empleo", "formación", "inclusión social"],
  legalForms: ["fundación"],
  programs: ["inserción laboral"],
  collectives: ["jóvenes"],
  approvedFactRefs: ["fact-territory", "fact-theme"]
};

const relevant = matchOpportunity(profile, {
  versionId: "version-1",
  title: "Programas de empleo e inclusión",
  territory: "Comunitat Valenciana",
  themes: ["empleo"],
  deadlineStatus: "open",
  deadlineConfidence: "high",
  deadlineText: "Abierta hasta septiembre",
  eligibilityText: "Fundaciones y asociaciones",
  criteriaText: "Formación e inserción laboral de jóvenes",
  officialUrl: "https://official.example/call"
});

assert(relevant.recommendationStatus === "candidate", "La oportunidad relevante no queda candidata");
assert(relevant.score >= 60 && relevant.score <= 100, "Puntuación fuera de contrato");
assert(relevant.reasons.some((reason) => reason.code === "territory"), "Falta razón territorial");
assert(relevant.evidence.every((item) => item.sourceUrl && item.opportunityVersionId), "Falta evidencia versionada");
assert(relevant.internalFactRefs.length === 2, "No declara hechos aprobados usados");
assert(relevant.humanReviewStatus === "pending" && relevant.advisoryOnly, "El encaje decide sin revisión");

const uncertain = matchOpportunity(profile, {
  versionId: "version-2",
  title: "Premio deportivo local",
  territory: "Otra región",
  themes: ["deporte"],
  deadlineStatus: "uncertain",
  deadlineConfidence: "low",
  deadlineText: "Consultar bases",
  eligibilityText: "Clubes deportivos",
  criteriaText: "Competiciones",
  sourceUrl: "https://official.example/other"
});

assert(uncertain.recommendationStatus === "low_fit", "El caso no compatible no queda como bajo encaje");
assert(uncertain.risks.some((risk) => risk.code === "deadline_confidence"), "No muestra incertidumbre de plazo");
assert(uncertain.missingInformation.length > 0, "No explicita información faltante");

const contract = fs.readFileSync("scripts/workers/tenant-match-contract.mjs", "utf8").toLowerCase();
assert(!contract.includes("novaterra"), "El encaje depende del piloto");
const worker = fs.readFileSync("scripts/workers/run-tenant-match.mjs", "utf8");
const api = fs.readFileSync("api/tenant-match-runs.ts", "utf8");
const reviewApi = fs.readFileSync("api/tenant-match-review.ts", "utf8");
const reviewMigration = fs.readFileSync("supabase/migrations/20260714113000_tenant_match_human_workflow.sql", "utf8");
const reviewRuntime = fs.readFileSync("prototype/tenant-match-review.js", "utf8");
const workspaceRuntime = fs.readFileSync("prototype/workspace-flow.js", "utf8");
const recommendationRuntime = fs.readFileSync("prototype/tenant-recommendations-runtime.js", "utf8");
assert(worker.includes('.eq("agent_key", "match_agent")'), "El worker no aísla la cola de encaje");
assert(worker.includes('.eq("status", "approved")'), "El worker usa hechos sin aprobar");
assert(worker.includes("profile_snapshot_hash"), "El worker no conserva snapshot del perfil");
assert(worker.includes('status: "review_required"'), "El worker no exige revisión");
assert(worker.includes("match_agent.generated_for_review"), "Falta auditoría del encaje");
assert(!worker.toLowerCase().includes("novaterra"), "El worker depende del piloto");
assert(api.includes("latestRun"), "La API no comunica el estado de la ejecuciÃ³n de encaje");
assert(api.includes('.eq("agent_key", "match_agent")'), "La lectura de estado puede mezclar ejecuciones de otros agentes");
assert(api.includes("recommendations: recommendationsWithBases") && api.includes("reviewSummary"), "La API no separa recomendaciones y estado de revision");
assert(reviewMigration.includes("decision_status") && reviewMigration.includes("candidacy_stage"), "Falta persistir decision humana y fase de candidatura");
assert(reviewMigration.includes("review_started_at") && reviewMigration.includes("review_completed_at"), "Falta persistir el ciclo de revision");
assert(reviewMigration.includes("public.tenant_opportunity_recommendations"), "El flujo no queda aislado en recomendaciones tenant");
assert(reviewApi.includes('body.action === "start_review"'), "Falta iniciar la revision de forma explicita");
assert(reviewApi.includes('body.action === "complete_review"'), "Falta completar la revision de forma explicita");
assert(reviewApi.includes("Selecciona un motivo de descarte"), "El descarte no exige motivo humano");
assert(reviewApi.includes('action, target_type: targetType'), "Las decisiones no dejan auditoria");
assert(reviewRuntime.includes("Consultar no implica aprobar"), "La interfaz confunde consulta y aprobacion");
assert(reviewRuntime.includes("humana en curso") && reviewRuntime.includes("pendingActionable"), "La interfaz no comunica revision en curso");
assert(reviewRuntime.includes("Abandonar candidatura"), "Una candidatura avanzada solo permite descarte simple");
assert(!workspaceRuntime.includes("|| rows[0]") && !workspaceRuntime.includes("const fallback = rows.filter"), "Candidatura vuelve a fabricar expedientes de relleno");
assert(workspaceRuntime.includes("Todavia no hay candidaturas"), "Candidatura no comunica el estado vacio real");
assert(recommendationRuntime.includes("tenant-match-load-state") && recommendationRuntime.includes("TENANT_MATCH_LOAD_ERROR"), "El fallo de carga del encaje queda oculto");

console.log(JSON.stringify({ ok: true, candidateScore: relevant.score, lowFitScore: uncertain.score, evidence: "versionada", decision: "revisión humana" }, null, 2));
