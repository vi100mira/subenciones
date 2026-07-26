import fs from "node:fs";
import { chromium } from "playwright";

const appUrl = process.env.UI_CHECK_URL || "http://127.0.0.1:3000/?v=common-candidature#view-knowledge";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const session = {
  email: "gestor@example.invalid", role: "entity", tenantRole: "owner",
  tenantId: "00000000-0000-4000-8000-000000000001", tenantStatus: "active",
  label: "Entidad de prueba", accessToken: "common-candidature-ui", screen: "knowledge",
  plan: { code: "mission_full", label: "Misión integral",
    features: ["dashboard", "opportunities", "entity", "agents", "workspace", "audit"],
    agentKeys: ["grant_search", "match_agent", "document_review", "draft_agent", "alert_agent"] }
};
const sourceId = "20000000-0000-4000-8000-000000000001";
const reusableSourceId = "20000000-0000-4000-8000-000000000002";
const documentId = "30000000-0000-4000-8000-000000000001";
const promotedDocumentId = "30000000-0000-4000-8000-000000000002";
const candidatureA = "40000000-0000-4000-8000-000000000001";
const candidatureX = "40000000-0000-4000-8000-000000000002";
const runId = "50000000-0000-4000-8000-000000000001";
const documentRef = "adapted-document:1";
let linkedTo = "";
let adaptedTo = "";
let currentVersion = null;
let promoted = false;
let promotedApproved = false;

const baseDocument = {
  id: documentId, source_connection_id: sourceId, title: "Memoria de experiencia 2025.pdf",
  mime_type: "application/pdf", data_class: "internal", source_sha256: "a".repeat(64),
  source_size_bytes: 12400, blob_path: "tenants/test/common/memoria.pdf", extraction_status: "ready",
  metadata_json: { document_candidate: true, review_status: "approved", recommendation: "reference_only" },
  updated_at: "2026-07-27T08:00:00Z"
};
const adaptationContent = {
  title: "Adaptación documental · Candidatura A", humanReviewRequired: true, submissionAllowed: false,
  evidenceRefs: [`source-document:${documentId}`, `sha256:${"a".repeat(64)}`], uncertainties: [],
  documents: [{ documentRef, title: "Memoria de experiencia 2025.pdf · copia para candidatura",
    documentType: "candidature_adaptation", role: "supporting_draft", requirementRefs: [],
    evidenceRefs: [`source-document:${documentId}`], missingInputs: [], sections: [
      { title: "Contenido adaptado para esta candidatura", paragraphs: ["Texto original recuperado de la Base común."], evidenceRefs: [`source-document:${documentId}`] },
      { title: "Cambios y decisiones del expediente", paragraphs: ["Pendiente de completar por la entidad."], evidenceRefs: [`source-document:${documentId}`] }
    ] }], documentPlan: []
};

await context.addInitScript((value) => {
  sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
  sessionStorage.setItem("prototype-role", "entity");
}, session);

await context.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const headers = route.request().headers();
  if (url.pathname === "/api/auth-session" && method === "POST") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true, data: { ...session, expiresAt: Math.floor(Date.now() / 1000) + 3600 }
    }) });
  }
  if (headers.authorization && (headers.authorization !== "Bearer common-candidature-ui"
    || headers["x-tenant-id"] !== session.tenantId)) throw new Error("La UI pierde sesión o tenant");
  if (url.pathname === "/api/tenant-agent-governance") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      agents: [], executionControls: [], consents: [{ consent_type: "manual_upload", status: "granted" }],
      privateSources: [{ id: sourceId, label: "Carpeta autorizada", kind: "local_simulation", scope: "tenant_private",
        status: "active", config_json: { lastInventory: { documentsScanned: 1, runId: "inventory-1" } } }], privateIngestionRuns: []
    } }) });
  }
  if (url.pathname === "/api/private-document-candidates") {
    if (method === "PATCH") {
      const body = route.request().postDataJSON();
      if (body.sourceId !== reusableSourceId || body.reviews?.[0]?.id !== promotedDocumentId
        || body.reviews?.[0]?.status !== "approved") throw new Error("La aprobación del promovido pierde fuente o decisión");
      promotedApproved = true;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: { reviewed: 1 } }) });
    }
    const documents = [baseDocument];
    if (promoted) documents.push({ ...baseDocument, id: promotedDocumentId, source_connection_id: reusableSourceId,
      title: "Memoria adaptada consolidada.pdf", source_sha256: "b".repeat(64),
      metadata_json: { document_candidate: true, review_status: promotedApproved ? "approved" : "pending",
        recommendation: "reference_only_filled", ai_allowed: false } });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: documents }) });
  }
  if (url.pathname === "/api/tenant-candidature-documents") {
    if (method === "GET" && url.searchParams.get("action") === "candidatures") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: [
        { recommendationId: candidatureA, title: "Ayudas sociales AITEX 2026", funderName: "AITEX", canonicalKey: "candidate-a", candidacyStage: "active" },
        { recommendationId: candidatureX, title: "Itinerarios FSE 2026", funderName: "GVA", canonicalKey: "candidate-x", candidacyStage: "documents_pending" }
      ] }) });
    }
    if (method === "POST") {
      const body = route.request().postDataJSON();
      if (body.action === "suggest") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: { proposed: 0 } }) });
      }
      if (body.origin !== "human_added" || body.documents?.[0]?.documentId !== documentId) throw new Error("El vínculo directo no es humano o pierde documento");
      linkedTo = body.recommendationId;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, data: [{ id: "selection-direct", selection_status: "confirmed" }] }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      recommendation: { id: url.searchParams.get("recommendationId"), decision_status: "preselected", candidacy_stage: "active" },
      corpusIncluded: false, corpusDocumentCount: promoted ? 2 : 1, approvedDocumentCount: promotedApproved ? 2 : 1,
      pendingDocumentCount: promoted && !promotedApproved ? 1 : 0, blockedDocumentCount: 0,
      approvalCandidates: [], maxActiveDocuments: 20, selections: []
    } }) });
  }
  if (url.pathname === "/api/common-document-adaptation") {
    const body = route.request().postDataJSON();
    if (body.sourceDocumentId !== documentId) throw new Error("La adaptación pierde el original");
    adaptedTo = body.recommendationId;
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      run: { id: runId, status: "review_required", output_json: adaptationContent },
      documentRef, canonicalKey: "candidate-a", originalModified: false
    } }) });
  }
  if (url.pathname === "/api/draft-document-versions") {
    if (method === "POST") {
      const body = route.request().postDataJSON();
      const edited = structuredClone(adaptationContent);
      edited.documents[0].sections = body.edits[0].sections.map((section) => ({ ...section, evidenceRefs: [`source-document:${documentId}`] }));
      if (body.consolidateDocumentRef) edited.documents[0].consolidation = {
        status: "consolidated", reviewedBy: "user-1", reviewedAt: "2026-07-27T10:00:00Z", documentHash: "c".repeat(64)
      };
      currentVersion = { id: "version-adapted-1", version_number: 1, status: "approved", content_json: edited,
        content_hash: "d".repeat(64), change_note: body.changeNote, created_at: "2026-07-27T10:00:00Z" };
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
        version: currentVersion, review: { status: "approved" }, consolidatedDocumentRef: documentRef, allDocumentsConsolidated: true
      } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      runId, canonicalKey: "candidate-a", currentContent: currentVersion?.content_json || adaptationContent,
      currentVersionId: currentVersion?.id || null, versions: currentVersion ? [currentVersion] : []
    } }) });
  }
  if (url.pathname === "/api/common-knowledge-promotion") {
    const body = route.request().postDataJSON();
    if (body.runId !== runId || body.versionId !== currentVersion?.id || body.documentRef !== documentRef) {
      throw new Error("La promoción pierde ejecución, versión o documento consolidado");
    }
    promoted = true;
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      id: promotedDocumentId, title: "Memoria adaptada consolidada.pdf", reviewStatus: "pending", stored: true
    } }) });
  }
  if (url.pathname === "/api/private-annex-file") {
    return route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4 private common document") });
  }
  const data = url.pathname === "/api/tenant-profile-review" ? [] : [];
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
});

const page = await context.newPage();
try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.locator('[data-screen="knowledge"]').click();
  const common = page.locator("[data-common-knowledge-browser]");
  await common.getByText("Memoria de experiencia 2025.pdf", { exact: true }).waitFor({ state: "visible" });
  await common.locator('[data-knowledge-filter="text"]').fill("experiencia 2025");
  if ((await common.locator(".tenant-grid-row").count()) !== 1) throw new Error("La búsqueda no encuentra el documento X");

  await common.locator(`[data-annex-open="${documentId}"]`).click();
  let viewer = page.locator("[data-annex-viewer]");
  await viewer.getByText("Vincular original", { exact: true }).click();
  let chooser = page.locator("[data-common-candidature-modal]");
  await chooser.locator('select[name="recommendationId"]').selectOption(candidatureX);
  fs.mkdirSync(".tmp", { recursive: true });
  await page.screenshot({ path: ".tmp/common-knowledge-candidature-picker.png", fullPage: true });
  await chooser.getByText("Vincular a candidatura", { exact: true }).click();
  await page.getByText("Documento vinculado y confirmado en la candidatura elegida.", { exact: true }).waitFor({ state: "visible" });
  if (linkedTo !== candidatureX) throw new Error("El vínculo no respeta la candidatura X elegida");

  await common.locator(`[data-annex-open="${documentId}"]`).click();
  viewer = page.locator("[data-annex-viewer]");
  await viewer.getByText("Crear copia editable", { exact: true }).click();
  chooser = page.locator("[data-common-candidature-modal]");
  await chooser.locator('select[name="recommendationId"]').selectOption(candidatureA);
  await chooser.getByText("Crear copia y editar", { exact: true }).click();
  const editor = page.locator("[data-document-version-modal]");
  await editor.getByText("Borrador editable y versionado", { exact: true }).waitFor({ state: "visible" });
  await editor.getByText("Borrador inicial de la entidad · base", { exact: true }).waitFor({ state: "visible" });
  const field = editor.locator('[data-document-edit-section="Contenido adaptado para esta candidatura"]');
  await field.fill("Texto modificado específicamente para la candidatura A.");
  await page.screenshot({ path: ".tmp/common-document-adaptation-editor.png", fullPage: true });
  await editor.getByText("Guardar y consolidar documento", { exact: true }).click();
  await editor.waitFor({ state: "detached" });
  if (adaptedTo !== candidatureA || !currentVersion?.content_json.documents[0].consolidation) {
    throw new Error("La copia modificada no queda consolidada en la candidatura elegida");
  }

  const reopenedHtml = await page.evaluate(async ({ runId, documentRef }) => {
    await window.DocumentVersionEditor.openRun(runId, "candidate-a", documentRef);
    return document.querySelector("[data-document-version-modal]")?.innerHTML || "";
  }, { runId, documentRef });
  if (!reopenedHtml.includes("data-promote-document-version")) throw new Error(`El editor reabierto no renderiza la promoción: ${reopenedHtml}`);
  await editor.getByText("Documento consolidado", { exact: true }).waitFor({ state: "visible" });
  const promoteButton = editor.locator("[data-promote-document-version]");
  if ((await promoteButton.count()) !== 1) throw new Error(`El consolidado no ofrece promoción a Base común: ${await editor.innerText()}`);
  await promoteButton.click();
  await editor.getByText("Enviado a revisión", { exact: true }).waitFor({ state: "visible" });
  await editor.locator(".ghost-action[data-close-document-version]").click();
  await page.locator('[data-screen="knowledge"]').click();
  await common.locator('[data-knowledge-filter="text"]').fill("adaptada consolidada");
  await common.getByText("Memoria adaptada consolidada.pdf", { exact: true }).waitFor({ state: "visible" });
  await common.locator(`[data-annex-open="${promotedDocumentId}"]`).click();
  viewer = page.locator("[data-annex-viewer]");
  await viewer.getByText("Aprobar para Base común", { exact: true }).click();
  await common.locator(".tenant-grid-row .badge.safe").waitFor({ state: "visible" });
  if (!(await common.locator(".tenant-grid-row").innerText()).includes("No disponible para lectura IA")) {
    throw new Error("El documento promovido se habilita para IA antes del procesamiento privado");
  }
  if (!promotedApproved) throw new Error("El documento redactado no completa la revisión humana de Base común");
  await page.screenshot({ path: ".tmp/common-knowledge-candidature-flow.png", fullPage: true });
  console.log(JSON.stringify({ ok: true, search: true, existingApproval: true, directAssignment: candidatureX,
    editableCopy: candidatureA, originalModified: false, consolidated: true,
    promotedToCommonKnowledge: "approved_after_human_review", submissionAllowed: false }, null, 2));
} finally {
  await browser.close();
}
