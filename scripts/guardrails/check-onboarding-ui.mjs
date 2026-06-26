import { chromium } from "playwright";

const url = process.env.UI_CHECK_URL || "http://localhost:5173/?v=guardrail-ui#view-entity";
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
  await page.goto(url, { waitUntil: "networkidle" });

  const title = await page.locator("#screen-title").textContent();
  const form = page.locator("#onboarding-request-form");
  const status = await page.locator("#onboarding-request-status").innerText();
  const bodyText = await page.locator("body").innerText();

  assert(title === "Perfil de entidad", `Pantalla inesperada: ${title}`);
  assert(await form.isVisible(), "No se ve el formulario de alta de entidad");
  assert(await form.locator("[name='entityName']").isVisible(), "Falta campo entidad");
  assert(await form.locator("[name='requesterEmail']").isVisible(), "Falta email solicitante");
  assert(await form.locator("[name='adminEmail']").isVisible(), "Falta email admin");
  assert(await form.locator("[name='publicWebConsent']").isVisible(), "Falta consentimiento web publica");
  assert(status.includes("No crea usuarios"), "El estado no explica el limite del flujo");

  const leakedPattern = sensitivePatterns.find((pattern) => pattern.test(bodyText));
  assert(!leakedPattern, `Posible secreto visible en UI: ${leakedPattern}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        url,
        title,
        formVisible: true,
        security: "sin patrones de secreto visibles"
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
