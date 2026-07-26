import fs from "node:fs";
import { chromium } from "playwright";

const appUrl = process.env.UI_CHECK_URL || "http://127.0.0.1:3000/?v=candidature-documents#view-workspace";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const session = {
  email: "gestor@example.invalid",
  role: "entity",
  tenantRole: "owner",
  tenantId: "00000000-0000-4000-8000-000000000001",
  tenantStatus: "active",
  label: "Entidad de prueba",
  accessToken: "local-ui-check",
  screen: "workspace",
  plan: {
    code: "mission_full",
    label: "Mision integral",
    features: ["dashboard", "opportunities", "entity", "agents", "workspace", "audit"],
    agentKeys: ["grant_search", "match_agent", "document_review", "draft_agent", "alert_agent"]
  }
};
const recommendationId = "10000000-0000-4000-8000-000000000001";
let selectionStatus = "proposed";
let patchCalls = 0;
let proposedSecond = false;
let postCalls = 0;
let directPreviewCalls = 0;
const workingDownloads = [];

await context.addInitScript((value) => {
  sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
  sessionStorage.setItem("prototype-role", "entity");
}, session);

await context.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  if (url.pathname === "/api/auth-session" && method === "POST") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true, data: { ...session, expiresAt: Math.floor(Date.now() / 1000) + 3600 }
    }) });
  }
  if (url.pathname === "/api/candidature-project-folder") {
    const headers = route.request().headers();
    if (headers.authorization !== "Bearer local-ui-check" || headers["x-tenant-id"] !== session.tenantId) {
      throw new Error("La carpeta de proyecto pierde la sesión o el tenant");
    }
    if (method === "POST") {
      const body = route.request().postDataJSON();
      if (body.recommendationId !== recommendationId || body.acknowledgeWorkingCopy !== true
        || !["document", "check", "all"].includes(body.scope)) {
        throw new Error("La descarga no conserva candidatura, ámbito y revisión humana");
      }
      workingDownloads.push(body.scope);
      return route.fulfill({ status: 200, contentType: body.scope === "document"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/zip",
      headers: { "Content-Disposition": `attachment; filename="${body.scope}-trabajo.${body.scope === "document" ? "docx" : "zip"}"` },
      body: Buffer.from(body.scope === "document" ? "working-docx" : "PK-working-zip") });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      recommendationId, canonicalKey: "test-candidate", snapshotHash: "a".repeat(64), runId: "run-1", draftVersionId: null,
      versionLabel: "Versión generada 1", updatedAt: "2026-07-26T09:00:00Z",
      summary: { totalChecks: 2, completedChecks: 0, reviewChecks: 1, pendingChecks: 1, totalFiles: 2, availableFiles: 1 },
      checks: [{
        id: "check-memory", title: "Preparar memoria técnica", requirementRefs: ["requirement:1"], evidenceRefs: ["bases:p7"], missingInputs: [], status: "in_progress",
        files: [{ id: "draft-document:1", kind: "generated", title: "Memoria técnica.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", dataClass: "internal", originLabel: "Generado para esta candidatura", status: "in_progress", available: true, version: 1, updatedAt: "2026-07-26T09:00:00Z", sha256: "b".repeat(64) }]
      }, {
        id: "tenant-evidence", title: "Evidencia adicional de la entidad", requirementRefs: [], evidenceRefs: [], missingInputs: ["Memoria proyecto Inserta 2025.pdf: original no archivado"], status: "unavailable_local",
        files: [{ id: "selection-1", kind: "tenant", title: "Memoria proyecto Inserta 2025.pdf", mimeType: "application/pdf", dataClass: "internal", originLabel: "Confirmado desde Base común", status: "unavailable_local", available: false, version: null, updatedAt: "2026-07-26T09:00:00Z", sha256: "c".repeat(64), documentId: "document-1", sourceConnectionId: "source-1" }]
      }], policy: { workingCopyReviewRequired: true, submissionAllowed: false }
    } }) });
  }
  if (url.pathname === "/api/tenant-candidature-documents") {
    const headers = route.request().headers();
    if (headers.authorization !== "Bearer local-ui-check" || headers["x-tenant-id"] !== session.tenantId) {
      throw new Error("La UI pierde la sesion o el tenant al consultar la candidatura");
    }
    if (method === "PATCH") {
      const body = route.request().postDataJSON();
      if (body.recommendationId !== recommendationId || body.selectionStatus !== "confirmed") {
        throw new Error("La revision no conserva candidatura, seleccion y decision");
      }
      selectionStatus = "confirmed";
      patchCalls += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        ok: true, data: { id: "selection-1", selection_status: selectionStatus }
      }) });
    }
    if (method === "POST") {
      const body = route.request().postDataJSON();
      if (body.origin !== "assistant_recommended" || body.documents?.[0]?.documentId !== "document-2") {
        throw new Error("La propuesta desde Base comun pierde origen o documento");
      }
      proposedSecond = true;
      postCalls += 1;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        ok: true, data: [{ id: "selection-2", selection_status: "proposed" }]
      }) });
    }
    const selection = {
      id: "selection-1",
      source_document_id: "document-1",
      selection_origin: "assistant_recommended",
      selection_status: selectionStatus,
      reason_text: "Aporta evidencia de experiencia previa en insercion laboral.",
      evidence_json: ["requisito:experiencia"],
      document: {
        id: "document-1",
        source_connection_id: "source-1",
        title: "Memoria proyecto Inserta 2025.pdf",
        mime_type: "application/pdf",
        data_class: "internal",
        source_sha256: "1234567890abcdef",
        stored: false
      }
    };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true,
      data: {
        recommendation: { id: recommendationId, decision_status: "preselected", candidacy_stage: "documents_pending" },
        corpusIncluded: false,
        corpusDocumentCount: 346,
        approvedDocumentCount: 1,
        pendingDocumentCount: 344,
        blockedDocumentCount: 1,
        approvalCandidates: [{
          id: "document-pending",
          source_connection_id: "source-1",
          title: "Estatutos vigentes.pdf",
          mime_type: "application/pdf",
          data_class: "internal",
          source_sha256: "abcdefabcdefabcd",
          extraction_status: "pending",
          reason: "Puede acreditar información institucional relacionada con estatuto."
        }],
        maxActiveDocuments: 20,
        selections: [selection, ...(proposedSecond ? [{
          ...selection,
          id: "selection-2",
          source_document_id: "document-2",
          selection_status: "proposed",
          reason_text: "Fragmento relevante recuperado en Base comun.",
          document: { ...selection.document, id: "document-2", title: "Evaluacion de impacto 2025.pdf" }
        }] : [])]
      }
    }) });
  }
  const data = url.pathname === "/api/tenant-match-runs"
    ? { recommendations: [], latestRun: null, reviewSummary: null }
    : url.pathname === "/api/tenant-agent-governance"
      ? { agents: [], executionControls: [], consents: [], privateSources: [], privateIngestionRuns: [] }
      : [];
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
});
await context.route("http://127.0.0.1:8000/private-knowledge/query", async (route) => {
  const body = route.request().postDataJSON();
  if (route.request().headers().authorization !== "Bearer local-ui-check"
    || body.tenant_id !== session.tenantId || body.source_id !== "source-1") {
    throw new Error("La consulta local pierde sesion, tenant o fuente");
  }
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    ok: true,
    data: {
      mode: "local_fts_approved_v1",
      citations: [{
        chunkId: "chunk-2",
        documentId: "local-document-2",
        title: "Evaluacion de impacto 2025.pdf",
        ordinal: 1,
        sourceSha256: "abcdef1234567890",
        excerpt: "La evaluacion acredita resultados de insercion laboral."
      }]
    }
  }) });
});
await context.route("http://127.0.0.1:8000/private-documents/**", async (route) => {
  const url = new URL(route.request().url());
  const headers = route.request().headers();
  const allowed = new Set([
    `/private-documents/${session.tenantId}/source-1/document-1`,
    `/private-documents/${session.tenantId}/source-1/document-pending`
  ]);
  if (headers.authorization !== "Bearer local-ui-check"
    || !allowed.has(url.pathname)) {
    throw new Error("La vista directa pierde sesión, tenant, fuente o documento");
  }
  directPreviewCalls += 1;
  return route.fulfill({
    status: 200, contentType: "application/pdf",
    body: Buffer.from("%PDF-1.4 direct private preview")
  });
});

const page = await context.newPage();
page.on("dialog", (dialog) => dialog.accept());
try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  const candidateId = await page.evaluate((id) => {
    const item = window.RADAR?.opportunities?.[0] || window.MOCK?.opportunities?.[0];
    if (!item || !window.openWorkspaceAnalysis) return false;
    item.matchRecommendation = { id, decision_status: "preselected", candidacy_stage: "documents_pending" };
    window.TENANT_RECOMMENDATIONS_APPLIED = true;
    localStorage.setItem("workspace-candidates-v1", JSON.stringify({ activeId: item.id, selectedIds: [item.id] }));
    window.dispatchEvent(new CustomEvent("tenant-recommendations-applied"));
    return window.openWorkspaceAnalysis(item.id, "overview") ? item.id : false;
  }, recommendationId);
  if (!candidateId) throw new Error("No se pudo abrir el expediente documental");

  const actionNodes = page.locator(".candidature-map-node.action");
  if ((await actionNodes.count()) !== 2 || !(await page.locator("#documentary-agent-package").innerText()).includes("Checklist · Carpeta de proyecto")
    || (await page.locator("#documentary-agent-package").innerText()).includes("Borrador Word")) {
    throw new Error("El mapa no queda reducido a Documentos y Checklist · Carpeta de proyecto");
  }

  const summary = page.locator("[data-candidature-document-summary]");
  await summary.getByText("1 vinculados", { exact: false }).waitFor({ state: "visible" });
  if (await page.locator("[data-candidature-panel-modal]").count()) {
    throw new Error("El expediente directo abre un modal intermedio");
  }
  await summary.locator("[data-open-candidature-documents]").click();
  const modal = page.locator("[data-candidature-panel-modal]");
  await modal.waitFor({ state: "visible" });
  await modal.getByText("1 de 346 documentos vinculados").waitFor({ state: "visible" });
  const text = await modal.innerText();
  for (const expected of [
    "La candidatura no incorpora el corpus completo",
    "Memoria proyecto Inserta 2025.pdf",
    "Decision pendiente",
    "Origen · Propuesto por el asistente",
    "Documentos que conviene revisar primero",
    "Estatutos vigentes.pdf"
  ]) {
    const normalizedText = text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const normalizedExpected = expected.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (!normalizedText.includes(normalizedExpected)) {
      throw new Error(`Falta estado documental visible: ${expected}`);
    }
  }
  if ((await modal.locator(".candidature-document-row.selection").count()) !== 1) {
    throw new Error("La candidatura renderiza el corpus completo en vez del subconjunto");
  }
  await modal.locator('[data-annex-open="document-1"]').click();
  const linkedViewer = page.locator("[data-annex-viewer]");
  await linkedViewer.locator("iframe").waitFor({ state: "visible" });
  await linkedViewer.locator("footer [data-annex-viewer-close]").click();
  await modal.locator('[data-annex-open="document-pending"]').click();
  const viewer = page.locator("[data-annex-viewer]");
  await viewer.locator("iframe").waitFor({ state: "visible" });
  if (directPreviewCalls !== 2 || await viewer.locator("[data-annex-local-fallback]").isVisible()) {
    throw new Error("El visor obliga a seleccionar otra vez un original local disponible");
  }
  fs.mkdirSync(".tmp", { recursive: true });
  await page.screenshot({ path: ".tmp/private-direct-preview.png", fullPage: true });
  await viewer.locator("footer [data-annex-viewer-close]").click();
  await page.screenshot({ path: ".tmp/candidature-document-subset.png", fullPage: true });

  await modal.locator('[data-candidature-document-review="confirmed"]').click();
  await modal.getByText("Decisión confirmada", { exact: true }).waitFor({ state: "visible" });
  if (patchCalls !== 1 || (await modal.locator("[data-candidature-document-review]").count()) !== 0) {
    throw new Error("La confirmacion humana no queda persistida o sigue editable");
  }
  if (!(await modal.innerText()).includes("Origen · Propuesto por el asistente")
    || (await modal.locator('[data-annex-open="document-1"]').count()) !== 1) {
    throw new Error("La decision humana borra el origen o impide repasar el documento");
  }
  await modal.locator('[data-annex-open="document-1"]').click();
  await page.locator("[data-annex-viewer] iframe").waitFor({ state: "visible" });
  await page.locator("[data-annex-viewer] footer [data-annex-viewer-close]").click();
  if (directPreviewCalls !== 3) throw new Error("El documento confirmado ya no puede volver a abrirse");
  await modal.locator("[data-candidature-open-common]").click();
  await page.evaluate(() => window.CommonKnowledgeBrowser.render([{
    id: "document-2",
    title: "Evaluacion de impacto 2025.pdf",
    mime_type: "application/pdf",
    data_class: "internal",
    source_sha256: "abcdef1234567890",
    metadata_json: { review_status: "approved", recommendation: "reference_only" }
  }], { sourceId: "source-1" }));
  const common = page.locator("[data-common-knowledge-browser]");
  await common.locator("[data-knowledge-query-form] textarea").fill("Que evidencia tenemos de impacto?");
  await common.locator("[data-knowledge-query-form]").evaluate((form) => form.requestSubmit());
  const propose = common.locator("[data-knowledge-propose-document]");
  await propose.waitFor({ state: "visible" });
  await propose.click();
  await common.getByText("Propuesto para revisión", { exact: true }).waitFor({ state: "visible" });
  await page.evaluate((id) => window.openWorkspaceAnalysis(id, "documents"), candidateId);
  const reopened = page.locator("[data-candidature-panel-modal]");
  await reopened.waitFor({ state: "visible" });
  await reopened.getByText("2 de 346 documentos vinculados").waitFor({ state: "visible" });
  if (postCalls !== 1 || (await reopened.locator(".candidature-document-row.selection").count()) !== 2
    || !(await reopened.innerText()).includes("Evaluacion de impacto 2025.pdf")) {
    throw new Error("La cita recuperada no entra como propuesta revisable en la candidatura");
  }

  await reopened.locator(".icon-button[data-close-candidature-panel]").click();
  await page.evaluate((id) => window.openWorkspaceAnalysis(id, "project-folder"), candidateId);
  const folderModal = page.locator("[data-candidature-panel-modal]");
  await folderModal.locator("#candidature-panel-title").getByText("Checklist · Carpeta de proyecto", { exact: true }).waitFor({ state: "visible" });
  const folderText = await folderModal.innerText();
  for (const expected of ["Preparar memoria técnica", "Evidencia adicional de la entidad", "2 checks", "2 ficheros", "BORRADOR DE TRABAJO · NO PRESENTAR"]) {
    if (!folderText.includes(expected)) throw new Error(`Falta información operativa en la carpeta: ${expected}`);
  }
  const folderAfterRepeatedRefresh = await page.evaluate(() => {
    const detail = {
      canonicalKey: "test-candidate",
      run: { id: "run-1", output_json: { documents: [{ documentRef: "draft-document:1", title: "Memoria técnica.docx", sections: [{ title: "Objetivos", paragraphs: ["Contenido de trabajo trazable."] }] }] } }
    };
    window.dispatchEvent(new CustomEvent("draft-agent-run-updated", { detail }));
    window.dispatchEvent(new CustomEvent("draft-agent-run-updated", { detail }));
    return document.querySelector("[data-project-folder]")?.innerText || "";
  });
  if (folderAfterRepeatedRefresh.includes("Preparando la carpeta de proyecto")
    || !folderAfterRepeatedRefresh.includes("Preparar memoria técnica")) {
    throw new Error("La actualización periódica sustituye la carpeta visible por el estado de carga");
  }
  await folderModal.locator('[data-project-file-view="draft-document:1"]').click();
  await page.locator("[data-project-file-preview]").getByText("Contenido de trabajo trazable.").waitFor({ state: "visible" });
  await page.locator("[data-project-file-preview-close]").click();
  await Promise.all([page.waitForEvent("download"), folderModal.locator('[data-project-download="document"]').click()]);
  await Promise.all([page.waitForEvent("download"), folderModal.locator('[data-project-download="check"]').first().click()]);
  await Promise.all([page.waitForEvent("download"), folderModal.locator('[data-project-download="all"]').click()]);
  if (workingDownloads.join(",") !== "document,check,all") throw new Error("No funcionan las descargas individual, por check y total");
  await page.screenshot({ path: ".tmp/candidature-project-folder.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  if (await folderModal.evaluate((node) => node.scrollWidth > node.clientWidth)) {
    throw new Error("La carpeta de proyecto se desborda en móvil");
  }
  await page.screenshot({ path: ".tmp/candidature-project-folder-mobile.png", fullPage: true });
  console.log(JSON.stringify({
    ok: true,
    corpusDocuments: 346,
    candidatureDocuments: 2,
    proposedFromCommonKnowledge: true,
    directLocalPreview: true,
    humanReviewPersisted: true,
    tenantSessionPreserved: true,
    projectFolder: true,
    workingDownloads
  }, null, 2));
} finally {
  await browser.close();
}
