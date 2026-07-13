import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import WebSocket from "ws";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

loadLocalEnv();
const email = process.env.AUTH_SUPERADMIN_EMAIL || "vicentmirabarrachina@gmail.com";
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("Falta configuración Supabase para la verificación");
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } };
const admin = createClient(supabaseUrl, serviceKey, clientOptions);
const auth = createClient(supabaseUrl, anonKey, clientOptions);
const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
const tokenHash = link?.properties?.hashed_token;
if (linkError || !tokenHash) throw new Error("No se pudo crear la sesión temporal superadmin");
const { data: verified, error: verifyError } = await auth.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
if (verifyError || !verified.session?.access_token) throw new Error("No se pudo validar la sesión temporal superadmin");

const appUrl = process.env.UI_PLATFORM_URL || "http://127.0.0.1:3001/#view-platform";
const chrome = process.env.PLAYWRIGHT_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath: existsSync(chrome) ? chrome : undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(({ accessToken, email }) => {
  sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify({ role: "superadmin", label: "Administración", email, accessToken }));
  sessionStorage.setItem("prototype-role", "superadmin");
}, { accessToken: verified.session.access_token, email });

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  const apiCheck = await page.evaluate(async () => {
    const session = JSON.parse(sessionStorage.getItem("subvenciones.auth.session.v1") || "null");
    const response = await fetch("/api/admin-platform-overview", { headers: { Authorization: `Bearer ${session?.accessToken || ""}` } });
    const payload = await response.json().catch(() => null);
    return { status: response.status, ok: payload?.ok, error: payload?.error || "" };
  });
  assert(apiCheck.status === 200 && apiCheck.ok, `API global ${apiCheck.status}: ${apiCheck.error}`);
  await page.locator("#platform-campaigns [data-platform-source-run]").first().waitFor({ state: "attached" });
  const dashboardTitle = await page.evaluate(() => { window.showScreen("dashboard"); return document.querySelector("#screen-title")?.textContent; });

  const evidence = await page.evaluate(() => ({
    role: document.body.dataset.role,
    dashboardTitle: document.querySelector("#screen-title")?.textContent,
    dashboardLabels: [...document.querySelectorAll("#dashboard .metric span")].map((item) => item.textContent.trim()),
    agentCards: document.querySelectorAll("#agent-grid .agent-card").length,
    realRunsTitle: document.querySelector("#agent-runs")?.closest(".panel")?.querySelector("h2")?.textContent,
    auditTitle: document.querySelector("#audit .panel-heading h2")?.textContent,
    sourceReviewButtons: document.querySelectorAll("#platform-campaigns [data-platform-source-run]").length,
    fakeReviewGuideVisible: document.querySelector("#platform-campaigns .plain-note") !== null,
    fakeProgramButtonVisible: document.querySelector('[data-review-action="create"]') !== null,
    fakeGlobalActionVisible: getComputedStyle(document.querySelector(".top-actions .primary-action")).display !== "none",
    sourceNodeTextAlign: getComputedStyle(document.querySelector("#source-map .source-node")).textAlign,
    operationsLabels: [...document.querySelectorAll("#operations .metric span")].map((item) => item.textContent.trim()),
    tenantRows: document.querySelectorAll(".tenant-grid-body .tenant-grid-row").length,
    tenantSortButtons: document.querySelectorAll("[data-tenant-sort]").length,
    tenantFilters: document.querySelectorAll("[data-tenant-filter]").length,
    tenantIconActions: document.querySelectorAll(".tenant-action-icon[aria-label]").length,
    privacyText: document.querySelector("#agents-readiness-note")?.textContent || ""
  }));
  assert(evidence.role === "superadmin", "No se aplicó la sesión superadmin");
  assert(dashboardTitle === "Panel de plataforma" && evidence.dashboardTitle === "Panel de plataforma", "El Panel no identifica el alcance superadmin");
  assert(evidence.dashboardLabels.includes("Tenants activos"), "El Panel sigue mostrando métricas tenant");
  assert(evidence.agentCards > 0 && evidence.realRunsTitle === "Últimas ejecuciones reales", "Asistentes no usa estado persistido");
  assert(evidence.auditTitle === "Auditoría global por tenant", "Auditoría no usa alcance global");
  assert(evidence.sourceReviewButtons === 3 && !evidence.fakeReviewGuideVisible && !evidence.fakeProgramButtonVisible, "Revisiones conserva controles o contenido simulado");
  assert(!evidence.fakeGlobalActionVisible, "La acción global simulada sigue visible para superadmin");
  assert(evidence.sourceNodeTextAlign === "center", "Los textos del mapa de fuentes no están centrados");
  assert(evidence.operationsLabels.includes("Trabajos en cola"), "Operaciones no usa métricas globales");
  assert(evidence.tenantRows > 0 && evidence.tenantSortButtons === 3 && evidence.tenantFilters === 3, "Entidades no ofrece rejilla ordenable y filtrable");
  assert(evidence.tenantIconActions === evidence.tenantRows * 4, "Las acciones de entidad no usan iconos accesibles");
  assert(evidence.privacyText.includes("no abre documentos"), "No se declara el límite de privacidad superadmin");
  await page.evaluate(() => { window.showScreen("platform"); window.TenantGrid.render([{ title: "Zeta", slug: "zeta", state: "Activa" }, { title: "Alfa", slug: "alfa", state: "Pendiente" }]); });
  await page.locator('[data-platform-tab="entities"]').click();
  assert((await page.locator(".tenant-grid-row").first().innerText()).startsWith("Alfa"), "El orden inicial de entidades no es ascendente");
  await page.locator('[data-tenant-sort="name"]').click();
  assert((await page.locator(".tenant-grid-row").first().innerText()).startsWith("Zeta"), "La cabecera no invierte el orden de entidades");
  await page.locator('[data-tenant-filter="name"]').fill("Alfa");
  assert((await page.locator(".tenant-grid-row").count()) === 1 && (await page.locator(".tenant-grid-row").innerText()).startsWith("Alfa"), "El filtro de entidad no reduce la rejilla");
  await page.evaluate(() => window.showScreen("dashboard"));
  const sourceStatusAction = page.locator("#dashboard .source-map-panel [data-jump]");
  assert((await sourceStatusAction.textContent())?.trim() === "Ver estado de fuentes", "El mapa global conserva una acción ambigua");
  await sourceStatusAction.click();
  assert(await page.evaluate(() => location.hash === "#view-operations" && document.activeElement?.id === "operations-source-health"), "El mapa global no lleva a la salud real de fuentes");
  if (process.env.UI_PLATFORM_SCREENSHOT) { await page.evaluate(() => window.showScreen("platform")); await page.screenshot({ path: process.env.UI_PLATFORM_SCREENSHOT, fullPage: true }); }

  const errorPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await errorPage.addInitScript(({ accessToken, email }) => {
    sessionStorage.setItem("subvenciones.auth.session.v1", JSON.stringify({ role: "superadmin", label: "Administración", email, accessToken }));
    sessionStorage.setItem("prototype-role", "superadmin");
  }, { accessToken: verified.session.access_token, email });
  await errorPage.route("**/api/admin-platform-overview", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Prueba de indisponibilidad" }) }));
  await errorPage.goto(appUrl.replace(/#.*$/, ""), { waitUntil: "networkidle" });
  const unavailable = await errorPage.evaluate(() => ({
    title: document.querySelector("#screen-title")?.textContent.trim(),
    hash: location.hash,
    labels: [...document.querySelectorAll("#dashboard .metric span")].map((item) => item.textContent.trim()),
    values: [...document.querySelectorAll("#dashboard .metric strong")].map((item) => item.textContent.trim()),
    details: [...document.querySelectorAll("#dashboard .metric small")].map((item) => item.textContent.trim()),
    globalActionVisible: getComputedStyle(document.querySelector(".top-actions .primary-action")).display !== "none",
    programButtonVisible: document.querySelector('[data-review-action="create"]') !== null
  }));
  assert(unavailable.title === "Panel de plataforma" && unavailable.hash === "#view-dashboard", "La entrada superadmin no aterriza en Panel");
  assert(unavailable.labels.includes("Tenants activos"), "El estado sin API recupera etiquetas tenant");
  assert(unavailable.values.every((value) => value === "—"), "El estado sin API filtra cifras tenant");
  assert(!unavailable.details.some((value) => value.includes("perfil de la entidad")), "El estado sin API conserva contexto tenant");
  assert(!unavailable.globalActionVisible, "El estado sin API muestra la acción global simulada");
  assert(!unavailable.programButtonVisible, "El fallback conserva Programar revisión sin funcionalidad real");
  await errorPage.evaluate(() => window.showScreen("platform"));
  const firstConfiguration = errorPage.locator("#platform-campaigns details").first();
  await firstConfiguration.locator("summary").click();
  assert(await firstConfiguration.evaluate((item) => item.open), "La configuración de fuente no se despliega tras el repintado de sesión");
  await errorPage.close();

  await page.setViewportSize({ width: 390, height: 844 });
  const responsive = {};
  for (const screen of ["dashboard", "agents", "audit", "platform", "operations"]) {
    responsive[screen] = await page.evaluate((screenId) => { window.showScreen(screenId); return document.documentElement.scrollWidth > document.documentElement.clientWidth; }, screen);
  }
  assert(!Object.values(responsive).some(Boolean), "Alguna vista superadmin desborda a 390 px");
  console.log(JSON.stringify({ ok: true, ...evidence, responsive }, null, 2));
} finally {
  await browser.close();
}
