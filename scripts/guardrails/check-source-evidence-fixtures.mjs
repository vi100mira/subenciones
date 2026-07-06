import fs from "node:fs";
import vm from "node:vm";

const expectedCaixaBasis = "https://fundacionlacaixa.org/documents/d/guest/convocatoria-social-comunitat-valenciana-2026-bases-pdf";
const expectedBancajaBasis = "https://www.fundacionbancaja.es/wp-content/uploads/2026/04/Bases-13a-Convocatoria-Capaces.pdf";
const catalog = JSON.parse(fs.readFileSync("data/private-open-funders/platform-open-funders-v1.json", "utf8"));
const intakeTemplate = JSON.parse(fs.readFileSync("data/private-open-funders/source-intake-template-v1.json", "utf8"));
const methodology = fs.readFileSync("docs/product/private-open-entity-search-methodology.md", "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function privateRows() {
  const code = fs.readFileSync("prototype/private-radar-data.js", "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "prototype/private-radar-data.js" });
  return sandbox.window.PRIVATE_OPEN_OPPORTUNITIES || [];
}

const caixaSource = catalog.sources.find((source) => source.id === "fundacion-la-caixa-comunitat-valenciana-2026");
assert(Boolean(caixaSource), "Missing curated La Caixa Comunitat Valenciana source");
assert(caixaSource?.basis_url === expectedCaixaBasis, "La Caixa curated source must point to the exact 2026 bases PDF");
assert(caixaSource?.navigation_path?.at(-1)?.url === expectedCaixaBasis, "La Caixa navigation path must end at the exact bases PDF");
assert(caixaSource?.status_facts?.status === "Cerrada", "La Caixa source must preserve the official closed status");
assert(caixaSource?.status_facts?.closing?.includes("26 de marzo de 2026"), "La Caixa source must preserve the closing date");

const onceGeneral = catalog.sources.find((source) => source.id === "fundacion-once-convocatoria-general");
assert(onceGeneral?.opportunity_status !== "open", "ONCE general 2026 must not be active after its 2026-06-30 deadline");

const caixaPrivateRow = privateRows().find((row) => row.id === "caixabank-accion-social");
assert(Boolean(caixaPrivateRow), "Missing La Caixa private opportunity row");
assert(caixaPrivateRow?.title === "Convocatoria Social Comunitat Valenciana 2026", "Private row must show the concrete La Caixa call title");
assert(caixaPrivateRow?.deadlineStatus === "closed", "Private row must be closed, not live or uncertain");
assert(caixaPrivateRow?.basesUrl === expectedCaixaBasis, "Private row bases action must open the exact bases PDF");
assert(caixaPrivateRow?.documents?.some((doc) => doc.url === caixaPrivateRow.officialUrl), "Private row must keep the official status page as evidence");

const bancajaSource = catalog.sources.find((source) => source.id === "fundacion-bancaja-social");
assert(Boolean(bancajaSource), "Missing curated Bancaja Capaces source");
assert(bancajaSource?.basis_url === expectedBancajaBasis, "Bancaja curated source must point to the exact Capaces bases PDF");
assert(bancajaSource?.navigation_path?.at(-1)?.url === expectedBancajaBasis, "Bancaja navigation path must end at the exact bases PDF");
assert(bancajaSource?.status_facts?.status === "Agotado plazo", "Bancaja source must preserve the official exhausted-deadline status");
assert(bancajaSource?.status_facts?.closing?.includes("20 de mayo"), "Bancaja source must preserve the May 20 closing date");

const bancajaPrivateRow = privateRows().find((row) => row.id === "fundacion-bancaja-social");
assert(Boolean(bancajaPrivateRow), "Missing Bancaja private opportunity row");
assert(bancajaPrivateRow?.deadlineStatus === "closed", "Bancaja private row must be closed, not live or uncertain");
assert(bancajaPrivateRow?.basesUrl === expectedBancajaBasis, "Bancaja private row bases action must open the exact bases PDF");
assert(bancajaPrivateRow?.officialUrl === bancajaSource?.url, "Bancaja private row must keep the official status page as evidence");

assert(methodology.includes("Unseen Entity Protocol"), "Private-open methodology must define the unseen entity protocol");
assert(methodology.includes("Search Stop Conditions"), "Private-open methodology must define search stop conditions");
assert(methodology.includes("Data Contract"), "Private-open methodology must define the data contract");
assert(intakeTemplate.schema === "private_open_source_intake_v1", "Private-open intake template schema is missing or wrong");
for (const field of ["id", "name", "url", "opportunity_status", "deadline_text", "basis_confidence", "navigation_path"]) {
  assert(Object.hasOwn(intakeTemplate.source || {}, field), `Private-open intake template missing source.${field}`);
}
for (const required of ["official source URL", "navigation path", "human review decision"]) {
  assert(intakeTemplate.required_before_tenant_alert?.includes(required), `Private-open intake template missing tenant-alert requirement: ${required}`);
}

if (failures.length) {
  console.error("Source evidence fixture check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Source evidence fixture check passed.");
