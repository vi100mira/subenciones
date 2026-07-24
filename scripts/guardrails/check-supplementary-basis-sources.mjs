import assert from "node:assert/strict";
import fs from "node:fs";
import { mergeApprovedBasisSources } from "../platform/apply-approved-basis-sources.mjs";
import { discoverOfficialBasisCandidates } from "../platform/discover-supplementary-basis-sources.mjs";
import { verifiedEvidence } from "../radar/apply-bdns-bases-scan.mjs";

const migration = fs.readFileSync("supabase/migrations/20260714190000_platform_supplementary_basis_sources.sql", "utf8");
const api = fs.readFileSync("api/admin-supplementary-basis-sources.ts", "utf8");
const ui = fs.readFileSync("prototype/supplementary-basis-sources.js", "utf8");
const html = fs.readFileSync("prototype/index.html", "utf8");
const discoveryMigration = fs.readFileSync("supabase/migrations/20260714200000_platform_basis_source_discovery.sql", "utf8");

assert(migration.includes("platform_supplementary_basis_sources"));
assert(migration.includes("enable row level security"), "El registro publico debe quedar cerrado por RLS");
assert(migration.includes("status in ('proposed', 'approved', 'rejected')"));
assert(migration.includes("reviewed_by uuid") && migration.includes("reviewed_at timestamptz"));
assert(api.includes('status: "proposed"'), "Una URL nueva nunca puede entrar aprobada");
assert(api.includes('.in("status", ["proposed", "approved", "rejected"])'));
assert(api.includes('status === "approved"') && api.includes("siguiente radar"));
assert(api.includes("https:") && api.includes("url.username") && api.includes("url.password"));
assert(discoveryMigration.includes("official_link_discovery") && discoveryMigration.includes("discovery_path jsonb"));

const dataset = { opportunities: [{ id: "bdns-1", basesStatus: "missing", basesSourceStrategy: "missing", basisDocuments: [] }] };
const rows = [
  { id: "approved", status: "approved", source_url: "https://boletin.example/bases.pdf", document_role: "regulatory", source_authority: "official_journal", reviewed_at: "2026-07-14", platform_opportunities: { canonical_key: "bdns-1" } },
  { id: "proposed", status: "proposed", source_url: "https://example.org/unreviewed.pdf", document_role: "call", source_authority: "issuing_body", platform_opportunities: { canonical_key: "bdns-1" } }
];
const merged = mergeApprovedBasisSources(dataset, rows);
assert.equal(merged.added, 1, "Solo debe entrar la URL aprobada");
assert.equal(dataset.opportunities[0].basisDocuments[0].supplementarySourceId, "approved");
assert.equal(dataset.opportunities[0].basesUrl, "https://boletin.example/bases.pdf");
const worker = fs.readFileSync("scripts/workers/run-municipal-radar.mjs", "utf8");
const queue = fs.readFileSync("scripts/platform/queue-bases-interpretations.mjs", "utf8");
assert(worker.indexOf("apply-approved-basis-sources.mjs") < worker.indexOf("prepare-bdns-bases-scan.mjs"));
assert(queue.includes("last_verification_error") && queue.includes('.eq("status", "approved")'));
assert(html.includes('id="platform-supplementary-bases"') && html.includes("supplementary-basis-sources.js"));
assert(ui.includes("Doble validación") && ui.includes("Aprobar una URL permite"));
assert(ui.includes('data-supplementary-source-action="approve"') && ui.includes('data-supplementary-source-action="reject"'));

const discoveryDataset = { opportunities: [{ id: "bdns-2026", title: "Ayudas de material escolar curso 2026/2027", supplementaryBasesUrls: ["https://ayuntamiento.example/ayudas"], basisDocuments: [], requirementsContract: { documentRecovery: { requiresAdditionalOfficialSource: true } } }] };
const fixtureHtml = `<a href="/docs/bases-reguladoras-2026-2027.pdf">Bases reguladoras 2026/2027</a><a href="/docs/bases-2025-2026.pdf">Bases antiguas 2025/2026</a><a href="https://files.example.net/bases-2026-2027.pdf">Copia no oficial</a>`;
const discovered = await discoverOfficialBasisCandidates(discoveryDataset, { fetchImpl: async () => ({ ok: true, headers: { get: () => "text/html" }, text: async () => fixtureHtml }) });
assert.equal(discovered.length, 1, "Solo debe proponer el documento oficial y vigente");
assert.equal(discovered[0].sourceUrl, "https://ayuntamiento.example/docs/bases-reguladoras-2026-2027.pdf");
assert.equal(discovered[0].status, "proposed", "El descubridor nunca aprueba una URL");
assert.equal(discovered[0].proposalOrigin, "official_link_discovery");
assert.deepEqual(discovered[0].discoveryPath, ["https://ayuntamiento.example/ayudas", "https://ayuntamiento.example/docs/bases-reguladoras-2026-2027.pdf"]);
const officialJournal = await discoverOfficialBasisCandidates(discoveryDataset, { fetchImpl: async () => ({ ok: true, headers: { get: () => "text/html" }, text: async () => '<a href="https://aplicacions.dipta.cat/bopt/web/anuncio/ver-pdf/346641">Bases reguladoras 2026/2027</a>' }) });
assert.equal(officialJournal[0]?.sourceAuthority, "official_journal", "Se admite el salto trazado a un boletin oficial conocido");
const announcedDataset = structuredClone(discoveryDataset); announcedDataset.opportunities[0].supplementaryBasesUrls = [];
announcedDataset.opportunities[0].announcements = [{ url: "https://aplicacions.dipta.cat/bopt/web/anuncio/ver-pdf/346641", title: "Bases reguladoras 2026/2027", officialJournal: "BOPT" }];
const announced = await discoverOfficialBasisCandidates(announcedDataset, { fetchImpl: async () => { throw new Error("Un PDF anunciado no requiere pagina intermedia"); } });
assert.equal(announced[0]?.sourceAuthority, "official_journal", "Los anuncios BDNS deben ser semillas prioritarias y conservar su autoridad");
const privateSeed = structuredClone(discoveryDataset); privateSeed.opportunities[0].supplementaryBasesUrls = ["https://127.0.0.1/bases"];
assert.deepEqual(await discoverOfficialBasisCandidates(privateSeed, { fetchImpl: async () => { throw new Error("No debe acceder a red privada"); } }), []);
const bridgeDataset = structuredClone(discoveryDataset); bridgeDataset.opportunities[0].title = "Ayudas de material escolar de Valverde curso 2026/2027";
bridgeDataset.opportunities[0].supplementaryBasesUrls = ["https://aytovalverde.sedelectronica.es/"];
const bridgePages = new Map([
  ["https://aytovalverde.sedelectronica.es/", '<a href="https://aytovalverde.org/">Web oficial del Ayuntamiento</a>'],
  ["https://aytovalverde.org/", '<a href="/servicios/subvenciones/">Ayudas y subvenciones</a>'],
  ["https://aytovalverde.org/servicios/subvenciones/", '<a href="/docs/bases-material-escolar-2025-2026.pdf">Curso anterior</a><a href="/docs/bases-material-escolar-2026-2027.pdf">Bases vigentes</a>']
]);
const bridgeFetches = [];
const bridged = await discoverOfficialBasisCandidates(bridgeDataset, { maxPages: 5, fetchImpl: async (url) => { bridgeFetches.push(url); return { ok: bridgePages.has(url), headers: { get: () => "text/html" }, text: async () => bridgePages.get(url) || "" }; } });
assert.equal(bridged.length, 1, "El puente oficial no debe recuperar la version anterior");
assert.equal(bridged[0].sourceUrl, "https://aytovalverde.org/docs/bases-material-escolar-2026-2027.pdf");
assert.equal(bridged[0].sourceAuthority, "issuing_body");
assert.deepEqual(bridged[0].discoveryPath, ["https://aytovalverde.sedelectronica.es/", "https://aytovalverde.org/", "https://aytovalverde.org/servicios/subvenciones/", "https://aytovalverde.org/docs/bases-material-escolar-2026-2027.pdf"]);
assert.equal(bridgeFetches.length, 3, "La navegacion debe quedar acotada a las paginas relevantes");
const dynamicSede = structuredClone(bridgeDataset);
dynamicSede.opportunities[0].organism = "LOCAL / VALVERDE / AYUNTAMIENTO DE VALVERDE";
const renderedPages = new Map([
  ["https://aytovalverde.sedelectronica.es/", '<a href="?x=procedure-token">Ayudas de material escolar curso 2026/2027</a>'],
  ["https://aytovalverde.sedelectronica.es/?x=procedure-token", '<h1>Ayudas de material escolar curso 2026/2027 - Ayuntamiento de Valverde</h1><p>Codigo SIA: 3196388</p><h2>Documentacion Opcional</h2><h2>Libro de familia</h2><p>Requisito de Validez</p><h2>Matricula escolar</h2><p>Requisito de Validez</p><h2>Certificado de prestaciones</h2><p>Requisito de Validez</p>']
]);
const dynamicCandidates = await discoverOfficialBasisCandidates(dynamicSede, {
  maxPages: 3,
  fetchImpl: async () => { throw new Error("redirect count exceeded"); },
  renderImpl: async (url) => ({ rendered_url: url, html: renderedPages.get(url) || "" })
});
assert.equal(dynamicCandidates[0]?.sourceUrl, "https://aytovalverde.sedelectronica.es/", "La fuente guardada debe ser la raiz publica estable");
assert.equal(dynamicCandidates[0]?.documentRole, "call");
assert.equal(dynamicCandidates[0]?.sourceAuthority, "issuing_body");
assert.equal(dynamicCandidates[0]?.status, "proposed", "Una ficha SIA tampoco se aprueba automaticamente");
assert(dynamicCandidates[0]?.discoveryPath.includes("https://aytovalverde.sedelectronica.es/?x=procedure-token"));
const dynamicEvidence = verifiedEvidence({ best_evidence: { url: "https://aytovalverde.sedelectronica.es/?x=ephemeral", curated_basis_origin: "https://aytovalverde.sedelectronica.es/",
  curated_basis: true, content_sha256: "c".repeat(64), extracted_text: "Codigo SIA: 3196388. Bases y convocatoria. Beneficiarios y requisitos. Plazo de presentacion. Documentacion opcional: Libro de familia y certificado de prestaciones. ".repeat(12),
  signals: ["bases_or_call", "eligibility", "official_procedure"] } }, "https://aytovalverde.sedelectronica.es/", { sourceAuthority: "issuing_body" });
assert.equal(dynamicEvidence.length, 1, "La evidencia dinamica debe verificarse contra su raiz curada estable");
const journalDataset = structuredClone(discoveryDataset);
journalDataset.opportunities[0].title = "Ayudas de emergencia social para libros y material escolar curso 2026/2027";
journalDataset.opportunities[0].organism = "LOCAL / VALVERDE / AYUNTAMIENTO DE VALVERDE";
journalDataset.opportunities[0].territory = "ES703 - El Hierro";
journalDataset.opportunities[0].supplementaryBasesUrls = [];
const journalIssue = await discoverOfficialBasisCandidates(journalDataset, { fetchImpl: async () => ({
  ok: true, headers: { get: () => "text/html" }, text: async () => '<p>AYUNTAMIENTO DE VALVERDE - Ayudas de emergencia social para libros y material escolar curso 2026/2027</p><a href="../boletines/2026/15-7-26/15-7-26.pdf">Descargar Boletin</a>'
}) });
assert.equal(journalIssue[0]?.sourceUrl, "https://www.bopsantacruzdetenerife.es/boletines/2026/15-7-26/15-7-26.pdf");
assert.equal(journalIssue[0]?.sourceAuthority, "official_journal");
const journalUrl = journalIssue[0].sourceUrl;
const journalEvidence = verifiedEvidence({ evidence_documents: [{ source_url: journalUrl, curated_basis_origin: journalUrl,
  extraction_status: "ready", sha256: "a".repeat(64), page_count: 441,
  extracted_text: "Otra convocatoria con documentacion completa.\n".repeat(100) + "BDNS 918347.",
  page_evidence: [
    { page: 100, text: "Otra convocatoria. Documentacion obligatoria: memoria y NIF. ".repeat(30) },
    { page: 330, text: "BDNS (Identif.): 918347. Ayudas de emergencia social para libros y material escolar curso 2026/2027.\nPrimero. Beneficiarios y requisitos. Las familias solicitantes.\nSegundo. Finalidad: adquisicion de libros y material escolar.\nCuarto. Importe maximo.\nQuinto. Forma, lugar y plazo de presentacion de solicitudes mediante sede electronica. ".repeat(8) }
  ]
}] }, journalUrl, { sourceAuthority: "official_journal", canonicalId: "bdns-918347", opportunityTitle: journalDataset.opportunities[0].title });
assert.equal(journalEvidence.length, 1, "El boletin solo vale si contiene el identificador y el titulo de la oportunidad");
assert.deepEqual(journalEvidence[0].sourceLocator.pages, [330]);
assert(!journalEvidence[0].excerpt.includes("Otra convocatoria"), "No debe mezclar requisitos de otros anuncios del mismo boletin");
assert.equal(journalEvidence[0].requirementsContract.documentRecovery.status, "official_notice_without_application_documents", "Un extracto sin documentos debe explicar por que sigue bloqueado el plan documental");
assert(worker.indexOf("discover-supplementary-basis-sources.mjs") > worker.indexOf("import-bdns-radar.mjs"), "El hallazgo alimenta una campana posterior");

console.log(JSON.stringify({ policy: "supplementary_basis_source_review", assertions: 43, failures: [] }, null, 2));
