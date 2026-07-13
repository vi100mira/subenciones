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
assert(worker.includes('.eq("agent_key", "match_agent")'), "El worker no aísla la cola de encaje");
assert(worker.includes('.eq("status", "approved")'), "El worker usa hechos sin aprobar");
assert(worker.includes("profile_snapshot_hash"), "El worker no conserva snapshot del perfil");
assert(worker.includes('status: "review_required"'), "El worker no exige revisión");
assert(worker.includes("match_agent.generated_for_review"), "Falta auditoría del encaje");
assert(!worker.toLowerCase().includes("novaterra"), "El worker depende del piloto");

console.log(JSON.stringify({ ok: true, candidateScore: relevant.score, lowFitScore: uncertain.score, evidence: "versionada", decision: "revisión humana" }, null, 2));
