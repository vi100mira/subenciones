import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const policy = fs.readFileSync("src/tenantPlan.ts", "utf8");
const auth = fs.readFileSync("api/auth-session.ts", "utf8");
if (!policy.includes("commercial_plan") || !auth.includes("resolveTenantPlan(config?.motivations_json)")) {
  throw new Error("La sesión no resuelve el plan aislado de cada entidad");
}
for (const file of ["api/entity-research-runs.ts", "api/tenant-match-runs.ts", "api/draft-agent-runs.ts"]) {
  if (!fs.readFileSync(file, "utf8").includes("requireTenantAgentEntitlement")) {
    throw new Error(`${file} no aplica el plan contratado en servidor`);
  }
}

const appUrl = process.env.UI_CHECK_URL || "http://127.0.0.1:3000/?v=tenant-plan-ui#view-entity";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const session = {
  email: "gestor@example.invalid", role: "entity", tenantRole: "owner",
  tenantId: "00000000-0000-4000-8000-000000000001", tenantStatus: "active", label: "Novaterra",
  accessToken: "local-ui-check", screen: "entity",
  plan: {
    code: "mission_full", label: "Misión integral", billingMode: "sponsored",
    billingStatus: "Piloto patrocinado", currentMonthlyEur: 0, referenceMonthlyEur: 79,
    features: ["dashboard", "opportunities", "entity", "agents", "workspace", "audit"],
    agentKeys: ["grant_search", "entity_research", "match_agent", "document_review", "draft_agent", "alert_agent"]
  }
};
let aiGranted = false;
let ingestionRequests = 0;
let privateBridgeQueries = 0;
let privateSources = [];
let privateIngestionRuns = [];
let privateReviewFacts = [];
let privateDocumentCandidates = [];
const previewPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const previewPngHash = createHash("sha256").update(previewPng).digest("hex");
await context.addInitScript((value) => {
  sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
  sessionStorage.setItem("prototype-role", "entity");
}, session);
await context.route("**/api/**", async (route) => {
  const requestUrl = new URL(route.request().url());
  const path = requestUrl.pathname;
  if (path === "/api/auth-session" && route.request().method() === "POST") {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      ...session, accessToken: "renewed-ui-check", expiresAt: Math.floor(Date.now() / 1000) + 3600
    } }) });
    return;
  }
  if (path === "/api/private-annex-file" && requestUrl.searchParams.get("mode") === "preview") {
    await route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\n%%EOF") });
    return;
  }
  if (path === "/api/ingestion-dispatch") ingestionRequests += 1;
  if (path === "/api/tenant-agent-governance" && route.request().method() === "PATCH") {
    const body = route.request().postDataJSON();
    if (body.action === "grant_consent" && body.consentType === "ai_processing") aiGranted = true;
  }
  if (path === "/api/private-document-candidates" && route.request().method() === "PATCH") {
    const body = route.request().postDataJSON();
    for (const review of body.reviews || []) {
      const candidate = privateDocumentCandidates.find((item) => item.id === review.id);
      if (candidate) candidate.metadata_json.review_status = review.status;
    }
  }
  const readyAgents = new Set(["grant_search", "match_agent", "document_review"]);
  if (aiGranted && privateSources.length) readyAgents.add("draft_agent");
  const agents = session.plan.agentKeys.map((agent_key) => ({
    agent_key, enabled: readyAgents.has(agent_key), status: readyAgents.has(agent_key) ? "ready" : "blocked",
    status_reason: readyAgents.has(agent_key) ? "Capacidad verificada" : "Requiere autorización o conexión"
  }));
  const executionControls = session.plan.agentKeys.map((agentKey) => ({
    agentKey,
    modeLabel: agentKey === "grant_search" ? "Programado por la plataforma" : "Manual por la entidad",
    nextLabel: agentKey === "grant_search" ? "Diariamente a las 05:15 UTC" : "Cuando una persona solicite la ejecución",
    lastRun: agentKey === "entity_research" ? { status: "review_required", finished_at: "2026-07-18T09:15:00.000Z", actorLabel: "gestor@example.invalid" } : null
  }));
  const data = path === "/api/tenant-agent-governance"
    ? { agents, executionControls, consents: [...(aiGranted ? [{ consent_type: "ai_processing", status: "granted" }] : []), ...(privateSources.length ? [{ consent_type: "manual_upload", status: "granted" }] : [])], webSource: null, privateSources, privateIngestionRuns, tenantDocumentSummary: { documentCount: 346, sourceCount: 1, activeSourceCount: 1 }, profileReviewState: "approved" }
    : path === "/api/tenant-profile-review" ? privateReviewFacts
      : path === "/api/private-document-candidates" ? privateDocumentCandidates
      : path === "/api/entity-research-runs" ? []
      : path === "/api/tenant-match-runs" ? { run: null, recommendations: [] } : [];
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
});
await context.route("http://127.0.0.1:8000/private-knowledge/query", async (route) => {
  privateBridgeQueries += 1;
  const request = route.request();
  const body = request.postDataJSON();
  if (request.headers().authorization !== "Bearer local-ui-check"
    || body.tenant_id !== session.tenantId || body.source_id !== "completed-project-source") {
    throw new Error("El chat privado no conserva sesión, tenant o fuente");
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
    mode: "local_fts_approved_v1", selectedChunkCount: 1, externalAiCalls: 0,
    citations: [{ title: "Estatutos vigentes.pdf", ordinal: 2, sourceSha256: "1234567890abcdef",
      excerpt: "La entidad acredita experiencia mediante itinerarios individualizados de inserción laboral." }]
  } }) });
});

const page = await context.newPage();
try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.locator('.nav-item[data-screen="dashboard"]').click();
  await page.waitForFunction(() => [...document.querySelectorAll("#source-map .source-node")]
    .some((node) => node.textContent?.includes("Documentos de la entidad") && node.textContent?.includes("346 inventariados")));
  const tenantDocumentsNode = page.locator("#source-map .source-node").filter({ hasText: "Documentos de la entidad" });
  if (!(await tenantDocumentsNode.innerText()).includes("346")) throw new Error("El panel conserva el contador documental simulado del tenant");
  await page.locator('.nav-item[data-screen="entity"]').click();
  const plan = page.locator("#entity-plan");
  if (!(await plan.isVisible())) throw new Error("El plan no aparece dentro de Entidad");
  if ((await page.locator('.nav-item[data-screen="plan"]').count()) !== 0) throw new Error("Plan conserva una entrada separada para la entidad");
  if ((await plan.locator(".pricing-card").count()) !== 3) throw new Error("La comparativa no contiene tres planes");
  if ((await plan.locator(".contracted-area").count()) !== 6) throw new Error("No aparecen las seis áreas contratadas");
  const text = await plan.innerText();
  for (const expected of ["Misión integral", "0 €", "Referencia: 79 € / mes", "Sin cobros activados", "Piloto patrocinado"]) {
    if (!text.includes(expected)) throw new Error(`Falta información comercial: ${expected}`);
  }
  if ((await plan.locator(".pricing-card.is-current").count()) !== 1) throw new Error("El plan actual no está destacado de forma única");
  if ((await page.locator("#private-knowledge-panel").count()) !== 0) throw new Error("Entidad conserva un panel operativo privado demasiado exhaustivo");
  const commonKnowledgeNav = page.locator('.nav-item[data-screen="knowledge"]');
  if (!(await commonKnowledgeNav.isVisible())) throw new Error("La base común no aparece para una entidad con preparación documental");
  await commonKnowledgeNav.click();
  const commonKnowledge = page.locator("#common-knowledge-library");
  const commonKnowledgeText = await commonKnowledge.innerText();
  for (const expected of ["Biblioteca común para todas las candidaturas", "Pregunta a la Base común", "Todos los documentos inventariados"]) {
    if (!commonKnowledgeText.includes(expected)) throw new Error(`Superficie principal de Base común incompleta: ${expected}`);
  }
  const overviewInfo = commonKnowledge.locator("[data-knowledge-overview]");
  if ((await overviewInfo.count()) !== 1 || await overviewInfo.locator(".knowledge-info-card").isVisible()) throw new Error("La información general no comienza recogida");
  await overviewInfo.locator("summary").click();
  const overviewText = await overviewInfo.innerText();
  for (const expected of ["Documentación fuente", "Datos reutilizables", "Añadir o actualizar documentación"]) {
    if (!overviewText.includes(expected)) throw new Error(`Punto de información general incompleto: ${expected}`);
  }
  await overviewInfo.locator("summary").click();
  if (await commonKnowledge.locator(".private-knowledge-steps").isVisible()) throw new Error("El circuito documental ocupa espacio fuera del punto de información");
  await page.screenshot({ path: ".tmp/common-knowledge-library.png", fullPage: true });
  await page.locator('.nav-item[data-screen="entity"]').click();
  if ((await plan.locator("[data-plan-area-info]").count()) !== 6) throw new Error("Las áreas incluidas no ofrecen puntos de información");
  await plan.locator('[data-plan-area-info="draft_agent"]').click();
  const areaModal = page.locator("[data-plan-area-modal]");
  const areaText = await areaModal.innerText();
  for (const expected of ["Preparación documental", "Curador de conocimiento", "Redactor documental", "Conocimiento progresivo del tenant", "Gestionar desde Base común"]) {
    if (!areaText.includes(expected)) throw new Error(`Información de Preparación documental incompleta: ${expected}`);
  }
  if (areaText.includes("Aprobar esta fuente")) throw new Error("Entidad duplica la aprobación de fuentes privadas");
  fs.mkdirSync(".tmp", { recursive: true });
  await page.screenshot({ path: ".tmp/document-preparation-info-modal.png" });
  await areaModal.locator("[data-plan-open-preparation]").click();
  const preparationModal = page.locator("[data-private-modal]");
  if (!(await preparationModal.isVisible()) || (await preparationModal.locator('input[name="preparation-route"]').count()) !== 2) {
    throw new Error("Preparación documental no ofrece dos métodos excluyentes");
  }
  const routeNames = await preparationModal.locator('input[name="preparation-route"]').evaluateAll((inputs) => inputs.map((input) => input.name));
  if (new Set(routeNames).size !== 1) throw new Error("Los métodos de preparación no son excluyentes");
  await page.screenshot({ path: ".tmp/document-preparation-methods.png" });
  await preparationModal.locator('input[value="guided"]').check();
  await preparationModal.locator('button[type="submit"]').click();
  const guidedModal = page.locator("[data-private-modal]");
  if (!(await guidedModal.isVisible()) || (await guidedModal.locator("textarea[name]").count()) !== 11
    || (await guidedModal.locator('input[name="privacy-confirm"]').count()) !== 1) {
    throw new Error("El formulario guiado no ofrece once hechos y confirmación de privacidad");
  }
  const guidedText = await guidedModal.innerText();
  for (const expected of ["Razón social", "Equipo agregado", "Crear propuestas para revisión", "no contienen datos personales"]) {
    if (!guidedText.includes(expected)) throw new Error(`Formulario guiado incompleto: ${expected}`);
  }
  await page.screenshot({ path: ".tmp/private-guided-form-ui.png" });
  await guidedModal.locator("button.icon-button[data-private-close]").click();
  await page.screenshot({ path: ".tmp/private-knowledge-ui.png", fullPage: true });
  await page.locator("#help-assistant-launcher").click();
  await page.locator("#help-assistant-input").fill("¿El agente aprende de los proyectos del tenant?");
  await page.locator(".help-assistant-form .primary-action").click();
  const helpText = await page.locator("#help-assistant-log").innerText();
  for (const expected of ["Conocimiento progresivo de la entidad", "curador propone conocimiento reutilizable", "No entrena un modelo compartido", "no cruza datos entre tenants"]) {
    if (!helpText.includes(expected)) throw new Error(`La Guía no explica la mejora documental: ${expected}`);
  }
  await page.locator("[data-help-close]").click();
  const ribbonBox = await plan.locator(".pricing-ribbon").boundingBox();
  const guideBox = await page.locator("#help-assistant-launcher").boundingBox();
  const overlap = ribbonBox && guideBox && ribbonBox.x < guideBox.x + guideBox.width && ribbonBox.x + ribbonBox.width > guideBox.x
    && ribbonBox.y < guideBox.y + guideBox.height && ribbonBox.y + ribbonBox.height > guideBox.y;
  if (overlap) throw new Error("La guía flotante tapa la identificación del plan actual");
  await page.locator('.nav-item[data-screen="agents"]').click();
  if ((await page.locator("#agent-grid .agent-execution-control").count()) !== 6) throw new Error("Las seis capacidades no comparten el control de ejecución");
  const executionText = await page.locator("#agent-grid").innerText();
  for (const expected of ["MODO", "ÚLTIMA", "PRÓXIMA", "gestor@example.invalid", "Diariamente a las 05:15 UTC"]) {
    if (!executionText.includes(expected)) throw new Error(`Control de ejecución incompleto: ${expected}`);
  }
  await page.screenshot({ path: ".tmp/agent-execution-controls.png", fullPage: true });
  const documentManager = page.locator("#agent-grid .agent-card").filter({ hasText: "Preparación documental" });
  if ((await documentManager.count()) !== 1) throw new Error("No aparece un único agente de Preparación documental");
  const documentManagerText = await documentManager.innerText();
  for (const expected of ["Operativo", "Curador inactivo sin fuente privada", "Abrir preparación documental", "Autorizar datos internos (opcional)"]) {
    if (!documentManagerText.includes(expected)) throw new Error(`Preparación documental sin capacidades claras: ${expected}`);
  }
  privateSources = [{ id: "completed-project-source", label: "Proyectos presentados", kind: "local_simulation", scope: "tenant_private", status: "active", config_json: { preflight: { version: "v1", status: "ready" }, lastInventory: { runId: "completed-private-run", documentsScanned: 350, proposalCount: 11, externalAiCalls: 0, quarantineIndex: { chunks: 148, status: "prepared_pending_review", embeddingState: "not_started" } } } }];
  privateIngestionRuns = [{ id: "completed-private-run", source_connection_id: "completed-project-source", status: "completed", scanned: 350, inserted: 11, finished_at: "2026-07-18T10:30:00.000Z", created_at: "2026-07-18T10:00:00.000Z" }];
  privateReviewFacts = Array.from({ length: 11 }, (_, index) => ({ id: `fact-${index}`, field_key: "mission", suggested_value: `Propuesta institucional ${index + 1}`, source_type: "uploaded_document", evidence_excerpt: `Documento local ${index + 1}`, metadata_json: { data_class: "internal" }, confidence: "medium", status: "pending" }));
  privateDocumentCandidates = [
    { id: "document-candidate-1", title: "Estatutos vigentes.pdf", mime_type: "application/pdf", data_class: "internal", source_sha256: "1234567890abcdef", blob_path: null, extraction_status: "pending", metadata_json: { document_candidate: true, recommendation: "reference_only", review_status: "pending" } },
    { id: "document-candidate-2", title: "DNI representante.jpg", mime_type: "image/jpeg", data_class: "personal", source_sha256: previewPngHash, blob_path: null, extraction_status: "blocked", metadata_json: { document_candidate: true, recommendation: "manual_only", review_status: "pending" } }
  ];
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/private-document-candidates")),
    page.evaluate(() => window.dispatchEvent(new Event("role-session-applied")))
  ]);
  await commonKnowledgeNav.click();
  const knowledgeBrowser = page.locator("[data-common-knowledge-browser]");
  const knowledgeBrowserText = await knowledgeBrowser.innerText();
  for (const expected of ["Pregunta a la Base común", "Todos los documentos inventariados", "2 de 2 documentos"]) {
    if (!knowledgeBrowserText.includes(expected)) throw new Error(`Explorador de Base común incompleto: ${expected}`);
  }
  const queryInfo = knowledgeBrowser.locator("[data-knowledge-query-info]");
  if (await queryInfo.locator(".knowledge-info-card").isVisible()) throw new Error("La explicación de consulta comienza desplegada");
  if (await knowledgeBrowser.locator("[data-knowledge-answer]").isVisible()) throw new Error("La respuesta vacía ocupa espacio antes de preguntar");
  await queryInfo.locator("summary").click();
  if (!(await queryInfo.innerText()).includes("subconjunto recomendado por relevancia")) throw new Error("El punto de información no explica el uso en candidaturas");
  await queryInfo.locator("summary").click();
  await page.screenshot({ path: ".tmp/common-knowledge-library-focused.png", fullPage: true });
  const documentCandidate = page.locator(".master-fact-card").filter({ hasText: "Estatutos vigentes.pdf" });
  if ((await documentCandidate.count()) !== 1 || !(await documentCandidate.innerText()).includes("Documento de referencia")) throw new Error("La Base común no muestra la propuesta documental explicada");
  const restrictedCandidate = page.locator(".master-fact-card").filter({ hasText: "DNI representante.jpg" });
  await knowledgeBrowser.locator('[data-knowledge-filter="text"]').fill("DNI");
  if ((await knowledgeBrowser.locator(".master-fact-card").count()) !== 1) throw new Error("El grid documental no filtra por nombre");
  await knowledgeBrowser.locator('[data-knowledge-filter="text"]').fill("");
  await knowledgeBrowser.locator('[data-knowledge-query-form] textarea').fill("¿Qué documentos acreditan experiencia?");
  await knowledgeBrowser.locator('[data-knowledge-query-form]').evaluate((form) => form.requestSubmit());
  if (!(await knowledgeBrowser.locator("[data-knowledge-answer]").innerText()).includes("necesita documentos aprobados")) throw new Error("La consulta IA lee documentos sin aprobación");
  await page.screenshot({ path: ".tmp/common-knowledge-library-grid.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error("La Base común provoca desbordamiento móvil");
  await page.screenshot({ path: ".tmp/common-knowledge-library-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await restrictedCandidate.locator("[data-annex-open]").click();
  const localViewer = page.locator("[data-annex-viewer]");
  await localViewer.waitFor({ state: "visible" });
  const localViewerText = await localViewer.innerText();
  if (!localViewerText.includes("DOCUMENTO DE LA ENTIDAD")
    || !localViewerText.includes("Clase de datos")) throw new Error(`El documento no se abre en el visor integrado: ${localViewerText.slice(0, 200)}`);
  page.once("dialog", (dialog) => dialog.accept());
  await localViewer.locator("[data-annex-local-preview]").setInputFiles({ name: "DNI representante.png", mimeType: "image/png", buffer: previewPng });
  if (!(await localViewer.isVisible()) || !(await localViewer.innerText()).includes("Acceso restringido y auditado")
    || (await localViewer.locator("img").count()) !== 1) throw new Error("El visor local restringido no permite comprobar la imagen antes de aprobar");
  await page.screenshot({ path: ".tmp/common-annex-local-viewer.png" });
  await localViewer.locator(".annex-viewer-heading [data-annex-viewer-close]").last().click();
  await documentCandidate.locator("[data-annex-open]").click();
  await page.locator('[data-annex-viewer] [data-review-status="approved"]').click();
  await documentCandidate.getByText("Aprobado", { exact: true }).waitFor({ state: "visible" });
  await knowledgeBrowser.locator('[data-knowledge-query-form] textarea').fill("¿Qué experiencia existe en inserción laboral?");
  await knowledgeBrowser.locator('[data-knowledge-query-form]').evaluate((form) => form.requestSubmit());
  await knowledgeBrowser.getByText("1 fragmento relevante recuperado").waitFor({ state: "visible" });
  const bridgeAnswer = await knowledgeBrowser.locator("[data-knowledge-answer]").innerText();
  if (privateBridgeQueries !== 1 || !bridgeAnswer.includes("itinerarios individualizados") || !bridgeAnswer.includes("Estatutos vigentes.pdf")) {
    throw new Error("El chat no muestra la recuperación local con su cita documental");
  }
  await page.screenshot({ path: ".tmp/common-knowledge-local-query.png", fullPage: true });
  await documentCandidate.locator("[data-annex-open]").click();
  const approvedViewer = page.locator("[data-annex-viewer]");
  if (!(await approvedViewer.innerText()).includes("Guardar original privado")) throw new Error("Un documento aprobado no ofrece almacenamiento Blob");
  await approvedViewer.locator(".annex-viewer-heading [data-annex-viewer-close]").last().click();
  privateDocumentCandidates[0].blob_path = "tenants/demo/annex-vault/document-candidate-1/original.pdf";
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/private-document-candidates")),
    page.evaluate(() => window.dispatchEvent(new Event("role-session-applied")))
  ]);
  await documentCandidate.locator("[data-annex-open]").click();
  const storedViewer = page.locator("[data-annex-viewer]");
  await storedViewer.waitFor({ state: "visible" });
  const storedViewerVisible = await storedViewer.isVisible();
  const storedViewerText = storedViewerVisible ? await storedViewer.innerText() : "";
  const storedViewerFrames = await storedViewer.locator("iframe").count();
  if (!storedViewerVisible || !storedViewerText.includes("Blob privado") || storedViewerFrames !== 1) {
    throw new Error(`El visor autenticado no abre el PDF guardado: visible=${storedViewerVisible}, frames=${storedViewerFrames}, text=${storedViewerText.slice(0, 160)}`);
  }
  await page.screenshot({ path: ".tmp/common-annex-private-viewer.png" });
  await storedViewer.locator(".annex-viewer-heading [data-annex-viewer-close]").last().click();
  await restrictedCandidate.locator("[data-annex-open]").click();
  await page.locator('[data-annex-viewer] [data-review-status="restricted"]').click();
  await restrictedCandidate.getByText("Aprobado · restringido", { exact: true }).waitFor({ state: "visible" });
  await restrictedCandidate.locator("[data-annex-open]").click();
  const restrictedApprovedViewer = page.locator("[data-annex-viewer]");
  if (!(await restrictedApprovedViewer.innerText()).includes("Guardar original privado")) throw new Error("El DNI restringido no ofrece almacenamiento privado");
  await restrictedApprovedViewer.locator(".annex-viewer-heading [data-annex-viewer-close]").last().click();
  await page.screenshot({ path: ".tmp/common-document-approval.png", fullPage: true });
  await page.locator('.nav-item[data-screen="agents"]').click();
  await documentManager.locator('[data-tenant-agent-action="grant-ai"]').click();
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-tenant-agent-action="grant-ai"]')].some((button) => button.offsetParent));
  const completedManagerText = await documentManager.innerText();
  for (const expected of ["Último análisis documental", "350 documentos revisados", "11 propuestas", "0 llamadas IA (coste IA 0 €)", "Revisar o actualizar análisis"]) {
    if (!completedManagerText.includes(expected)) throw new Error(`El historial documental no refleja la última ejecución: ${expected}`);
  }
  if ((await documentManager.locator('[data-tenant-agent-action="open-documents"]').count()) !== 1) {
    throw new Error("Autorizar datos internos elimina también el acceso a Preparación documental");
  }
  await documentManager.locator('[data-tenant-agent-action="open-documents"]').click();
  const completedPreparation = page.locator("[data-private-preparation-form]");
  const completedPreparationText = await completedPreparation.innerText();
  if (!completedPreparationText.includes("Gestionar conocimiento") || !completedPreparationText.includes("350 documentos revisados")
    || (await completedPreparation.locator("[data-private-update-analysis]").count()) !== 1) {
    throw new Error("Gestionar conocimiento y actualizar no aparecen como acciones distintas tras completar el análisis");
  }
  await completedPreparation.locator('button[type="submit"]').click();
  const knowledgeStatus = page.locator("[data-private-modal]");
  const knowledgeStatusText = await knowledgeStatus.innerText();
  for (const expected of ["Estado y uso del conocimiento", "350 documentos analizados", "11 propuestas esperan tu decisión", "148 fragmentos", "No activo", "Revisar 11 propuestas"]) {
    if (!knowledgeStatusText.includes(expected)) throw new Error(`El estado del conocimiento no explica: ${expected}`);
  }
  await page.screenshot({ path: ".tmp/private-knowledge-status.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await knowledgeStatus.evaluate((modal) => { modal.scrollTop = 0; });
  const knowledgeMobileOverflow = await knowledgeStatus.evaluate((modal) => modal.scrollWidth > modal.clientWidth);
  if (knowledgeMobileOverflow) throw new Error("El estado del conocimiento se desborda en móvil");
  await page.screenshot({ path: ".tmp/private-knowledge-status-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await knowledgeStatus.locator("[data-private-review]").click();
  const reviewModal = page.locator("[data-master-fact-modal]");
  if (!(await reviewModal.isVisible()) || !(await reviewModal.innerText()).includes("Plantilla maestra propuesta") || (await reviewModal.locator(".master-fact-card").count()) !== 11) {
    throw new Error("Gestionar conocimiento no conecta con las propuestas reales");
  }
  await reviewModal.locator("[data-master-close]").first().click();
  await page.evaluate(() => window.PrivateKnowledge.openPreparation());
  await page.locator("[data-private-close]").first().click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("tenant-agent-governance-loaded", { detail: {
    agents: [], consents: [{ consent_type: "ai_processing", status: "granted" }],
    webSource: null, profileReviewState: "approved",
    privateSources: [{ id: "legacy-guided-source", label: "Entrevista guiada demo", kind: "manual_upload", scope: "tenant_internal", status: "pending_approval" }]
  } })));
  await page.screenshot({ path: ".tmp/progressive-document-agent-ui.png", fullPage: true });
  await documentManager.locator('[data-tenant-agent-action="open-documents"]').click();
  if (!(await page.locator("[data-private-preparation-form]").isVisible())) throw new Error("Preparación documental no abre la elección de método");
  const projectRouteText = await page.locator('[data-private-preparation-form] label').filter({ hasText: "Analizar proyectos autorizados" }).innerText();
  if (!projectRouteText.includes("Primero registrarás") || projectRouteText.includes("La fuente está registrada")) {
    throw new Error("Una entrevista interna se confunde con un repositorio de proyectos");
  }
  if (await page.locator("#workspace").isVisible()) throw new Error("Preparación documental salta erróneamente a Candidatura");
  await page.locator("[data-private-close]").first().click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("tenant-agent-governance-loaded", { detail: {
    agents: [], consents: [{ consent_type: "ai_processing", status: "granted" }],
    webSource: null, profileReviewState: "approved",
    privateSources: [{ id: "private-project-source", label: "Proyectos presentados", kind: "local_simulation", scope: "tenant_private", status: "pending_approval" }]
  } })));
  await page.evaluate(() => window.PrivateKnowledge.openPreparation());
  const expiredConsentText = await page.locator('[data-private-preparation-form] label').filter({ hasText: "Analizar proyectos autorizados" }).innerText();
  if (!expiredConsentText.includes("debes renovar su permiso")) throw new Error("Una fuente privada sin consentimiento no avisa de la renovación necesaria");
  await page.locator('[data-private-preparation-form] button[type="submit"]').click();
  const renewalModal = page.locator("[data-private-consent-renewal]");
  if (!(await renewalModal.isVisible()) || !(await renewalModal.innerText()).includes("Renovar permiso y continuar")) {
    throw new Error("La fuente privada sin consentimiento no abre la renovación explícita");
  }
  await page.locator("[data-private-close]").first().click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("tenant-agent-governance-loaded", { detail: {
    agents: [], consents: [{ consent_type: "manual_upload", status: "granted" }],
    webSource: null, profileReviewState: "approved",
    privateSources: [{ id: "local-project-source", label: "Proyectos presentados", kind: "local_simulation", scope: "tenant_private", status: "active" }]
  } })));
  await page.evaluate(() => window.PrivateKnowledge.openPreparation());
  await page.locator('[data-private-preparation-form] button[type="submit"]').click();
  const localFolderForm = page.locator("[data-local-folder-form]");
  const folderInput = localFolderForm.locator('input[name="local-folder"]');
  const styledFolderButton = localFolderForm.locator("[data-local-folder-browse]");
  const syncedFolderButton = localFolderForm.locator("[data-local-folder-fallback]");
  if (!(await localFolderForm.isVisible()) || !(await styledFolderButton.isVisible()) || !(await syncedFolderButton.isVisible()) || (await folderInput.count()) !== 1 || await folderInput.getAttribute("webkitdirectory") === null) {
    throw new Error("La fuente local no solicita una carpeta real antes del inventario");
  }
  if (ingestionRequests !== 0) throw new Error("La fuente local se encola antes de seleccionar carpeta");
  const insubstantialFolder = path.resolve(".tmp", `insubstantial-source-${Date.now()}`);
  fs.mkdirSync(insubstantialFolder, { recursive: true });
  fs.writeFileSync(path.join(insubstantialFolder, "nota.txt"), "Carpeta elegida por error.", "utf8");
  await folderInput.setInputFiles(insubstantialFolder);
  await localFolderForm.locator('button[type="submit"]').click();
  const localPreflightError = await localFolderForm.locator("[data-private-status]").innerText();
  if (!localPreflightError.includes("No contiene archivos PDF, DOCX o XLSX")) {
    throw new Error("Una carpeta insustancial no queda bloqueada antes de la cola");
  }
  if (ingestionRequests !== 0) throw new Error("La carpeta insustancial alcanza la cola privada");
  await page.screenshot({ path: ".tmp/private-source-insubstantial-blocked.png" });
  await page.locator("[data-private-close]").first().click();
  await page.screenshot({ path: ".tmp/tenant-plan-ui.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    pricingColumns: getComputedStyle(document.querySelector(".pricing-grid")).gridTemplateColumns.split(" ").length,
    areaColumns: getComputedStyle(document.querySelector(".contracted-area-grid")).gridTemplateColumns.split(" ").length
  }));
  if (mobileLayout.overflow || mobileLayout.pricingColumns !== 1 || mobileLayout.areaColumns !== 1) throw new Error("El plan o sus áreas no se adaptan correctamente a móvil");

  await page.setViewportSize({ width: 1440, height: 1050 });
  const candidateId = await page.evaluate(() => {
    const item = window.currentOpportunities?.()[0];
    if (!item?.id) return "";
    window.TENANT_RECOMMENDATIONS_APPLIED = true;
    localStorage.setItem("workspace-candidates-v1", JSON.stringify({ activeId: item.id, selectedIds: [item.id] }));
    window.dispatchEvent(new CustomEvent("tenant-recommendations-applied"));
    return item.id;
  });
  if (!candidateId) throw new Error("No hay oportunidad de prueba para revisar las tareas");
  await page.locator('.nav-item[data-screen="workspace"]').click();
  await page.locator(`#workspace .candidate-list [data-workspace-open="${candidateId}"]`).click();
  const packageView = page.locator("#documentary-agent-package");
  await packageView.waitFor({ state: "visible" });
  if (await page.locator("[data-close-candidate-detail]").count()) throw new Error("Sigue apareciendo el modal intermedio");
  const map = packageView.locator(".candidature-map");
  if ((await map.locator(".candidature-map-node.information").count()) !== 6
    || (await map.locator(".candidature-map-node.action").count()) !== 3) {
    throw new Error("El mapa no separa información y acciones de la candidatura");
  }
  const mapText = await map.innerText();
  for (const expected of ["1. Entender", "2. Preparar", "Encaje, riesgos y evidencias", "Generar y versionar la memoria"]) {
    if (!mapText.includes(expected)) throw new Error(`Mapa de candidatura incompleto: ${expected}`);
  }
  await map.locator('[data-candidature-action="checklist"]').click();
  let panelModal = page.locator("[data-candidature-panel-modal]");
  if ((await panelModal.locator("[data-candidate-task-info]").count()) !== 5) throw new Error("No todas las tareas ofrecen información");
  await panelModal.locator('[data-candidate-task-info="1"] > summary').click();
  const taskInfoText = await panelModal.locator('[data-candidate-task-info="1"]').innerText();
  for (const expected of ["Qué se comprueba", "Evidencia necesaria", "Cuándo se completa", "no confirma por sí sola la elegibilidad"]) {
    if (!taskInfoText.includes(expected)) throw new Error(`Información de tarea incompleta: ${expected}`);
  }
  await page.screenshot({ path: ".tmp/candidate-task-information.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error("La información de tarea provoca desbordamiento móvil");
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  await panelModal.locator("[data-close-candidature-panel]").click();

  for (const taskTab of ["analysis", "draft", "documents"]) {
    await map.locator(`[data-candidature-${taskTab === "analysis" ? "info" : "action"}="${taskTab}"]`).click();
    panelModal = page.locator("[data-candidature-panel-modal]");
    await panelModal.waitFor({ state: "visible" });
    const expectedContent = { analysis: "lectura del radar", draft: "esquema orientativo", documents: "bases", checklist: "checklist" }[taskTab];
    const panelText = await panelModal.innerText();
    const normalizedPanelText = panelText.toLowerCase();
    if (!normalizedPanelText.includes(expectedContent) || !normalizedPanelText.includes(taskTab === "analysis" ? "entender la convocatoria" : "preparar la candidatura")) {
      throw new Error(`La tarea no abre directamente su modal ${taskTab}: ${panelText.slice(0, 240)}`);
    }
    await panelModal.locator("[data-close-candidature-panel]").click();
  }
  await page.screenshot({ path: ".tmp/candidature-interactive-map.png", fullPage: true });
  await page.locator("[data-workspace-back]").click();
  if (!(await page.locator("#workspace .candidate-list").isVisible())) throw new Error("Volver desde el expediente no recupera la lista");
  await page.locator('.nav-item[data-screen="opportunities"]').click();
  await page.locator('.nav-item[data-screen="workspace"]').click();
  if (!(await page.locator("#workspace .candidate-list").isVisible())) throw new Error("Volver a Candidatura desde el menú no recupera la lista");

  const socialContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const socialSession = {
    ...session, label: "Entidad X",
    plan: {
      code: "social_team", label: "Equipo social", billingMode: "contracted", billingStatus: "Contratado",
      currentMonthlyEur: 29, referenceMonthlyEur: 29,
      features: ["dashboard", "opportunities", "entity", "agents", "audit"],
      agentKeys: ["grant_search", "entity_research", "match_agent", "alert_agent"]
    }
  };
  await socialContext.addInitScript((value) => {
    sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
    sessionStorage.setItem("prototype-role", "entity");
  }, socialSession);
  await socialContext.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const agents = socialSession.plan.agentKeys.map((agent_key) => ({ agent_key, enabled: true, status: "ready", status_reason: "Capacidad verificada" }));
    const historicalSource = { id: "historical-source", label: "Archivo histórico", kind: "local_simulation", scope: "tenant_private", status: "active", config_json: { lastInventory: { runId: "historical-run", documentsScanned: 1 } } };
    const historicalDocuments = [{ id: "historical-document", title: "Memoria histórica 2024.pdf", mime_type: "application/pdf", data_class: "internal", source_sha256: "abcdef1234567890", blob_path: null, metadata_json: { document_candidate: true, ingestion_run_id: "historical-run", review_status: "approved" } }];
    const data = path === "/api/tenant-agent-governance" ? { agents, consents: [], webSource: null, privateSources: [historicalSource], privateIngestionRuns: [], profileReviewState: "approved" }
      : path === "/api/private-document-candidates" ? historicalDocuments
      : path === "/api/tenant-profile-review" || path === "/api/entity-research-runs" ? []
        : path === "/api/tenant-match-runs" ? { run: null, recommendations: [] } : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  const socialPage = await socialContext.newPage();
  await socialPage.goto(appUrl, { waitUntil: "networkidle" });
  const socialPlan = socialPage.locator("#entity-plan");
  if ((await socialPlan.locator(".contracted-area.is-contracted").count()) !== 4) throw new Error("Equipo social no limita sus áreas contratadas");
  if ((await socialPlan.locator(".contracted-area.is-unavailable").count()) !== 2) throw new Error("Equipo social no identifica las áreas excluidas");
  if (!(await socialPage.locator('.nav-item[data-screen="workspace"]').isVisible())) throw new Error("Equipo social pierde el histórico de Candidatura");
  const socialKnowledgeNav = socialPage.locator('.nav-item[data-screen="knowledge"]');
  if (!(await socialKnowledgeNav.isVisible())) throw new Error("Equipo social pierde sus documentos de Base común");
  if ((await socialPage.locator("#private-knowledge-panel").count()) !== 0) throw new Error("Entidad X conserva el panel operativo privado");
  await socialKnowledgeNav.click();
  const readOnlyKnowledge = socialPage.locator("#common-knowledge-library");
  const readOnlyText = await readOnlyKnowledge.innerText();
  for (const expected of ["Solo lectura", "Memoria histórica 2024.pdf", "Consulta IA no incluida"]) {
    if (!readOnlyText.includes(expected)) throw new Error(`Base común sin agente no conserva el estado: ${expected}`);
  }
  const readOnlyOverview = readOnlyKnowledge.locator("[data-knowledge-overview]");
  await readOnlyOverview.locator("summary").click();
  if (!(await readOnlyOverview.innerText()).includes("Tus datos siguen disponibles")) throw new Error("El punto de información oculta el aviso del plan");
  await readOnlyOverview.locator("summary").click();
  if ((await readOnlyKnowledge.locator("[data-private-knowledge-open], [data-private-review]").count()) !== 0) {
    throw new Error("Base común permite mutaciones sin agente documental");
  }
  if (!(await readOnlyKnowledge.locator('[data-knowledge-query-form] button[type="submit"]').isDisabled())) {
    throw new Error("La consulta IA sigue activa sin agente documental");
  }
  await socialPage.screenshot({ path: ".tmp/common-knowledge-read-only-plan.png", fullPage: true });
  await socialPage.locator('.nav-item[data-screen="entity"]').click();
  await socialPlan.locator('[data-plan-area-info="draft_agent"]').click();
  const socialAreaModal = socialPage.locator("[data-plan-area-modal]");
  if (!(await socialAreaModal.isVisible())) throw new Error("El área no incluida carece de explicación informativa");
  const socialAreaText = await socialAreaModal.innerText();
  const socialPreparationActions = await socialAreaModal.locator("[data-plan-open-preparation]").count();
  if (!socialAreaText.toLowerCase().includes("área no incluida") || socialPreparationActions !== 0) {
    throw new Error(`El plan ofrece gestionar un agente documental no contratado: actions=${socialPreparationActions}, text=${socialAreaText.slice(0, 120)}`);
  }
  const socialText = await socialPlan.innerText();
  if (!socialText.includes("Contratación de Entidad X") || !socialText.includes("Cuota actual\n29 €")) throw new Error("El plan no se adapta a otra entidad");
  await socialContext.close();

  await commonKnowledgeNav.click();
  await page.evaluate(() => {
    const expired = JSON.parse(sessionStorage.getItem("subvenciones.auth.session.v1"));
    expired.expiresAt = Math.floor(Date.now() / 1000) - 60;
    sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(expired));
    window.CredentialsAuth.authHeaders(expired);
  });
  const expiredStatus = page.locator("#public-login-status");
  await expiredStatus.waitFor({ state: "visible" });
  if (!(await expiredStatus.innerText()).includes("no se ha registrado ni enviado ningún documento")) {
    throw new Error("La sesión caducada conserva el error técnico o no confirma que no hubo envío");
  }
  await page.locator("#public-login-form [name='email']").fill("gestor@example.invalid");
  await page.locator("#public-login-form [name='password']").fill("local-pass");
  await page.locator("#public-login-form button[type='submit']").click();
  await page.locator("#common-knowledge-library").waitFor({ state: "visible" });
  if ((await page.locator("#screen-title").innerText()) !== "Base común de la entidad") {
    throw new Error("El nuevo acceso no regresa a Base común tras caducar la sesión");
  }

  const rejectedContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await rejectedContext.addInitScript((value) => {
    sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
    sessionStorage.setItem("prototype-role", "entity");
  }, { ...session, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
  let rejectedMatchRequests = 0;
  await rejectedContext.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/tenant-match-runs") rejectedMatchRequests += 1;
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Token sin pertenencia activa a entidad" }) });
  });
  const rejectedPage = await rejectedContext.newPage();
  await rejectedPage.goto("http://127.0.0.1:3000/?v=tenant-session-api-recovery#view-dashboard", { waitUntil: "networkidle" });
  await rejectedPage.locator("#public-login-status").waitFor({ state: "visible" });
  const requestsAfterRecovery = rejectedMatchRequests;
  await rejectedPage.waitForTimeout(5200);
  if (rejectedMatchRequests !== requestsAfterRecovery) throw new Error("El encaje sigue consultando la API tras invalidar la sesión tenant");
  await rejectedContext.close();

  const legacyContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await legacyContext.addInitScript((value) => {
    sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
    sessionStorage.setItem("prototype-role", "entity");
  }, { ...session, tenantId: "novaterra-demo", expiresAt: Math.floor(Date.now() / 1000) + 3600 });
  const protectedLegacyPaths = new Set([
    "/api/tenant-audit-events", "/api/tenant-agent-governance", "/api/tenant-profile-review",
    "/api/entity-research-runs", "/api/tenant-match-runs"
  ]);
  let legacyApiRequests = 0;
  const legacyProtectedRequests = [];
  await legacyContext.route("**/api/**", async (route) => {
    const requestPath = new URL(route.request().url()).pathname;
    if (protectedLegacyPaths.has(requestPath)) {
      legacyApiRequests += 1;
      legacyProtectedRequests.push(requestPath);
    }
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "No debe llamarse" }) });
  });
  const legacyPage = await legacyContext.newPage();
  await legacyPage.goto("http://127.0.0.1:3000/?v=tenant-legacy-scope-recovery#view-dashboard", { waitUntil: "networkidle" });
  await legacyPage.locator("#public-login-status").waitFor({ state: "visible" });
  if (legacyApiRequests !== 0) throw new Error(`La sesión tenant antigua llega a las APIs antes de invalidarse: ${legacyProtectedRequests.join(", ")}`);
  await legacyContext.close();

  console.log(JSON.stringify({ ok: true, appUrl, plans: 3, contractedAreas: 6, privateKnowledge: "visible-common-library", preparationRoutes: 2, candidateTaskInfo: 5, guidedFacts: 11, documentManager: "public-mode-operational", entityXContractedAreas: 4, mobileColumns: 1, screenshot: ".tmp/candidate-task-information.png" }, null, 2));
} finally {
  await browser.close();
}
