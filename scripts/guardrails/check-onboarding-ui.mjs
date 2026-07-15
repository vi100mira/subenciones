import { chromium } from "playwright";

const appUrl = process.env.UI_CHECK_URL || "http://localhost:5173/?v=guardrail-ui#view-entity";
const publicUrl = process.env.UI_PUBLIC_CHECK_URL || "http://localhost:5173/?v=public-entry#view-welcome";
const superadminPassword = process.env.UI_SUPERADMIN_PASSWORD;
const tenantPassword = process.env.UI_TENANT_PASSWORD;
const sensitivePatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /sb_secret_/i,
  /service_role/i,
  /eyJ[A-Za-z0-9_-]{20,}/
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(publicUrl, { waitUntil: "networkidle" });

  assert(await page.locator(".public-entry").isVisible(), "No se ve la landing publica");
  assert(await page.locator("#public-login-form").isVisible(), "No se ve el acceso por credenciales");
  assert(!(await page.locator("#public-onboarding-form").isVisible()), "El alta no debe duplicarse junto al acceso");
  assert((await page.locator(".public-entry__product-summary").innerText()).includes("convocatoria"), "La portada no explica de forma breve qué hace INSERTIA");
  await page.locator("[data-entry-tab='plans']").click();
  assert(await page.locator("#public-plans-panel").isVisible(), "No se ve la pestaña Planes y precios");
  assert((await page.locator("#public-pricing-grid .pricing-card").count()) === 3, "El catálogo público no muestra los tres planes compartidos");
  const pricingText = await page.locator("#public-pricing-grid").innerText();
  assert(pricingText.includes("0 €") && pricingText.includes("29 €") && pricingText.includes("79 €"), "Los precios públicos no coinciden con el catálogo de entidad");
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto(publicUrl, { waitUntil: "networkidle" });
  await mobilePage.locator("[data-entry-tab='plans']").click();
  const mobileOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert(!mobileOverflow, "La consulta de planes genera desplazamiento horizontal en móvil");
  await mobilePage.close();
  await page.locator("[data-entry-tab='register']").click();
  assert(await page.locator("#public-onboarding-form").isVisible(), "No se ve el formulario en Registrar entidad");
  assert((await page.locator("[data-entry-tab='register']").getAttribute("aria-selected")) === "true", "No se activa la pestaña de registro");
  assert((await page.locator("[data-public-action]").count()) === 0, "Sigue existiendo un acceso directo por rol");
  assert(await page.locator(".app-shell").evaluate((el) => el.hidden), "El cockpit aparece antes de acceso");

  if (superadminPassword) {
    await page.locator("#public-login-form [name='email']").fill("vicentmirabarrachina@gmail.com");
    await page.locator("#public-login-form [name='password']").fill(superadminPassword);
    await page.locator("#public-login-form").evaluate((form) => form.requestSubmit());
    assert((await page.locator("#screen-title").textContent()) === "Panel de plataforma", "Superadmin no aterriza en Panel");
    assert((await page.locator("body").getAttribute("data-role")) === "superadmin", "No se aplica rol superadmin");
  }

  await page.evaluate(() => sessionStorage.clear());
  await page.goto("about:blank");
  await page.goto(publicUrl, { waitUntil: "networkidle" });
  assert(await page.locator(".public-entry").isVisible(), "La landing no reaparece en sesion limpia");
  if (tenantPassword) {
    await page.locator("#public-login-form [name='email']").fill("admin@novaterra.org.es");
    await page.locator("#public-login-form [name='password']").fill(tenantPassword);
    await page.locator("#public-login-form").evaluate((form) => form.requestSubmit());
    assert((await page.locator("#screen-title").textContent()) === "Panel de oportunidades", "Entidad no aterriza en Panel");
    assert((await page.locator("body").getAttribute("data-role")) === "entity", "No se aplica rol entidad");
  }

  await page.evaluate(() => sessionStorage.removeItem("prototype-role"));
  await page.goto(appUrl, { waitUntil: "networkidle" });

  const title = await page.locator("#screen-title").textContent();
  const cockpitOnboardingPanel = page.locator("#onboarding-request-panel");
  const status = await page.locator("#onboarding-request-status").innerText();
  const bodyText = await page.locator("body").innerText();

  assert(title === "Perfil de entidad", `Pantalla inesperada: ${title}`);
  assert(!(await cockpitOnboardingPanel.isVisible()), "El alta publica aparece dentro del cockpit de entidad");
  assert(status.includes("No crea usuarios"), "El estado no explica el limite del flujo");

  const leakedPattern = sensitivePatterns.find((pattern) => pattern.test(bodyText));
  assert(!leakedPattern, `Posible secreto visible en UI: ${leakedPattern}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        appUrl,
        publicUrl,
        title,
        publicFormVisibleInRegisterTab: true,
        publicPricingVisible: true,
        mobilePricingWithoutHorizontalOverflow: true,
        credentialGateVisible: true,
        cockpitOnboardingHidden: true,
        security: "sin patrones de secreto visibles"
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
