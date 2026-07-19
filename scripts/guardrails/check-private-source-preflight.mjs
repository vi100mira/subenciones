import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.window = {};
await import(`../../prototype/private-source-preflight.js?check=${Date.now()}`);
const policy = window.PrivateSourcePreflight;

assert.equal(policy.assess({ totalFiles: 0, supportedFiles: 0, supportedBytes: 0 }).status, "blocked");
assert.equal(policy.assess({ totalFiles: 9, supportedFiles: 0, supportedBytes: 0 }).status, "blocked");
assert.equal(policy.assess({ totalFiles: 2, supportedFiles: 1, supportedBytes: 20_000 }).status, "review");
assert.equal(policy.assess({ totalFiles: 2, supportedFiles: 1, supportedBytes: 20_000 }, true).status, "ready_limited");
assert.equal(policy.assess({ totalFiles: 4, supportedFiles: 3, supportedBytes: 180_000 }).status, "ready");
const localSummary = await policy.summarizeDirectoryHandle({
  name: "PROYECTOS",
  async *values() {
    yield { kind: "file", name: "memoria.pdf", getFile: async () => ({ size: 120_000 }) };
    yield { kind: "file", name: "nota.txt", getFile: async () => ({ size: 50 }) };
    yield { kind: "directory", name: "anexos", async *values() {
      yield { kind: "file", name: "presupuesto.xlsx", getFile: async () => ({ size: 60_000 }) };
    } };
  }
});
assert.deepEqual(localSummary, { rootName: "PROYECTOS", totalFiles: 3, supportedFiles: 2, supportedBytes: 180_000 });

const endpoint = fs.readFileSync("api/private-source-preflight.ts", "utf8");
const ingestion = fs.readFileSync("api/ingestion-dispatch.ts", "utf8");
const governance = fs.readFileSync("api/tenant-agent-governance.ts", "utf8");
const backendPolicy = fs.readFileSync("src/privateSourcePreflight.ts", "utf8");
for (const expected of ["local_simulation", "google_drive", "microsoft_graph", "tenant_private", "ai_calls: 0"]) {
  assert.ok(endpoint.includes(expected), `El preanálisis común no cubre ${expected}`);
}
assert.ok(backendPolicy.includes('"blocked" | "review" | "ready" | "ready_limited"'), "Faltan estados del guardrail");
assert.ok(ingestion.includes("storedPrivatePreflightCanQueue"), "La cola no exige preanálisis aprobado");
assert.ok(governance.includes("storedPrivatePreflightCanQueue"), "La aprobación no exige preanálisis aprobado");

console.log(JSON.stringify({
  ok: true, modalities: ["local", "google_drive", "sharepoint"], aiCalls: 0,
  outcomes: ["blocked", "review", "ready_limited", "ready"], backendQueueGate: true
}, null, 2));
