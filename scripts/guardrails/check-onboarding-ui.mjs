import { chromium } from "playwright";

const appUrl = process.env.UI_CHECK_URL || "http://localhost:5173/?v=guardrail-ui#view-entity";
const publicUrl = process.env.UI_PUBLIC_CHECK_URL || "http://localhost:5173/?v=public-entry#view-welcome";
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
  assert(await page.locator("#public-onboarding-form").isVisible(), "No se ve el formulario publico");
  assert(await page.locator("#public-login-form").isVisible(), "No se ve el acceso por credenciales");
  assert((await page.locator("[data-public-action]").count()) === 0, "Sigue existiendo un acceso directo por rol");
  assert(await page.locator(".app-shell").evaluate((el) => el.hidden), "El cockpit aparece antes de acceso");

  await page.locator("#public-login-form [name='email']").fill("superadmin@subvenciones-rag.local");
  await page.locator("#public-login-form [name='password']").fill("demo2026");
  await page.locator("#public-login-form").evaluate((form) => form.requestSubmit());
  assert((await page.locator("#screen-title").textContent()) === "Consola plataforma", "Superadmin no aterriza en Plataforma");
  assert((await page.locator("body").getAttribute("data-role")) === "superadmin", "No se aplica rol superadmin");

  await page.evaluate(() => sessionStorage.clear());
  await page.goto("about:blank");
  await page.goto(publicUrl, { waitUntil: "networkidle" });
  assert(await page.locator(".public-entry").isVisible(), "La landing no reaparece en sesion limpia");
  await page.locator("#public-login-form [name='email']").fill("admin@novaterra.local");
  await page.locator("#public-login-form [name='password']").fill("demo2026");
  await page.locator("#public-login-form").evaluate((form) => form.requestSubmit());
  assert((await page.locator("#screen-title").textContent()) === "Perfil de entidad", "Entidad no aterriza en su perfil");
  assert((await page.locator("body").getAttribute("data-role")) === "entity", "No se aplica rol entidad");

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
        publicFormVisible: true,
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
