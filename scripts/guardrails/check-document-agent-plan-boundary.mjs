import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const files = {
  plan: read("src/tenantPlan.ts"),
  navigation: read("prototype/tenant-plan.js"),
  knowledge: read("prototype/private-knowledge.js"),
  browser: read("prototype/common-knowledge-browser.js"),
  candidatureUi: read("prototype/candidature-document-selection.js"),
  requirements: read("prototype/opportunity-requirements.js"),
  sources: read("api/source-connections.ts"),
  preflight: read("api/private-source-preflight.ts"),
  candidates: read("api/private-document-candidates.ts"),
  annex: read("api/private-annex-file.ts"),
  upload: read("api/source-blob-upload.ts"),
  profile: read("api/tenant-profile-review.ts"),
  governance: read("api/tenant-agent-governance.ts"),
  candidatureApi: read("api/tenant-candidature-documents.ts"),
  versions: read("api/draft-document-versions.ts"),
  bridge: read("backend/app/services/private_knowledge.py"),
};

const entitlement = 'requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent")';
assert(files.plan.includes("Permiso insuficiente: Asistente no incluido"),
  "La guarda de plan no produce un 403 reconocible");
for (const [name, source] of Object.entries({
  sources: files.sources,
  preflight: files.preflight,
  candidates: files.candidates,
  annex: files.annex,
  profile: files.profile,
  governance: files.governance,
  candidature: files.candidatureApi,
  versions: files.versions,
})) {
  assert(source.includes(entitlement), `${name} no exige el agente documental en su mutacion privada`);
}
assert(files.upload.includes('requireTenantAgentEntitlement(getSupabaseAdmin(), actor.tenantId, "draft_agent")'),
  "La carga Blob permite nuevas fuentes sin agente documental");
assert(files.bridge.includes("require_document_agent") && files.bridge.includes("code != \"mission_full\""),
  "La consulta local IA no comprueba el plan");

assert(files.navigation.includes('["knowledge", "workspace"].includes(screen)')
  && files.navigation.includes('"read_only"'),
  "El tenant pierde sus historicos o no recibe modo solo lectura");
assert(files.knowledge.includes("Tus datos siguen disponibles")
  && files.knowledge.includes("agentEnabled: !readOnly")
  && files.knowledge.includes('readOnly ? ""'),
  "Base comun no diferencia propiedad de datos y capacidad contratada");
assert(files.browser.includes("Consulta IA no incluida en el plan")
  && files.browser.includes("!state.agentEnabled"),
  "El chat o las propuestas siguen activos en modo solo lectura");
assert(files.requirements.includes("Histórico en solo lectura")
  && files.requirements.includes("documentAgentContracted()")
  && files.candidatureUi.includes("Histórico conservado"),
  "Candidatura no conserva el historico sin permitir nuevas generaciones");
assert(files.governance.includes('action === "grant_consent" && consentType !== "public_web_analysis"'),
  "El consentimiento privado puede reactivar el agente sin contratarlo");
assert(files.candidatureApi.indexOf('if (req.method === "GET")')
  < files.candidatureApi.indexOf(entitlement),
  "La lectura historica de candidatura exige indebidamente el agente");
assert(files.candidates.indexOf('if (req.method === "GET")')
  < files.candidates.indexOf(entitlement),
  "La lectura de documentos exige indebidamente el agente");

console.log(JSON.stringify({
  ok: true,
  ownershipPreserved: true,
  aiQueryBlocked: true,
  newMutationsBlocked: true,
  historicalCandidaturesReadable: true,
  reactivationUsesPlanEntitlement: true,
}, null, 2));
