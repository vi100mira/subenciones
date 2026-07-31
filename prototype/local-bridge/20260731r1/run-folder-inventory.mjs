import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(process.argv.slice(2).map((value) => { const [key, ...rest] = value.replace(/^--/, "").split("="); return [key, rest.join("=")]; }));
const root = path.resolve(args.get("folder") || ""); const endpoint = args.get("endpoint") || ""; const token = args.get("session-token") || ""; const tenantId = args.get("tenant-id") || "";
const supported = new Set([".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg"]);
const sha = async (file) => crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
async function files(dir, rows = []) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) await files(file, rows); else if (entry.isFile() && supported.has(path.extname(entry.name).toLowerCase()) && rows.length < 5000) rows.push(file); } return rows; }
if (!root || !endpoint || !token || !tenantId || !(await fs.stat(root)).isDirectory()) throw new Error("La carpeta o la sesión temporal no son válidas");
const documents = await Promise.all((await files(root)).map(async (file) => ({ documentId: crypto.createHash("sha256").update(path.relative(root, file)).digest("hex").slice(0, 32), relativePath: path.relative(root, file).split(path.sep).join("/"), sourceSha256: await sha(file), extension: path.extname(file).toLowerCase(), dataClass: "internal", candidate: /\.(pdf|docx|xlsx)$/i.test(file), decision: "pending", safeFieldKeys: [], blockedFieldKeys: [] })));
const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Bridge ${token}` }, body: JSON.stringify({ documents, proposals: [], metrics: { documentsScanned: documents.length } }) });
const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result?.error || `El servidor rechazó el inventario (${response.status})`);
console.log(JSON.stringify({ ok: true, documents: documents.length, proposals: 0, result: result.data || result }));
