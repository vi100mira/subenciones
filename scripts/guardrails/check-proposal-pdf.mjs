import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const source = await fs.readFile("src/proposalPdf.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText;
const temporary = path.resolve(".tmp", `proposal-pdf-guard-${process.pid}.mjs`);
await fs.mkdir(path.dirname(temporary), { recursive: true });
await fs.writeFile(temporary, compiled, "utf8");

try {
  const { renderProposalPdf, validateRenderedPages } = await import(`${new URL(`file:///${temporary.replace(/\\/g, "/")}`).href}?v=${Date.now()}`);
  const rules = [{ kind: "font_size_points", value: 11 }, { kind: "line_spacing", value: "1.5" }];
  let eightPagePdf = null;
  for (let lines = 80; lines <= 260; lines += 1) {
    const rendered = await renderProposalPdf("Memoria técnica", [{
      title: "Desarrollo",
      lines: Array.from({ length: lines }, (_, index) => `Apartado ${index + 1}: contenido verificable.`)
    }], rules);
    if (rendered.pageCount === 8) { eightPagePdf = rendered; break; }
  }
  assert.ok(eightPagePdf, "La fixture debe producir exactamente ocho páginas.");
  assert.throws(() => validateRenderedPages(eightPagePdf.pageCount, [{ unit: "pages", value: 4 }]), /8 paginas.*maximo oficial es 4/);

  const shortPdf = await renderProposalPdf("Memoria técnica", [{ title: "Resumen", lines: ["Contenido breve y revisable."] }], rules);
  assert.equal(shortPdf.pageCount, 1);
  assert.doesNotThrow(() => validateRenderedPages(shortPdf.pageCount, [{ unit: "pages", value: 4 }]));
  console.log(JSON.stringify({ assertions: 4, eightPageCaseBlocked: true, status: "passed" }, null, 2));
} finally {
  await fs.rm(temporary, { force: true });
}
