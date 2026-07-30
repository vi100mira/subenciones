import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const directory = await fs.mkdtemp(path.join(os.tmpdir(), "private-radar-gate-"));
const catalogPath = path.join(directory, "catalog.json");
const scanPath = path.join(directory, "scan.json");
const outputPath = path.join(directory, "output.json");
const source = { id: "demo", name: "Fundación Demo 2026", url: "https://demo.invalid", opportunity_status: "source_index", deadline_text: "Consultar", deadline_confidence: "uncertain" };
const reviewSource = { id: "review", name: "FundaciÃ³n En RevisiÃ³n 2026", url: "https://review.invalid", opportunity_status: "source_index", deadline_text: "Consultar", deadline_confidence: "uncertain" };
await fs.writeFile(catalogPath, JSON.stringify({ catalog: {}, sources: [source, reviewSource] }));
await fs.writeFile(scanPath, JSON.stringify({ scanned_at: "2026-07-13T00:00:00Z", sources_scanned: 1, results: [{
  id: "demo", status: "evidence_candidate", evidence_complete: true, basis_confidence: { level: "high" },
  status_facts: { status: "Abierta", closing: "31 de julio de 2026" }, verification_url: "https://demo.invalid/bases.pdf",
  best_evidence: { document: { sha256: "abc", extracted_text: "La memoria tendrá una extensión máxima de cuatro (4) páginas.", page_evidence: [{ page: 3, text: "La memoria tendrá una extensión máxima de cuatro (4) páginas." }] } }
}, {
  id: "review", status: "evidence_candidate", evidence_complete: true, basis_confidence: { level: "medium" },
  status_facts: { status: "Abierta" }, verification_url: "https://review.invalid/bases.pdf", review_reason: "missing_publishable_deadline_or_status",
  best_evidence: { content_sha256: "def", evidence_excerpt: "Bases oficiales sin cierre estructurado." }
}] }));
await execFileAsync(process.execPath, ["scripts/platform/apply-open-funder-scan.mjs", `--catalog=${catalogPath}`, `--scan=${scanPath}`, `--output=${outputPath}`]);
const output = JSON.parse(await fs.readFile(outputPath, "utf8"));
assert.equal(output.sources[0].live_evidence_gate, "passed");
assert.equal(output.sources[0].opportunity_status, "open");
assert.equal(output.sources[0].proposal_constraints.limits[0].value, 4);
assert.equal(output.review_candidates.length, 1);
assert.equal(output.review_candidates[0].publication_reason, "missing_publishable_deadline_or_status");
const { stdout } = await execFileAsync(process.execPath, ["scripts/platform/import-open-funders.mjs", `--catalog=${outputPath}`]);
assert.equal(JSON.parse(stdout).retainedReviewCandidates, 1);
await fs.rm(directory, { recursive: true, force: true });
console.log(JSON.stringify({ assertions: 6, status: "passed" }, null, 2));
