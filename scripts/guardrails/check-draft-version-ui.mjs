import fs from "node:fs";
import { chromium } from "playwright";

const appUrl = process.env.UI_CHECK_URL || "http://127.0.0.1:3000/?v=draft-version-ui#view-entity";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const session = {
  email: "gestor@example.invalid", role: "entity", tenantRole: "owner",
  tenantId: "00000000-0000-4000-8000-000000000001", tenantStatus: "active", label: "Entidad piloto",
  accessToken: "local-ui-check", screen: "entity",
  plan: {
    code: "mission_full", label: "Misión integral", features: ["dashboard", "opportunities", "entity", "agents", "workspace", "audit"],
    agentKeys: ["grant_search", "entity_research", "match_agent", "document_review", "draft_agent", "alert_agent"]
  }
};
let canonicalKey = "";
let basesAccepted = false;
let editedVersions = [];
let editedContent = {
  title: "Solicitud oficial", humanReviewRequired: true, submissionAllowed: false,
  evidenceRefs: ["bases:p3"], uncertainties: [], documentPlan: [],
  documents: [{ documentRef: "draft-document:1", title: "Solicitud oficial", documentType: "solicitud",
    role: "supporting_draft", requirementRefs: ["requirement:1"], evidenceRefs: ["bases:p3"], missingInputs: [],
    sections: [{ title: "Identificación y datos administrativos", paragraphs: ["Contenido generado de prueba con evidencia aprobada."], evidenceRefs: ["bases:p3"] }] }]
};

await context.addInitScript((value) => {
  sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
  sessionStorage.setItem("prototype-role", "entity");
}, session);

await context.route("**/api/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  let data = path === "/api/draft-agent-runs" ? {
    runs: [{
      id: "old-public-draft", status: "review_required", use_approved_internal_facts: false,
      input_manifest_json: { canonicalKey, approvedFactRefs: [] }, context_manifest_json: {}, output_json: {}, usage_json: {},
      created_at: "2026-07-13T09:56:27.923Z", finished_at: "2026-07-13T12:45:24.656Z", human_review: null
    }],
    approvedKnowledge: { factCount: 11, latestApprovedAt: "2026-07-19T09:01:11.493Z" }
  } : path === "/api/tenant-agent-governance" ? { agents: [], executionControls: [], consents: [], privateSources: [], privateIngestionRuns: [] }
    : path === "/api/tenant-match-runs" ? { run: null, recommendations: [] }
      : [];
  if (path === "/api/bases-review-request") {
    const body = route.request().postDataJSON?.() || {};
    if (route.request().method() === "POST" && body.action === "accept") basesAccepted = true;
    data = {
      state: basesAccepted ? "accepted_by_entity" : "ready_for_entity_review",
      message: basesAccepted ? "Tu equipo validó estas bases para esta candidatura." : "Las citas están verificadas. Tu equipo debe revisar las cláusulas.",
      reviewItems: [{ id: "interpretation-1", sections: [{ section: "beneficiaries", text: "Entidades sociales del municipio", evidenceExcerpt: "Podrán solicitar...", sourcePage: 3, sourceUrl: "https://oficial.invalid/bases.pdf" }] }],
      requestId: null, requestedAt: null, alreadyRequested: false, canRequestAgain: false,
      canAccept: !basesAccepted, canReportDiscrepancy: !basesAccepted,
      draftingAllowed: basesAccepted, constraintsVerified: basesAccepted, platformApprovalRequired: false
    };
  }
  if (path === "/api/draft-document-versions") {
    const method = route.request().method();
    const body = method === "GET" ? {} : route.request().postDataJSON();
    if (method === "POST") {
      const section = body.edits[0].sections[0];
      editedContent = { ...editedContent, documents: editedContent.documents.map((document) => ({ ...document,
        sections: document.sections.map((current) => current.title === section.title ? { ...current, paragraphs: section.paragraphs } : current) })) };
      editedVersions = [{ id: "version-1", version_number: 1, status: "editing", content_json: editedContent,
        content_hash: "a".repeat(64), change_note: body.changeNote, created_at: "2026-07-22T12:00:00Z" }];
      data = { version: editedVersions[0], review: { id: "review-1", status: "pending", validation_json: { draftVersionId: "version-1" } } };
    } else if (method === "PATCH") {
      editedVersions[0].status = body.action;
      data = { version: editedVersions[0], review: { id: "review-1", status: body.action,
        output_hash: "a".repeat(64), validation_json: { draftVersionId: "version-1" } } };
    } else data = { runId: "old-public-draft", canonicalKey, currentContent: editedVersions[0]?.content_json || editedContent,
      currentVersionId: editedVersions[0]?.id || null, versions: editedVersions };
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
});

const page = await context.newPage();
try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  canonicalKey = await page.evaluate(() => {
    const item = window.currentOpportunities?.()[0];
    if (!item?.id) return "";
    const catalogs = [window.RADAR_PLATFORM_OPPORTUNITIES, window.RADAR?.opportunities, window.MUNICIPAL_RADAR?.opportunities, window.MOCK?.opportunities, window.PRIVATE_OPEN_OPPORTUNITIES];
    for (const catalog of catalogs) {
      for (const row of catalog || []) {
        if (row.id !== item.id) continue;
        row.requirementsContract = { documentaryGate: "requirements_approved", sections: {}, missingCoreSections: [] };
        row.proposalConstraints = { draftingGate: "constraints_verified", limits: [], formatRules: [], requiresHumanReview: true };
      }
    }
    window.TENANT_RECOMMENDATIONS_APPLIED = true;
    localStorage.setItem("workspace-candidates-v1", JSON.stringify({ activeId: item.id, selectedIds: [item.id] }));
    window.dispatchEvent(new CustomEvent("tenant-recommendations-applied"));
    return item.id;
  });
  if (!canonicalKey) throw new Error("No hay oportunidad para probar la regeneración");

  await page.locator('.nav-item[data-screen="workspace"]').click();
  await page.locator(`#workspace .candidate-list [data-workspace-open="${canonicalKey}"]`).click();
  await page.locator('[data-candidature-action="draft"]').click();

  const draftPanel = page.locator('[data-candidature-panel-modal]');
  await draftPanel.locator('[data-draft-agent-start][data-approved-facts="true"]').waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector('[data-candidature-panel-modal]')?.textContent?.includes("Regenerar con conocimiento aprobado (11)"));
  await page.waitForTimeout(600);
  const text = await draftPanel.innerText();
  for (const expected of ["Regenerar con conocimiento aprobado (11)", "11 hechos aprobados", "posterior a este borrador", "conserva la anterior"]) {
    if (!text.includes(expected)) throw new Error(`Falta el estado versionado: ${expected}`);
  }
  const regenerate = draftPanel.locator('[data-draft-agent-start][data-approved-facts="true"]');
  if (!(await regenerate.isEnabled())) throw new Error("La regeneración sigue bloqueada con bases y límites verificados");

  fs.mkdirSync(".tmp", { recursive: true });
  await page.screenshot({ path: ".tmp/versioned-draft-regeneration.png", fullPage: true });
  await draftPanel.locator("[data-close-candidature-panel]").click();
  await page.locator('[data-candidature-action="documents"]').click();
  const templateButtons = page.locator('[data-candidature-panel-modal] [data-constructed-doc-view]');
  const templateCount = await templateButtons.count();
  if (!templateCount) throw new Error("No hay un documento preconstruido para probar el visor");
  await templateButtons.first().click();
  const skeletonModal = page.locator("[data-constructed-doc-modal]");
  await skeletonModal.waitFor({ state: "visible" });
  if ((await page.locator(".modal-backdrop").count()) !== 1 || (await page.locator("[data-candidature-panel-modal]").count()) !== 0) throw new Error("Ver plantilla mantiene dos modales superpuestos");
  if (!(await skeletonModal.locator(".constructed-doc-sidebar").isVisible()) || !(await skeletonModal.locator(".constructed-doc-frame").isVisible())) throw new Error("El visor no separa documento y controles");
  await page.waitForFunction(() => document.querySelector('[data-constructed-doc-modal]')?.textContent?.includes("Regenerar con conocimiento aprobado (11)")).catch(async () => {
    throw new Error(`El visor no recupera el estado versionado: ${(await skeletonModal.innerText()).slice(0, 700)}`);
  });
  const skeletonText = await skeletonModal.innerText();
  for (const expected of ["¿Solo aparece el esqueleto?", "Ir a Base común", "Regenerar con conocimiento aprobado (11)"]) {
    if (!skeletonText.includes(expected)) throw new Error(`El visor de esqueleto no ofrece: ${expected}`);
  }
  const documentFrame = skeletonModal.frameLocator(".constructed-doc-frame");
  const prefilledSections = documentFrame.locator(".template-field.is-verified, .template-field.is-proposed");
  const documentText = await documentFrame.locator("article").innerText();
  if (!(await prefilledSections.count())) throw new Error(`El documento no pre-rellena ningún apartado con los datos disponibles: ${documentText.slice(0, 800)}`);
  if (!documentText.toLowerCase().includes("pre-rellenado con fuente verificable") || !documentText.includes("Convocatoria:")) throw new Error(`El documento sigue mostrando solo cajas genéricas: ${documentText.slice(0, 1200)}`);
  const generatedTitle = await skeletonModal.locator("#constructed-doc-title").innerText();
  const generatedSectionTitle = await documentFrame.locator("section h2").first().innerText();
  await page.evaluate(({ id, title, section }) => window.dispatchEvent(new CustomEvent("draft-agent-run-updated", { detail: { canonicalKey: id, run: { id: "old-public-draft", status: "review_required", output_json: { title, humanReviewRequired: true, submissionAllowed: false, evidenceRefs: ["evidencia:prueba"], uncertainties: [], documentPlan: [], documents: [{ documentRef: "draft-document:1", title, documentType: title, role: "supporting_draft", requirementRefs: ["requirement:1"], missingInputs: [], evidenceRefs: ["evidencia:prueba"], sections: [{ title: section, paragraphs: ["Contenido generado de prueba con evidencia aprobada."], evidenceRefs: ["evidencia:prueba"] }] }] } } } })), { id: canonicalKey, title: generatedTitle, section: generatedSectionTitle });
  await documentFrame.getByText("Contenido generado de prueba con evidencia aprobada.", { exact: true }).first().waitFor({ state: "visible" });
  if (!(await documentFrame.getByText("Propuesto con evidencia · revisión humana pendiente", { exact: true }).first().isVisible())) throw new Error("El visor no sustituye el apartado por el borrador generado");
  const editButton = skeletonModal.locator("[data-document-version-edit]");
  await editButton.waitFor({ state: "visible" });
  await editButton.click();
  const editor = page.locator("[data-document-version-modal]");
  await editor.getByText("Borrador editable y versionado", { exact: true }).waitFor();
  const firstField = editor.locator("[data-document-edit-section]").first();
  await firstField.fill("Contenido corregido por la entidad y sujeto a revisión.");
  await editor.locator("[data-save-document-version]").click();
  await editor.getByText("v1 · editing", { exact: true }).waitFor();
  await page.screenshot({ path: ".tmp/document-version-editor.png" });
  await editor.locator("[data-approve-document-version]").click();
  await editor.waitFor({ state: "detached" });
  await page.screenshot({ path: ".tmp/constructed-document-single-modal.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error("El visor de plantilla provoca desbordamiento móvil");
  await page.screenshot({ path: ".tmp/constructed-document-single-modal-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await skeletonModal.locator(".constructed-doc-footer [data-return-constructed-doc]").click();
  if (!(await page.locator('[data-candidature-panel-modal]').isVisible())) throw new Error("Volver desde la plantilla no recupera Documentos");
  await page.evaluate((id) => {
    const catalogs = [window.RADAR_PLATFORM_OPPORTUNITIES, window.RADAR?.opportunities, window.MUNICIPAL_RADAR?.opportunities, window.MOCK?.opportunities, window.PRIVATE_OPEN_OPPORTUNITIES];
    for (const catalog of catalogs) {
      for (const row of catalog || []) {
        if (row.id !== id) continue;
        row.requirementsContract = { documentaryGate: "blocked_missing_core_requirements", sections: {}, missingCoreSections: ["requiredDocuments"] };
        row.proposalConstraints = { draftingGate: "blocked_pending_constraint_review", limits: [], formatRules: [], requiresHumanReview: true };
      }
    }
    window.openWorkspaceAnalysis(id, "draft");
  }, canonicalKey);
  const entityReview = page.locator(`[data-candidature-panel-modal] [data-bases-entity-review="${canonicalKey}"]`);
  await entityReview.waitFor({ state: "visible" });
  await entityReview.click();
  const basesModal = page.locator("[data-bases-entity-modal]");
  await basesModal.getByText("Entidades sociales del municipio", { exact: true }).waitFor();
  await page.screenshot({ path: ".tmp/bases-entity-review.png" });
  await basesModal.locator("[data-confirm-bases-accept]").click();
  const enabledDraft = page.locator('[data-candidature-panel-modal] [data-draft-agent-start][data-approved-facts="true"]');
  await enabledDraft.waitFor({ state: "visible" });
  if (!(await enabledDraft.isEnabled())) throw new Error("Validar las bases no habilita el redactor para el tenant");
  console.log(JSON.stringify({ ok: true, approvedFacts: 11, action: "Regenerar con conocimiento aprobado", skeletonEntryPoint: true, documentPrefill: true, generatedDocumentOverlay: true, previousVersionPreserved: true, basesReview: "accepted_by_entity", platformApprovalRequired: false }, null, 2));
} finally {
  await browser.close();
}
