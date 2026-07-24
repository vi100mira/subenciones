import assert from "node:assert/strict";
import { actionableDocumentRequirements, classifyDocumentRequirement } from "../workers/document-requirement-classifier.mjs";
import { extractGrantRequirements } from "../radar/extract-grant-requirements.mjs";

const memory = classifyDocumentRequirement("Documentacion a presentar: Memoria tecnica del proyecto.");
assert.deepEqual([memory.phase, memory.recommendedCategory, memory.recommendedPreparation, memory.planningReady], ["application", "generated_draft", "drafted_in_proposal", true]);

const form = classifyDocumentRequirement("La solicitud se presentara en el modelo normalizado Anexo I.");
assert.equal(form.recommendedCategory, "official_form");
assert.equal(form.recommendedPreparation, "official_template_required");

const evidence = classifyDocumentRequirement("Debera adjuntarse certificado de estar al corriente y copia del NIF.");
assert.equal(evidence.recommendedCategory, "supporting_evidence");
assert.equal(evidence.recommendedPreparation, "tenant_evidence_required");

const declaration = classifyDocumentRequirement("Debera aportarse declaracion responsable firmada por la representacion legal.");
assert.equal(declaration.recommendedCategory, "declaration");
assert.equal(declaration.recommendedPreparation, "human_completion_required");

const mixed = classifyDocumentRequirement("Documentacion obligatoria: 1. Anexo I. 2. Memoria. 3. Certificado tributario.");
assert.equal(mixed.recommendedCategory, "mixed_bundle");
assert.equal(mixed.recommendedPreparation, "pending_classification");
assert.deepEqual(mixed.detectedCategories, ["official_form", "generated_draft", "supporting_evidence"]);

const postAward = classifyDocumentRequirement("Documentacion a aportar para la justificacion: nominas y justificantes bancarios.");
assert.equal(postAward.phase, "post_award");
const contextual = classifyDocumentRequirement("Si no se adjunta la documentacion requerida se concederan diez dias para subsanar.");
assert.equal(contextual.phase, "contextual");
assert.equal(classifyDocumentRequirement("Subsanacion de deficiencias en la solicitud y documentacion complementaria. El organo instructor podra requerir documentos relacionados con la propuesta tecnica.").phase, "contextual");
assert.equal(classifyDocumentRequirement("Solicitud y documentacion. Las solicitudes se presentaran en la sede electronica. La presentacion presume la aceptacion incondicional de las bases.").phase, "contextual");
assert.equal(classifyDocumentRequirement("En ausencia de estos se aportara memoria-evaluacion detallada de la actividad realizada y memoria justificativa del cumplimiento.").phase, "post_award");
const reference = classifyDocumentRequirement("La documentacion a presentar sera la relacionada en el Anexo I de las bases reguladoras.");
assert.equal(reference.specificity, "reference_only");
assert.equal(reference.planningReady, false);
const includedAnnex = classifyDocumentRequirement("a) Solicitud de participacion, segun el modelo que figura como Anexo I de estas bases.");
assert.equal(includedAnnex.specificity, "itemized");
assert.equal(includedAnnex.planningReady, true);

const contract = { sections: { requiredDocuments: [
  { text: "Memoria tecnica del proyecto" },
  { text: "Documentacion a aportar para la justificacion: facturas." },
  { text: "Si falta documentacion se requerira su subsanacion." }
] } };
assert.equal(actionableDocumentRequirements(contract).length, 1);

const extracted = extractGrantRequirements(`
1. Beneficiarios\nPodran ser beneficiarias las entidades sociales inscritas.\n
2. Objeto\nConstituye el objeto financiar proyectos de inclusion.\n
3. Documentacion a presentar\nMemoria tecnica del proyecto y presupuesto detallado.\n
4. Presentacion de solicitudes\nLas solicitudes se presentaran en la sede electronica.\n
5. Justificacion\nDocumentacion a aportar para la justificacion: facturas y justificantes bancarios.`);
assert.equal(extracted.schemaVersion, 3);
assert.equal(extracted.sections.requiredDocuments.length, 1);
assert.equal(extracted.sections.requiredDocuments[0].documentClassification.phase, "application");
assert.ok(extracted.excludedDocumentMentions.some((item) => item.documentClassification.phase === "post_award"));
assert.equal(extracted.documentaryGate, "requirements_extracted_for_review");

const gvaDocuments = extractGrantRequirements("", { pageEvidence: [
  { page: 15, text: "El formulario de solicitud incorporará: a) una declaración responsable. b) una autorización para comprobar obligaciones tributarias." },
  { page: 16, text: "Junto con la solicitud se deberán adjuntar dos ejemplares del trabajo o proyecto, uno de ellos anonimizado." }
] });
assert.ok(gvaDocuments.sections.requiredDocuments.some((item) => item.sourcePage === 15));
assert.ok(gvaDocuments.sections.requiredDocuments.some((item) => item.sourcePage === 16));
assert.equal(gvaDocuments.documentRecovery.status, "application_documents_detected");

const corunaDocuments = extractGrantRequirements("Articulo 16. Solicitudes y documentacion. Las solicitudes deberan acompanarse de la documentacion que se indica a continuacion: - Anexo de solicitud. - Copia de los estatutos. - Certificado de la junta directiva. - Memoria descriptiva del proyecto.");
assert.equal(corunaDocuments.documentRecovery.status, "application_documents_detected");
assert.ok(corunaDocuments.sections.requiredDocuments[0].documentClassification.detectedCategories.includes("supporting_evidence"));

const bridged = extractGrantRequirements("", { pageEvidence: [
  { page: 7, text: "Les sol·licituds hauran d’anar acompanyades de la següent documentació:" },
  { page: 8, text: "1. Model normalitzat. 2. Memòria del projecte. 3. Certificat d'inscripció i estatuts." }
] });
const continued = bridged.sections.requiredDocuments.find((item) => item.continuedFromPage === 7);
assert.ok(continued);
assert.equal(continued.sourcePage, 8);
assert.equal(continued.documentClassification.planningReady, true);

const sieroBridge = extractGrantRequirements("", { pageEvidence: [
  { page: 2, text: "Sexta.- Solicitud y documentacion. Las entidades solicitantes deberan presentar la siguiente documentacion: a) Solicitud de participacion, segun el modelo que figura como anexo a estas bases (Anexo I)." },
  { page: 3, text: "b) Documentacion relativa a la entidad: fotocopia del DNI, CIF, estatutos y acreditacion de la representacion. c) Anexos. d) Certificados tributarios. e) Declaracion responsable." }
] });
assert.ok(sieroBridge.sections.requiredDocuments.some((item) => item.continuedFromPage === 2 && item.sourcePage === 3));
assert.equal(sieroBridge.documentRecovery.status, "application_documents_detected");

const realejosBridge = extractGrantRequirements("", { pageEvidence: [
  { page: 4, text: "Articulo 4.- Documentacion. Para solicitar cualquiera de las ayudas previstas sera necesario aportar los siguientes documentos: a) Solicitud mediante instancia normalizada. b) Fotocopia del DNI o NIE y Libro de Familia. c) Alta a terceros. d) Justificantes de ingresos. e) Declaracion responsable." },
  { page: 5, text: "i) Sentencia o convenio regulador. j) Extractos bancarios de los tres ultimos meses. k) Documento que acredite la deuda. l) Documento oficial del grado de discapacidad." }
] });
assert.ok(realejosBridge.sections.requiredDocuments.some((item) => item.sourcePage === 4 && item.coreEvidence));
assert.ok(realejosBridge.sections.requiredDocuments.some((item) => item.continuedFromPage === 4 && item.sourcePage === 5));
assert.equal(classifyDocumentRequirement("i) Sentencia o convenio regulador. j) Extractos bancarios. l) Documento del grado de discapacidad.").recommendedCategory, "supporting_evidence");

const awaitingPublication = extractGrantRequirements("SEGUNDO: Proceder a la publicacion de esta Convocatoria y Bases Reguladoras en el Tablon de Anuncios Municipal, pagina Web y en el Boletin Oficial de la Provincia. Las bases se encontraran a disposicion junto al modelo oficial de solicitud.", { sourceUrl: "https://registro.example/decreto.pdf", documentSha256: "publication-hash", pageEvidence: [{ page: 2, text: "SEGUNDO: Proceder a la publicacion de esta Convocatoria y Bases Reguladoras en el Tablon de Anuncios Municipal, pagina Web y en el Boletin Oficial de la Provincia. Las bases se encontraran a disposicion junto al modelo oficial de solicitud." }] });
assert.equal(awaitingPublication.documentRecovery.status, "awaiting_official_publication");
assert.equal(awaitingPublication.documentRecovery.nextAction, "monitor_official_publication_channels");
assert.deepEqual(awaitingPublication.documentRecovery.publicationChannels, ["official_journal", "issuing_body", "electronic_noticeboard"]);
assert.equal(awaitingPublication.documentRecovery.publicationEvidence.sourcePage, 2);

const officialNotice = extractGrantRequirements("", { sourceAuthority: "official_journal", pageEvidence: [{ page: 330, text: "BDNS (Identif.): 918347.\nPrimero. Beneficiarios y requisitos: las familias solicitantes.\nSegundo. Finalidad: adquisicion de libros y material escolar.\nQuinto. Forma, lugar y plazo de presentacion de solicitudes: mediante sede electronica. El modelo normalizado se acompanara de la documentacion correspondiente." }] });
assert.equal(officialNotice.documentRecovery.status, "official_notice_without_application_documents");
assert.equal(officialNotice.documentRecovery.nextAction, "locate_full_bases_and_application_form");
assert.equal(officialNotice.documentRecovery.requiresAdditionalOfficialSource, true);

const officialProcedure = extractGrantRequirements("", { sourceUrl: "https://aytovalverde.sedelectronica.es/procedure", documentSha256: "b".repeat(64), pageEvidence: [{ page: 1, text: [
  "Ayudas de material escolar curso 2026/2027", "Codigo SIA: 3196388", "Documentacion Opcional",
  "Libro de Familia o Partida de nacimiento", "Requisito de Validez", "Original o copia autentica",
  "Titulo de familia numerosa (si procede)", "Requisito de Validez", "Copia simple",
  "Certificado de prestaciones del SEPE", "Requisito de Validez", "Copia simple",
  "Informe de vida laboral de los miembros mayores de edad", "Requisito de Validez", "Copia simple",
  "Normativa aplicable"
].join("\n") }] });
assert.equal(officialProcedure.officialProcedure?.siaCode, "3196388");
assert.equal(officialProcedure.officialProcedure?.applicationFormAccess, "requires_portal_interaction");
assert.equal(officialProcedure.documentRecovery.status, "application_documents_detected");
assert(officialProcedure.sections.requiredDocuments.length >= 4, "La ficha SIA debe conservar cada documento por separado");
assert(officialProcedure.sections.requiredDocuments.some((item) => item.conditional), "Los documentos condicionales deben quedar marcados");

console.log(JSON.stringify({ assertions: 49, phases: ["application", "post_award", "contextual"], categories: ["generated_draft", "official_form", "declaration", "supporting_evidence", "mixed_bundle"], pageBridge: true, recovery: true, status: "passed" }, null, 2));
