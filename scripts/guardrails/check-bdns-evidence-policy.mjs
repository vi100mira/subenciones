import assert from "node:assert/strict";
import fs from "node:fs";

import { buildBasisDocuments, callDocumentSet, documentDownloadUrl, isSpecificOfficialDocumentUrl, primaryCallDocument, resolveCorunaReferenceFromHtml } from "../radar/fetch-bdns-latest.mjs";
import { hasApplicationMaterial, hasSubstantiveBases, verifiedEvidence } from "../radar/apply-bdns-bases-scan.mjs";

const basesDocument = { id: 41, description: "Documento de la convocatoria en español", filename: "BASES ACCION SOCIAL 2026.pdf" };
const selected = primaryCallDocument([
  { id: 40, description: "ANEXO SOLICITUD", filename: "Anexo I.pdf" },
  basesDocument
]);
assert.equal(selected?.id, 41, "Debe priorizar el documento completo de bases sobre anexos");
assert.equal(primaryCallDocument([{ id: 42, description: "Documento", filename: "Extracto convocatoria.pdf" }]), null, "Un extracto no equivale a bases");
assert.equal(documentDownloadUrl(41), "https://www.infosubvenciones.es/bdnstrans/api/convocatorias/documentos?idDocumento=41");

const documentSet = callDocumentSet([
  { id: 50, description: "Documento de la convocatoria en español", filename: "castellano.pdf" },
  { id: 51, description: "convocatoria", filename: "decreto convocatoria.pdf" },
  { id: 52, description: "Documento de la convocatoria en lengua cooficial", filename: "euskera.pdf" },
  { id: 53, description: "ANEXO II DOCUMENTACIÓN A PRESENTAR", filename: "Anexo II.pdf" },
  { id: 54, description: "Memoria para la justificación", filename: "Anexo V.pdf" }
]);
assert.deepEqual(documentSet.map((document) => document.id), [50, 51, 53], "Debe conservar convocatoria y anexos de solicitud, sin duplicado cooficial ni justificacion");
const combinedDocuments = buildBasisDocuments(
  documentSet.map((document) => ({ ...document, downloadUrl: documentDownloadUrl(document.id) })),
  ["https://boletin.example/bases-reguladoras.pdf"]
);
assert.deepEqual(
  combinedDocuments.map((document) => document.role),
  ["primary", "call", "application_form", "regulatory"],
  "Las bases reguladoras externas deben complementar los documentos BDNS"
);
assert.equal(isSpecificOfficialDocumentUrl("https://bop.dival.es/bop/downloads?anuncioNumReg=2026/03351&lang=es"), true);
assert.equal(isSpecificOfficialDocumentUrl("https://aytovalverde.sedelectronica.es/"), false, "Una portada no es evidencia de bases");

const substantiveText = "Bases y convocatoria. Personas beneficiarias y requisitos. Plazo de solicitud. Criterios y documentación. Presupuesto e importe.".repeat(20);
assert.equal(hasSubstantiveBases(substantiveText), true);
assert.equal(hasSubstantiveBases("Anuncio de una ayuda disponible.".repeat(50)), false);
const applicationText = "ANEXO II. Solicitud y documentación: NIF, representante, memoria y firma.".repeat(30);
assert.equal(hasApplicationMaterial(applicationText), true);

const officialUrl = documentDownloadUrl(41);
const validResult = {
  evidence_documents: [{
    source_url: officialUrl,
    curated_basis_origin: officialUrl,
    extraction_status: "ready",
    sha256: "a".repeat(64),
    extracted_text: substantiveText,
    page_count: 3
  }]
};
assert.equal(verifiedEvidence(validResult, officialUrl).length, 1, "La evidencia oficial, sustantiva y hasheada debe aceptarse");
assert.equal(verifiedEvidence(validResult, documentDownloadUrl(99)).length, 0, "No debe aceptarse evidencia de otra ruta oficial");
assert.equal(verifiedEvidence({ evidence_documents: [{ ...validResult.evidence_documents[0], sha256: "" }] }, officialUrl).length, 0, "No debe aceptarse evidencia sin hash");
const applicationResult = { evidence_documents: [{ ...validResult.evidence_documents[0], extracted_text: applicationText }] };
assert.equal(verifiedEvidence(applicationResult, officialUrl).length, 0, "Un formulario no debe sustituir por si solo las bases");
assert.equal(verifiedEvidence(applicationResult, officialUrl, { applicationMaterial: true }).length, 1, "Un formulario oficial puede complementar el contrato documental");

const corunaItem = {
  title: "Convocatoria anticipada de subvenciones al fomento del empleo 2027",
  organism: "LOCAL / ARTEIXO / AYUNTAMIENTO DE ARTEIXO",
  announcements: [{ officialJournal: "B.O.P. DE A CORUÑA", textPreview: "Bases publicadas en el BOP A Coruña nº 87, de 9 de mayo de 2023." }]
};
const corunaHtml = `<div class="bloqueAnuncio"><h3>Arteixo</h3><p><a href="2023_0000003538.pdf">Aprobación das bases xerais do programa de axudas municipais ao fomento do emprego</a></p></div>`;
assert.equal(resolveCorunaReferenceFromHtml(corunaItem, corunaHtml), "https://bop.dacoruna.gal/bopportal/publicado/2023/05/09/2023_0000003538.pdf");
assert.equal(resolveCorunaReferenceFromHtml(corunaItem, `<div class="bloqueAnuncio"><a href="2023_0000009999.pdf">Otro anuncio sin coincidencia</a></div>`), "");

const deepScan = fs.readFileSync("scripts/platform/deep-scan-open-funders.mjs", "utf8");
const docxWorker = fs.readFileSync("scripts/workers/extract-public-docx.py", "utf8");
const radarFetch = fs.readFileSync("scripts/radar/fetch-bdns-latest.mjs", "utf8");
const catalogBuilder = fs.readFileSync("scripts/radar/prepare-bdns-bases-scan.mjs", "utf8");
assert(deepScan.includes("zipMagic") && deepScan.includes("extract-public-docx.py") && docxWorker.includes("word/document.xml"), "La captura no distingue ni extrae DOCX oficiales");
assert(radarFetch.includes('args.get("detail-ids")'), "La recaptura dirigida por codigos BDNS no esta disponible");
assert(!catalogBuilder.includes("basisDocument.sourceAuthority") && catalogBuilder.includes('source_authority: "official_registry"'), "El catalogo dirigido depende de un documento fuera de ambito");

console.log(JSON.stringify({ policy: "bdns_official_live_bases", assertions: 21, failures: [] }, null, 2));
