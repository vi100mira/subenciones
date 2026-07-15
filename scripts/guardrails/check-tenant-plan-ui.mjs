import fs from "node:fs";
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
await context.addInitScript((value) => {
  sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify(value));
  sessionStorage.setItem("prototype-role", "entity");
}, session);
await context.route("**/api/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  const readyAgents = new Set(["grant_search", "match_agent", "document_review"]);
  const agents = session.plan.agentKeys.map((agent_key) => ({
    agent_key, enabled: readyAgents.has(agent_key), status: readyAgents.has(agent_key) ? "ready" : "blocked",
    status_reason: readyAgents.has(agent_key) ? "Capacidad verificada" : "Requiere autorización o conexión"
  }));
  const data = path === "/api/tenant-agent-governance"
    ? { agents, consents: [], webSource: null, profileReviewState: "approved" }
    : path === "/api/tenant-profile-review" || path === "/api/entity-research-runs" ? []
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
  const ribbonBox = await plan.locator(".pricing-ribbon").boundingBox();
  const guideBox = await page.locator("#help-assistant-launcher").boundingBox();
  const overlap = ribbonBox && guideBox && ribbonBox.x < guideBox.x + guideBox.width && ribbonBox.x + ribbonBox.width > guideBox.x
    && ribbonBox.y < guideBox.y + guideBox.height && ribbonBox.y + ribbonBox.height > guideBox.y;
  if (overlap) throw new Error("La guía flotante tapa la identificación del plan actual");
  fs.mkdirSync(".tmp", { recursive: true });
  await page.screenshot({ path: ".tmp/tenant-plan-ui.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    pricingColumns: getComputedStyle(document.querySelector(".pricing-grid")).gridTemplateColumns.split(" ").length
  }));
  if (mobileLayout.overflow || mobileLayout.pricingColumns !== 1) throw new Error("El plan no se adapta correctamente a móvil");

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
    const data = path === "/api/tenant-agent-governance" ? { agents, consents: [], webSource: null, profileReviewState: "approved" }
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
  const socialText = await socialPlan.innerText();
  if (!socialText.includes("Contratación de Entidad X") || !socialText.includes("Cuota actual\n29 €")) throw new Error("El plan no se adapta a otra entidad");
  await socialContext.close();

  console.log(JSON.stringify({ ok: true, appUrl, plans: 3, contractedAreas: 6, entityXContractedAreas: 4, mobileColumns: 1, screenshot: ".tmp/tenant-plan-ui.png" }, null, 2));
} finally {
  await browser.close();
}
