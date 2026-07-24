import assert from "node:assert/strict";
import fs from "node:fs";

const required = [
  ["docs/documentation-index.md", ["functional-specification.md", "source-map.md", "arquitectura-actual-del-sistema.md"]],
  ["docs/product/prd.md", ["Problem Statement", "Target Users", "Success Metrics"]],
  ["docs/product/data-governance-brief.md", ["Data Classification", "Red Lines"]],
  ["docs/product/source-map.md", ["Fuentes públicas", "Política incremental", "Riesgos de acceso"]],
  ["docs/product/app-flow.md", ["Alta y perfil", "Radar y encaje", "Puertas humanas"]],
  ["docs/product/functional-specification.md", ["Roles", "Ciclo funcional", "Criterios de aceptación"]],
  ["docs/architecture/arquitectura-actual-del-sistema.md", ["Vista gráfica", "Qué es asíncrono y qué no", "Estado real de los agentes"]],
  ["docs/architecture/data-model-reference.md", ["Fronteras", "Entidades principales", "Invariantes"]],
  ["docs/product/mvp-execution-plan.md", ["Objective", "Acceptance"]]
];

for (const [file, headings] of required) {
  assert(fs.existsSync(file), `Falta el documento canónico ${file}`);
  const text = fs.readFileSync(file, "utf8");
  headings.forEach((heading) => assert(text.includes(heading), `${file} no cubre ${heading}`));
}

const index = fs.readFileSync("README.md", "utf8");
assert(index.includes("documentation-index.md") && index.includes("functional-specification.md") && index.includes("data-model-reference.md"));
console.log(JSON.stringify({ documents: required.length, canonicalIndex: true, status: "passed" }, null, 2));
