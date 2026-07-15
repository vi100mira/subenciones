import assert from "node:assert/strict";
import fs from "node:fs";

const knowledge = fs.readFileSync("prototype/help-assistant-knowledge.js", "utf8");
const runtime = fs.readFileSync("prototype/help-assistant.js", "utf8");
const styles = fs.readFileSync("prototype/stitch-theme.css", "utf8");
const html = fs.readFileSync("prototype/index.html", "utf8");

for (const topic of ["overview", "registration", "profile", "radar", "matching", "bases", "candidature", "drafting", "changes", "async", "privacy", "audit"]) {
  assert(knowledge.includes(`id: "${topic}"`), `Falta el tema pedagógico ${topic}`);
}
assert(runtime.includes('role="dialog"') && runtime.includes('aria-modal="false"') && runtime.includes("aria-live=\"polite\""));
assert(runtime.includes("No escribas credenciales") && knowledge.includes("no firma") && knowledge.includes("no presenta"));
assert(!runtime.includes("fetch(") && !runtime.includes("localStorage") && !runtime.includes("window.MOCK"), "La guía local no debe acceder a red o datos tenant");
assert(styles.includes(".help-assistant-launcher") && styles.includes(".help-assistant-panel") && styles.includes("bottom: 84px"));
assert(html.includes("help-assistant-knowledge.js") && html.includes("help-assistant.js"));
console.log(JSON.stringify({ topics: 12, externalData: false, floating: true, accessible: true, status: "passed" }, null, 2));
