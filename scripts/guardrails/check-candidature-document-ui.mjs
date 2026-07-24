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
        title: "Memoria proyecto Inserta 2025.pdf",
        mime_type: "application/pdf",
        data_class: "internal",
        source_sha256: "1234567890abcdef"
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
  if (headers.authorization !== "Bearer local-ui-check"
    || url.pathname !== `/private-documents/${session.tenantId}/source-1/document-pending`) {
    throw new Error("La vista directa pierde sesión, tenant, fuente o documento");
  }
  directPreviewCalls += 1;
  return route.fulfill({
    status: 200, contentType: "application/pdf",
    body: Buffer.from("%PDF-1.4 direct private preview")
  });
});

const page = await context.newPage();
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
    "Revision pendiente",
    "Propuesto por el asistente",
    "Documentos que conviene revisar primero",
    "Estatutos vigentes.pdf"
  ]) {
    if (!text.normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(expected)) {
      throw new Error(`Falta estado documental visible: ${expected}`);
    }
  }
  if ((await modal.locator(".candidature-document-row.selection").count()) !== 1) {
    throw new Error("La candidatura renderiza el corpus completo en vez del subconjunto");
  }
  await modal.locator('[data-annex-open="document-pending"]').click();
  const viewer = page.locator("[data-annex-viewer]");
  await viewer.locator("iframe").waitFor({ state: "visible" });
  if (directPreviewCalls !== 1 || await viewer.locator("[data-annex-local-fallback]").isVisible()) {
    throw new Error("El visor obliga a seleccionar otra vez un original local disponible");
  }
  fs.mkdirSync(".tmp", { recursive: true });
  await page.screenshot({ path: ".tmp/private-direct-preview.png", fullPage: true });
  await viewer.locator("footer [data-annex-viewer-close]").click();
  await page.screenshot({ path: ".tmp/candidature-document-subset.png", fullPage: true });

  await modal.locator('[data-candidature-document-review="confirmed"]').click();
  await modal.getByText("Confirmado", { exact: true }).waitFor({ state: "visible" });
  if (patchCalls !== 1 || (await modal.locator("[data-candidature-document-review]").count()) !== 0) {
    throw new Error("La confirmacion humana no queda persistida o sigue editable");
  }
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

  await page.setViewportSize({ width: 390, height: 844 });
  if (await reopened.evaluate((node) => node.scrollWidth > node.clientWidth)) {
    throw new Error("El subconjunto documental se desborda en movil");
  }
  await page.screenshot({ path: ".tmp/candidature-document-subset-mobile.png", fullPage: true });
  console.log(JSON.stringify({
    ok: true,
    corpusDocuments: 346,
    candidatureDocuments: 2,
    proposedFromCommonKnowledge: true,
    directLocalPreview: true,
    humanReviewPersisted: true,
    tenantSessionPreserved: true
  }, null, 2));
} finally {
  await browser.close();
}
