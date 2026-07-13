import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const execFileAsync = promisify(execFile);
const values = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const apply = values.get("apply") === "true";
const sourceUrl = "https://subvenciones-rag.vercel.app/sources#private-open-funders";

function loadEnv(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function prepareRuntime() {
  for (const file of [".env.local", ".env"]) {
    try { loadEnv(await fs.readFile(file, "utf8")); } catch { /* configuración local opcional */ }
  }
  const python = process.env.PYTHON_BIN || "python";
  await execFileAsync(python, ["-c", "import pypdf,pdfplumber,pypdfium2"], { timeout: 15000 });
  process.env.PYTHON_BIN = python;
  return { python };
}

function client() {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias para --apply=true.");
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
}

async function runNode(script, args) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [script, ...args], {
    env: process.env, timeout: 30 * 60 * 1000, maxBuffer: 30_000_000
  });
  if (stderr?.trim()) process.stderr.write(stderr);
  return JSON.parse(stdout);
}

async function claim(supabase) {
  const { data: source, error: sourceError } = await supabase.from("platform_sources")
    .select("id").eq("kind", "private_funder").eq("url", sourceUrl).eq("status", "active").single();
  if (sourceError) throw sourceError;
  const { data: queued, error: queueError } = await supabase.from("platform_ingestion_campaigns")
    .select("id, campaign_key").eq("platform_source_id", source.id).eq("status", "queued")
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const { data, error } = await supabase.from("platform_ingestion_campaigns")
    .update({ status: "running", started_at: new Date().toISOString(), error: null })
    .eq("id", queued.id).eq("status", "queued").select("id, campaign_key").maybeSingle();
  if (error) throw error;
  return data ? { ...data, sourceId: source.id } : null;
}

async function complete(supabase, campaign, status, fields = {}) {
  await supabase.from("platform_ingestion_campaigns").update({ status, finished_at: new Date().toISOString(), ...fields }).eq("id", campaign.id);
  await supabase.from("platform_sources").update({ health_status: status === "completed" ? "healthy" : "error", last_synced_at: new Date().toISOString() }).eq("id", campaign.sourceId);
}

async function main() {
  const runtime = await prepareRuntime();
  const supabase = apply ? client() : null;
  const campaign = supabase ? await claim(supabase) : { id: "dry-run", campaign_key: "private-open-funders:dry-run" };
  if (!campaign) return console.log(JSON.stringify({ mode: "idle", message: "No hay campañas privadas en cola." }, null, 2));
  const workDir = path.join(".tmp", `private-funder-radar-${campaign.id}`);
  const scan = path.join(workDir, "scan.json");
  const enriched = path.join(workDir, "enriched-catalog.json");
  await fs.mkdir(workDir, { recursive: true });
  try {
    const scanArgs = [`--write=${scan}`, `--page-budget=${values.get("page-budget") || 10}`];
    if (values.get("limit")) scanArgs.push(`--limit=${values.get("limit")}`);
    await runNode("scripts/platform/deep-scan-open-funders.mjs", scanArgs);
    const gate = await runNode("scripts/platform/apply-open-funder-scan.mjs", [`--scan=${scan}`, `--output=${enriched}`]);
    const imported = await runNode("scripts/platform/import-open-funders.mjs", [`--catalog=${enriched}`, ...(apply ? ["--apply"] : [])]);
    let changes = { summary: {} };
    let alerts = { summary: {} };
    if (apply) {
      changes = await runNode("scripts/platform/detect-open-funder-changes.mjs", [`--catalog=${enriched}`, "--apply"]);
      alerts = await runNode("scripts/platform/generate-tenant-change-alerts.mjs", ["--apply"]);
      await complete(supabase, campaign, "completed", { scanned: gate.scanned, changed: changes.summary?.changed || 0, skipped: gate.blocked_or_monitor, failed: 0 });
    }
    console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", campaignId: campaign.id, gate, imported, changes: changes.summary, alerts: alerts.summary, runtime, workDir }, null, 2));
  } catch (error) {
    if (supabase) await complete(supabase, campaign, "failed", { failed: 1, error: error instanceof Error ? error.message.slice(0, 4000) : "Error inesperado" });
    throw error;
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
