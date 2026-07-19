import fs from "node:fs";
import path from "node:path";
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
let privateSources = [];
let privateIngestionRuns = [];
let privateReviewFacts = [];
await context.addInitScript((value) => {
  sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
  sessionStorage.setItem("prototype-role", "entity");
}, session);
await context.route("**/api/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === "/api/ingestion-dispatch") ingestionRequests += 1;
  if (path === "/api/tenant-agent-governance" && route.request().method() === "PATCH") {
    const body = route.request().postDataJSON();
    if (body.action === "grant_consent" && body.consentType === "ai_processing") aiGranted = true;
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
    ? { agents, executionControls, consents: [...(aiGranted ? [{ consent_type: "ai_processing", status: "granted" }] : []), ...(privateSources.length ? [{ consent_type: "manual_upload", status: "granted" }] : [])], webSource: null, privateSources, privateIngestionRuns, profileReviewState: "approved" }
    : path === "/api/tenant-profile-review" ? privateReviewFacts
      : path === "/api/entity-research-runs" ? []
      : path === "/api/tenant-match-runs" ? { run: null, recommendations: [] } : [];
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
});

const page = await context.newPage();
try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
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
  if ((await plan.locator("[data-plan-area-info]").count()) !== 6) throw new Error("Las áreas incluidas no ofrecen puntos de información");
  await plan.locator('[data-plan-area-info="draft_agent"]').click();
  const areaModal = page.locator("[data-plan-area-modal]");
  const areaText = await areaModal.innerText();
  for (const expected of ["Preparación documental", "Curador de conocimiento", "Redactor documental", "Conocimiento progresivo del tenant", "Gestionar desde Asistentes"]) {
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
  await page.locator(`#workspace .candidate-list [data-candidate-detail="${candidateId}"]`).click();
  const candidateDetail = page.locator(".modal-backdrop[data-close-candidate-detail]");
  if ((await candidateDetail.locator("[data-candidate-task-info]").count()) !== 5) throw new Error("No todas las tareas ofrecen información");
  const candidateDetailText = await candidateDetail.innerText();
  if (!candidateDetailText.includes("Plan para dejar la candidatura preparada") || !candidateDetailText.includes("Comprobar cofinanciación exigida")) {
    throw new Error("El detalle no aclara el objetivo de la lista ni la cofinanciación");
  }
  await page.screenshot({ path: ".tmp/candidate-task-list.png" });
  await candidateDetail.locator('[data-candidate-task-info="1"]').click();
  const taskInfo = page.locator(".modal-backdrop[data-close-candidate-task-info]");
  const taskInfoText = await taskInfo.innerText();
  for (const expected of ["Qué se comprueba", "Evidencia necesaria", "Cuándo se considera completada", "no confirma por sí sola la elegibilidad"]) {
    if (!taskInfoText.includes(expected)) throw new Error(`Información de tarea incompleta: ${expected}`);
  }
  await page.screenshot({ path: ".tmp/candidate-task-information.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  const taskInfoMobile = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
  if (taskInfoMobile.overflow) throw new Error("La información de tarea provoca desbordamiento móvil");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await taskInfo.locator("button.ghost-action[data-close-candidate-task-info]").click();
  if (!(await candidateDetail.isVisible())) throw new Error("Cerrar la información cierra también la candidatura");
  const candidateListAction = `#workspace .candidate-list [data-candidate-detail="${candidateId}"]`;
  for (const [taskTab, rowText] of [["analysis", ""], ["draft", ""], ["documents", ""], ["checklist", "Comprobar cofinanciación exigida"]]) {
    const action = rowText
      ? candidateDetail.locator(".candidate-detail-task").filter({ hasText: rowText }).locator(`[data-candidate-task="${taskTab}"]`)
      : candidateDetail.locator(`[data-candidate-task="${taskTab}"]`);
    await action.click();
    if (!(await page.locator(`[data-requirements-tab="${taskTab}"].is-active`).isVisible())
      || !(await page.locator(`[data-requirements-panel="${taskTab}"].is-active`).isVisible())) {
      throw new Error(`La tarea no abre directamente la pestaña ${taskTab}`);
    }
    await page.locator("[data-workspace-back]").click();
    await page.locator(candidateListAction).click();
  }
  await candidateDetail.locator("button[data-close-candidate-detail]").click();

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
    const agents = session.plan.agentKeys.map((agent_key) => ({ agent_key, enabled: true, status: "ready", status_reason: "Capacidad verificada" }));
    const data = path === "/api/tenant-agent-governance" ? { agents, consents: [], webSource: null, privateSources: [], profileReviewState: "approved" }
      : path === "/api/tenant-profile-review" || path === "/api/entity-research-runs" ? []
        : path === "/api/tenant-match-runs" ? { run: null, recommendations: [] } : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
  });
  const socialPage = await socialContext.newPage();
  await socialPage.goto(appUrl, { waitUntil: "networkidle" });
  const socialPlan = socialPage.locator("#entity-plan");
  if ((await socialPlan.locator(".contracted-area.is-contracted").count()) !== 4) throw new Error("Equipo social no limita sus áreas contratadas");
  if ((await socialPlan.locator(".contracted-area.is-unavailable").count()) !== 2) throw new Error("Equipo social no identifica las áreas excluidas");
  if (await socialPage.locator('.nav-item[data-screen="workspace"]').isVisible()) throw new Error("Equipo social conserva Candidatura fuera de su plan");
  if ((await socialPage.locator("#private-knowledge-panel").count()) !== 0) throw new Error("Entidad X conserva el panel operativo privado");
  await socialPlan.locator('[data-plan-area-info="draft_agent"]').click();
  if (!(await socialPage.locator("[data-plan-area-modal]").isVisible())) throw new Error("El área no incluida carece de explicación informativa");
  const socialText = await socialPlan.innerText();
  if (!socialText.includes("Contratación de Entidad X") || !socialText.includes("Cuota actual\n29 €")) throw new Error("El plan no se adapta a otra entidad");
  await socialContext.close();

  console.log(JSON.stringify({ ok: true, appUrl, plans: 3, contractedAreas: 6, privateKnowledge: "managed-from-assistants", preparationRoutes: 2, candidateTaskInfo: 5, guidedFacts: 11, documentManager: "public-mode-operational", entityXContractedAreas: 4, mobileColumns: 1, screenshot: ".tmp/candidate-task-information.png" }, null, 2));
} finally {
  await browser.close();
}
