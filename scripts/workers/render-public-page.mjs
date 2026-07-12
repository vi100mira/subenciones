import { chromium } from "playwright";

const url = process.argv[2];
if (!url) throw new Error("Public URL is required.");

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    acceptDownloads: false,
    javaScriptEnabled: true,
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1200);
  const result = await page.evaluate(() => ({
    title: document.title,
    html: document.documentElement.outerHTML,
    links: [...document.querySelectorAll("a[href]")].slice(0, 300).map((link) => ({
      href: link.href,
      label: (link.textContent || "").trim().slice(0, 160)
    }))
  }));
  process.stdout.write(JSON.stringify({ ...result, rendered_url: page.url() }));
} finally {
  await browser.close();
}
