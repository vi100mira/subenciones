import assert from "node:assert/strict";

import { documentDownloadUrl, primaryCallDocument, resolveCorunaReferenceFromHtml } from "../radar/fetch-bdns-latest.mjs";
import { hasSubstantiveBases, verifiedEvidence } from "../radar/apply-bdns-bases-scan.mjs";

const basesDocument = { id: 41, description: "Documento de la convocatoria en español", filename: "BASES ACCION SOCIAL 2026.pdf" };
const selected = primaryCallDocument([
  { id: 40, description: "ANEXO SOLICITUD", filename: "Anexo I.pdf" },
  basesDocument
]);
assert.equal(selected?.id, 41, "Debe priorizar el documento completo de bases sobre anexos");
assert.equal(primaryCallDocument([{ id: 42, description: "Documento", filename: "Extracto convocatoria.pdf" }]), null, "Un extracto no equivale a bases");
assert.equal(documentDownloadUrl(41), "https://www.infosubvenciones.es/bdnstrans/api/convocatorias/documentos?idDocumento=41");

const substantiveText = "Bases y convocatoria. Personas beneficiarias y requisitos. Plazo de solicitud. Criterios y documentación. Presupuesto e importe.".repeat(20);
assert.equal(hasSubstantiveBases(substantiveText), true);
assert.equal(hasSubstantiveBases("Anuncio de una ayuda disponible.".repeat(50)), false);

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

const corunaItem = {
  title: "Convocatoria anticipada de subvenciones al fomento del empleo 2027",
  organism: "LOCAL / ARTEIXO / AYUNTAMIENTO DE ARTEIXO",
  announcements: [{ officialJournal: "B.O.P. DE A CORUÑA", textPreview: "Bases publicadas en el BOP A Coruña nº 87, de 9 de mayo de 2023." }]
};
const corunaHtml = `<div class="bloqueAnuncio"><h3>Arteixo</h3><p><a href="2023_0000003538.pdf">Aprobación das bases xerais do programa de axudas municipais ao fomento do emprego</a></p></div>`;
assert.equal(resolveCorunaReferenceFromHtml(corunaItem, corunaHtml), "https://bop.dacoruna.gal/bopportal/publicado/2023/05/09/2023_0000003538.pdf");
assert.equal(resolveCorunaReferenceFromHtml(corunaItem, `<div class="bloqueAnuncio"><a href="2023_0000009999.pdf">Otro anuncio sin coincidencia</a></div>`), "");

console.log(JSON.stringify({ policy: "bdns_official_live_bases", assertions: 11, failures: [] }, null, 2));
