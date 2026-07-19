import assert from "node:assert/strict";
import { combineGrantRequirements, extractGrantRequirements } from "../radar/extract-grant-requirements.mjs";
import fs from "node:fs";

const pageEvidence = [
  { page: 3, text: "Personas beneficiarias. Podran ser beneficiarias las asociaciones y fundaciones sin animo de lucro con sede en la Comunitat Valenciana. Requisitos de las entidades: estar legalmente constituidas e inscritas." },
  { page: 7, text: "Actuaciones subvencionables. Seran objeto de subvencion los itinerarios de insercion laboral y formacion. Gastos subvencionables: personal tecnico y materiales directamente vinculados." },
  { page: 12, text: "Documentacion a presentar. La solicitud se acompanara de memoria tecnica, presupuesto desglosado, estatutos y acreditacion de la representacion. Forma y plazo de presentacion: las solicitudes se presentaran en la sede electronica." },
  { page: 16, text: "Criterios de valoracion. Calidad tecnica, impacto social y viabilidad economica, hasta 100 puntos. Obligaciones de las personas beneficiarias: justificar la subvencion y conservar los justificantes." }
];

const contract = extractGrantRequirements(pageEvidence.map((page) => page.text).join("\n"), {
  sourceUrl: "https://organismo.example/bases.pdf",
  documentSha256: "b".repeat(64),
  pageEvidence
});

assert.equal(contract.status, "extracted_requires_review");
assert.equal(contract.documentaryGate, "requirements_extracted_for_review");
assert.equal(contract.missingCoreSections.length, 0);
assert.equal(contract.sections.beneficiaries[0].sourcePage, 3);
assert.match(contract.sections.requiredDocuments[0].text, /memoria tecnica/i);
assert.match(contract.sections.submission[0].text, /sede electronica/i);
assert.equal(contract.sections.evaluationCriteria[0].sourcePage, 16);
assert.equal(contract.sections.budgetRules[0].sourcePage, 7);
assert.equal(contract.requiresHumanReview, true);

const partial = extractGrantRequirements("La convocatoria tiene por objeto apoyar proyectos sociales.");
assert.equal(partial.status, "partial_requires_review");
assert(partial.missingCoreSections.includes("requiredDocuments"));

const combined = combineGrantRequirements([partial, contract]);
assert.equal(combined.status, "extracted_requires_review");
assert(combined.sections.requiredDocuments.length >= 1);

const ordinalHeadings = extractGrantRequirements([
  "Quinto.- Beneficiarios. Podran optar a las subvenciones las asociaciones inscritas.",
  "Base Primera. Objeto. Constituye su objeto financiar programas de inclusion social.",
  "La solicitud debe acompanarse de los siguientes documentos: memoria, presupuesto y estatutos.",
  "El plazo de presentacion de instancias sera de quince dias habiles."
].join("\n\n"));
assert.equal(ordinalHeadings.status, "extracted_requires_review");
assert.equal(ordinalHeadings.missingCoreSections.length, 0);

const participantApplicant = extractGrantRequirements([
  "Cuarta. Requisitos de los participantes. Podran participar las personas autoras de proyectos.",
  "Documentacion a presentar: memoria.",
  "Presentacion de solicitudes: sede electronica.",
  "Primera. Objeto: premiar proyectos sociales."
].join("\n"));
assert.equal(participantApplicant.status, "extracted_requires_review");
assert(participantApplicant.sections.beneficiaries.some((item) => item.coreEvidence));

const wrappedPdfLines = extractGrantRequirements([
  "Primero. Beneficiarios. Podran ser beneficiarias las asociaciones.",
  "Segundo. Objeto. Actuaciones subvencionables de inclusion social.",
  "La solicitud debera acompanarse de los siguientes\ndocumentos: memoria y presupuesto.",
  "El plazo de presentacion de las\nsolicitudes sera de diez dias."
].join("\n"));
assert.equal(wrappedPdfLines.status, "extracted_requires_review");

const repeatedFooterPages = Array.from({ length: 5 }, (_, index) => ({
  page: index + 1,
  text: index < 4
    ? "Sede electronica. Registro electronico. Sede electronica."
    : "El plazo de presentacion de las solicitudes sera de diez dias."
}));
const lateSubmission = extractGrantRequirements(repeatedFooterPages.map((page) => page.text).join("\n"), { pageEvidence: repeatedFooterPages });
assert(lateSubmission.sections.submission.some((item) => item.coreEvidence && item.sourcePage === 5));

const municipalWording = extractGrantRequirements([
  "Tercero.- Requisitos y beneficiarios. Tendran la condicion de beneficiarias las asociaciones locales.",
  "Primera. Objeto. Financiar actividades deportivas de competicion y eventos extraordinarios.",
  "Las solicitudes deberan ir acompanadas por la siguiente documentacion: memoria y presupuesto.",
  "El plazo de presentacion de solicitudes sera de quince dias naturales."
].join("\n"));
assert.equal(municipalWording.status, "extracted_requires_review");
assert.equal(municipalWording.missingCoreSections.length, 0);

const catalanDocuments = extractGrantRequirements([
  "Article 3. Beneficiaris. Podran participar les entitats sense anim de lucre.",
  "Article 1. Objecte. Actuacions subvencionables en materia esportiva.",
  "Les sol·licituds hauran d'anar acompanyades de la següent documentació: memoria i pressupost.",
  "Presentacio de sol·licituds: registre electronic."
].join("\n"));
assert.equal(catalanDocuments.status, "extracted_requires_review");
assert(catalanDocuments.sections.requiredDocuments.some((item) => item.coreEvidence));

const poblaOfficialDocuments = extractGrantRequirements([
  { page: 5, text: "SETENA.- Sol·licituds. Les sol·licituds d’ajuts es presentaran mitjançant model normalitzat, adjuntant la documentació mínima explicitada en aquestes bases. VUITENA.- Documentació. La persona sol·licitant haurà de presentar la sol·licitud adjuntant la documentació preceptiva que s’assenyala a continuació. Documentació comuna a les dues línies d’ajut: 1. Identificació de qui subscriu la sol·licitud. 3. DNI, NIE o NIF del beneficiari i documentació acreditativa de la representació. 4. Descripció dels llocs de treball o de l’empresa, adjuntant escriptura de constitució. 6. Document acreditatiu d’estar donat d’alta a la Seguretat Social." },
  { page: 6, text: "Documentació que cal afegir a la línia d’ajuts a la contractació: 1. Certificat d’empadronament del treballador contractat. 2. Document acreditatiu que el treballador està inscrit a la Borsa de treball." }
].map((page) => page.text).join("\n"), { pageEvidence: [
  { page: 5, text: "SETENA.- Sol·licituds. Les sol·licituds d’ajuts es presentaran mitjançant model normalitzat, adjuntant la documentació mínima explicitada en aquestes bases. VUITENA.- Documentació. La persona sol·licitant haurà de presentar la sol·licitud adjuntant la documentació preceptiva que s’assenyala a continuació. Documentació comuna a les dues línies d’ajut: 1. Identificació de qui subscriu la sol·licitud. 3. DNI, NIE o NIF del beneficiari i documentació acreditativa de la representació. 4. Descripció dels llocs de treball o de l’empresa, adjuntant escriptura de constitució. 6. Document acreditatiu d’estar donat d’alta a la Seguretat Social." },
  { page: 6, text: "Documentació que cal afegir a la línia d’ajuts a la contractació: 1. Certificat d’empadronament del treballador contractat. 2. Document acreditatiu que el treballador està inscrit a la Borsa de treball." }
] });
assert(poblaOfficialDocuments.sections.requiredDocuments.some((item) => item.sourcePage === 5 && item.coreEvidence));
assert(poblaOfficialDocuments.sections.requiredDocuments.some((item) => item.sourcePage === 6 && item.coreEvidence));

const importer = fs.readFileSync("scripts/platform/import-bdns-radar.mjs", "utf8");
const tenantApi = fs.readFileSync("api/tenant-match-runs.ts", "utf8");
const tenantRuntime = fs.readFileSync("prototype/tenant-recommendations-runtime.js", "utf8");
const documentaryRuntime = fs.readFileSync("prototype/opportunity-requirements.js", "utf8");
const queue = fs.readFileSync("scripts/platform/queue-bases-interpretations.mjs", "utf8");
const radarWorker = fs.readFileSync("scripts/workers/run-municipal-radar.mjs", "utf8");
const reviewApi = fs.readFileSync("api/admin-bases-interpretations.ts", "utf8");
const approvedBases = fs.readFileSync("src/platformBases.ts", "utf8");
const legacyDocumentApi = fs.readFileSync("api/candidature-document-package.ts", "utf8");
const approvedDocumentApi = fs.readFileSync("api/approved-draft-document.ts", "utf8");
const legacyDocumentReviewApi = fs.readFileSync("api/document-review-runs.ts", "utf8");
const draftApi = fs.readFileSync("api/draft-agent-runs.ts", "utf8");
const draftWorker = fs.readFileSync("scripts/workers/run-draft-agent.mjs", "utf8");
const platformRuntime = fs.readFileSync("prototype/platform-runtime.js", "utf8");
const draftRuntime = fs.readFileSync("prototype/draft-agent-ui.js", "utf8");
assert(importer.includes("requirements_contract"), "La importacion no persiste el contrato de bases");
assert(tenantApi.includes("evidence_json") && tenantRuntime.includes("requirementsContract"), "El contrato no llega al tenant");
assert(documentaryRuntime.includes("officialDocumentEntries") && documentaryRuntime.includes("documentRequirements: officialDocumentEntries"), "El gestor documental no usa documentos extraidos de las bases");
assert(queue.includes('access: "private"') && queue.includes('status: deterministicComplete ? "review_required" : "queued"'), "La captura no preserva artefactos privados ni encola interpretaciones parciales");
assert(!queue.includes("tenant_id") && radarWorker.includes("queue-bases-interpretations.mjs"), "La interpretacion publica se duplica por tenant o no forma parte de la campana");
assert(reviewApi.includes("requirePlatformAdmin") && reviewApi.includes("citations_verified"), "La aprobacion de bases no exige rol de plataforma y citas verificadas");
assert(approvedBases.includes("requirements_approved") && approvedBases.includes("missingCoreSections"), "El contrato aprobado no comprueba los cuatro bloques esenciales");
assert(legacyDocumentApi.includes("status(410)") && legacyDocumentApi.includes("Ruta retirada"), "La ruta de plantillas locales sigue aceptando paquetes no gobernados");
assert(approvedDocumentApi.includes("Exportacion bloqueada") && approvedDocumentApi.includes('access: "private"'), "La exportacion aprobada no respeta el gate o privacidad tenant");
assert(draftApi.includes("requirementsContractHash") && draftWorker.includes("approvedRequirements"), "El redactor no conserva ni revalida el contrato de bases aprobado");
assert(documentaryRuntime.includes("Bases pendientes de revisión de plataforma") && documentaryRuntime.includes("La redacción se habilitará cuando plataforma valide"), "La candidatura no comunica el bloqueo de bases");
assert(platformRuntime.includes("platform-bases-reviews") && platformRuntime.includes("Aprobar interpretacion"), "La revision de bases no tiene control operativo en plataforma");
assert(platformRuntime.includes("clause.coreEvidence") && platformRuntime.includes("/4 esenciales"), "La revision no distingue clausulas nucleares de menciones contextuales");
assert(documentaryRuntime.includes("Generar borrador público") && documentaryRuntime.includes("Generar borrador personalizado"), "La candidatura no distingue el borrador publico del personalizado consentido");
assert(!documentaryRuntime.includes("data-doc-agent-build") && !documentaryRuntime.includes("data-download-doc"), "La interfaz aun expone la antigua generacion local de .doc");
assert(queue.includes("extractProposalConstraints") && draftWorker.includes("requirementsContract.proposalConstraints"), "Los limites formales interpretados no llegan al redactor");
assert(documentaryRuntime.includes("documentClassLabels") && documentaryRuntime.includes("basesClarityPanel") && documentaryRuntime.includes("Qué hará la app"), "La candidatura no explica de forma amigable la clasificacion documental");
assert(documentaryRuntime.includes("Sin lectura estructurada de las bases") && documentaryRuntime.includes("redacción bloqueada"), "La vista oculta la ausencia o insuficiencia de bases claras");
assert(draftRuntime.includes("categoryLabels") && draftRuntime.includes("Cubre ${item.requirementRefs"), "La revision final no muestra que tipo de documento cubre cada requisito");
assert(!documentaryRuntime.includes("data-document-agent=") && !documentaryRuntime.includes("data-open-governed-candidature") && documentaryRuntime.includes("data-requirement-preselect"), "La oportunidad puede saltarse la preseleccion antes de abrir la candidatura");
assert(legacyDocumentReviewApi.includes("status(410)") && legacyDocumentReviewApi.includes("bases aprobadas"), "La API aun permite encolar revisiones documentales planas");
assert(documentaryRuntime.includes("cross_reference_only") && documentaryRuntime.includes("Hay que localizar ese documento oficial"), "La candidatura no explica como recuperar unas bases incompletas");
assert(documentaryRuntime.includes("awaiting_official_publication") && documentaryRuntime.includes("volverá a comprobar"), "La candidatura no distingue unas bases pendientes de publicacion oficial");
assert(documentaryRuntime.includes("official_notice_without_application_documents") && documentaryRuntime.includes("boletín oficial ya confirma"), "La candidatura no distingue un extracto oficial de las bases completas");
assert(documentaryRuntime.includes("requires_portal_interaction") && documentaryRuntime.includes("persona autorizada desde el portal"), "La candidatura no explica que la instancia oficial requiere intervencion humana");

console.log(JSON.stringify({ assertions: 46, status: "passed", covered: contract.coveredSections }, null, 2));
