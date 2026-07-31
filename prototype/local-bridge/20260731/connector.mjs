import crypto from "node:crypto";
import http from "node:http";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile); const root = path.dirname(fileURLToPath(import.meta.url));
const folders = new Map(); const port = Number(process.env.INSERTIA_LOCAL_BRIDGE_PORT || 43173);
const originAllowed = (origin = "") => /^https:\/\/subvenciones-rag\.vercel\.app$/i.test(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin);
const reply = (res, status, body, origin) => { if (originAllowed(origin)) res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary", "Origin"); res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
const body = (req) => new Promise((resolve, reject) => { let value = ""; req.on("data", (part) => { value += part; if (value.length > 65_536) reject(new Error("Solicitud demasiado grande")); }); req.on("end", () => { try { resolve(JSON.parse(value || "{}")); } catch { reject(new Error("JSON no válido")); } }); });
async function pickFolder() {
  const script = "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='Selecciona la carpeta autorizada para Insertia'; if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.SelectedPath)}";
  const { stdout } = await exec("powershell.exe", ["-NoProfile", "-STA", "-Command", script], { windowsHide: false }); const folder = stdout.trim();
  if (!folder) throw new Error("No se seleccionó ninguna carpeta"); const id = crypto.randomBytes(18).toString("base64url");
  folders.set(id, { folder, expires: Date.now() + 15 * 60_000 }); return { folderId: id, rootName: path.basename(folder) };
}
function endpointAllowed(value) { try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "subvenciones-rag.vercel.app" || url.protocol === "http:" && /^(127\.0\.0\.1|localhost)$/.test(url.hostname); } catch { return false; } }
async function inventory(input) {
  const picked = folders.get(String(input.folderId || "")); if (!picked || picked.expires < Date.now()) throw new Error("La selección de carpeta ha caducado; vuelve a elegirla");
  if (!input.tenantId || !input.sessionToken || !endpointAllowed(input.endpoint)) throw new Error("La sesión del puente no es válida");
  const runner = path.join(root, "scripts", "local-bridge", "run-folder-inventory.mjs");
  const args = [runner, `--folder=${picked.folder}`, `--tenant-id=${input.tenantId}`, `--endpoint=${input.endpoint}`, `--session-token=${input.sessionToken}`, `--entity-name=${String(input.entityName || "Entidad")}`];
  const { stdout } = await exec(process.execPath, args, { cwd: root, timeout: 31 * 60_000, maxBuffer: 2_000_000, windowsHide: true }); folders.delete(String(input.folderId)); return JSON.parse(stdout.trim() || "{}");
}
const server = http.createServer(async (req, res) => {
  const origin = String(req.headers.origin || ""); if (req.method === "OPTIONS") { if (!originAllowed(origin)) return reply(res, 403, { ok: false, error: "Origen no autorizado" }, origin); res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "content-type"); return reply(res, 204, {}, origin); }
  if (req.method === "GET" && req.url === "/health") return reply(res, 200, { ok: true, version: "20260731", port }, origin);
  if (req.method !== "POST" || !originAllowed(origin)) return reply(res, 403, { ok: false, error: "Origen o método no autorizado" }, origin);
  try { const input = await body(req); if (req.url === "/choose-folder") return reply(res, 200, { ok: true, data: await pickFolder() }, origin); if (req.url === "/inventory") return reply(res, 200, { ok: true, data: await inventory(input) }, origin); return reply(res, 404, { ok: false, error: "Ruta no disponible" }, origin); } catch (error) { return reply(res, 400, { ok: false, error: error instanceof Error ? error.message : "No se pudo completar la operación local" }, origin); }
});
server.listen(port, "127.0.0.1", () => console.log(`Insertia Local Bridge escuchando en 127.0.0.1:${port}`));
