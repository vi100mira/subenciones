import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const execFileAsync = promisify(execFile);
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const apply = args.get("apply") === "true";
const runId = apply ? "pending" : "dry-run";
const pages = args.get("pages") || (apply ? "2" : "1");
const pageSize = args.get("page-size") || (apply ? "50" : "10");
const maxDetails = args.get("max-details") || (apply ? "300" : "25");
const campaignName = args.get("campaign") || "municipal-social";
if (!["municipal-social", "general-social"].includes(campaignName)) throw new Error(`Campaña pública no admitida: ${campaignName}`);
const sourceUrl = `https://www.infosubvenciones.es/bdnstrans/api#${campaignName}`;

function loadEnvFile(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function maybeReadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      loadEnvFile(await fs.readFile(file, "utf8"));
    } catch {
      // Optional local worker configuration.
    }
  }
}

async function verifyWorkerRuntime() {
  const python = process.env.PYTHON_BIN || "python";
  try {
    const { stdout } = await execFileAsync(python, ["-c", "import json,sys; import pypdf,pdfplumber,pypdfium2; print(json.dumps({'python':sys.version.split()[0]}))"], {
      timeout: 15000,
      maxBuffer: 100_000
    });
    const probe = JSON.parse(stdout.trim());
    process.env.PYTHON_BIN = python;

    let ocrMode = "unavailable";
    const tesseract = process.env.TESSERACT_CMD || "tesseract";
    try {
      await execFileAsync(tesseract, ["--version"], { timeout: 10000, maxBuffer: 200_000 });
      ocrMode = "tesseract";
    } catch {
      if (process.platform === "win32") {
        await fs.access("scripts/workers/ocr-image-windows.ps1");
        ocrMode = "windows_native";
      }
    }
    if (apply && ocrMode === "unavailable") {
      throw new Error("El worker productivo necesita Tesseract o el fallback OCR nativo de Windows para PDF escaneados.");
    }
    return { python: probe.python, pythonCommand: python, ocrMode };
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("La sonda Python devolvio una respuesta no valida.");
    if (error instanceof Error && error.message.includes("worker productivo")) throw error;
    throw new Error(`Runtime PDF no disponible en ${python}. Configura PYTHON_BIN con pypdf, pdfplumber y pypdfium2.`);
  }
}

function supabaseClient() {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias para --apply.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket }
  });
}

async function runNode(script, scriptArgs, env = process.env) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [script, ...scriptArgs], {
    env,
    maxBuffer: 25_000_000,
    timeout: 20 * 60 * 1000
  });
  if (stderr?.trim()) process.stderr.write(stderr);
  return stdout;
}

async function claimCampaign(supabase) {
  const { data: source, error: sourceError } = await supabase
    .from("platform_sources")
    .select("id")
    .eq("kind", "bdns")
    .eq("url", sourceUrl)
    .eq("status", "active")
    .single();
  if (sourceError) throw sourceError;

  const { data: queued, error: queueError } = await supabase
    .from("platform_ingestion_campaigns")
    .select("id, campaign_key")
    .eq("platform_source_id", source.id)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;

  const { data: claimed, error: claimError } = await supabase
    .from("platform_ingestion_campaigns")
    .update({ status: "running", started_at: new Date().toISOString(), error: null })
    .eq("id", queued.id)
    .eq("status", "queued")
    .select("id, campaign_key")
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed ? { ...claimed, sourceId: source.id } : null;
}

async function executePipeline(workDir) {
  await fs.mkdir(workDir, { recursive: true });
  const dataset = path.join(workDir, "municipal.json");
  const prototype = path.join(workDir, "municipal.js");
  const catalog = path.join(workDir, "bases-catalog.json");
  const scan = path.join(workDir, "bases-scan.json");
  const enriched = path.join(workDir, "municipal-enriched.json");
  const enrichedPrototype = path.join(workDir, "municipal-enriched.js");

  await runNode("scripts/radar/fetch-bdns-latest.mjs", [
    `--campaign=${campaignName}`, `--pages=${pages}`, `--page-size=${pageSize}`,
    `--max-details=${maxDetails}`, "--detail-delay-ms=250", `--out-dir=${workDir}`,
    `--output-name=${path.basename(dataset)}`, `--prototype-out=${prototype}`
  ]);
  if (apply) await runNode("scripts/platform/apply-approved-basis-sources.mjs", [`--input=${dataset}`, `--output=${dataset}`]);
  await runNode("scripts/radar/prepare-bdns-bases-scan.mjs", [`--input=${dataset}`, `--output=${catalog}`]);
  await runNode("scripts/platform/deep-scan-open-funders.mjs", [`--catalog=${catalog}`, `--write=${scan}`]);
  await runNode("scripts/radar/apply-bdns-bases-scan.mjs", [
    `--input=${dataset}`, `--scan=${scan}`, `--output=${enriched}`, `--prototype-out=${enrichedPrototype}`
  ]);
  const importArgs = [`--input=${enriched}`];
  if (apply) importArgs.push("--apply=true");
  const importOutput = JSON.parse(await runNode("scripts/platform/import-bdns-radar.mjs", importArgs));
  const interpretationArgs = [`--scan=${scan}`];
  if (apply) interpretationArgs.push("--apply=true");
  const interpretationOutput = JSON.parse(await runNode("scripts/platform/queue-bases-interpretations.mjs", interpretationArgs));
  const discoveryArgs = [`--input=${enriched}`, "--max-opportunities=20", "--max-seeds=3", "--max-pages=5", "--timeout-ms=8000"];
  if (apply) discoveryArgs.push("--apply=true");
  const discoveryOutput = JSON.parse(await runNode("scripts/platform/discover-supplementary-basis-sources.mjs", discoveryArgs));
  return { enriched: JSON.parse(await fs.readFile(enriched, "utf8")), importOutput, interpretationOutput, discoveryOutput, workDir };
}

async function main() {
  await maybeReadEnv();
  const runtime = await verifyWorkerRuntime();
  const supabase = apply ? supabaseClient() : null;
  const campaign = supabase ? await claimCampaign(supabase) : { id: runId, campaign_key: `${campaignName}:dry-run` };
  if (!campaign) {
    console.log(JSON.stringify({ mode: "idle", message: `No hay campañas ${campaignName} en cola.` }, null, 2));
    return;
  }

  const workDir = path.join(".tmp", `municipal-radar-${campaign.id}`);
  try {
    const result = await executePipeline(workDir);
    const quality = result.enriched.quality || {};
    const summary = {
      mode: apply ? "applied" : "dry-run",
      radar: campaignName,
      campaignId: campaign.id,
      campaignKey: campaign.campaign_key,
      scanned: quality.normalizedCount || 0,
      eligibleLive: result.importOutput.eligibleLive || 0,
      rejected: result.importOutput.rejectedByLiveEvidenceGate || 0,
      basesExtracted: quality.basesExtracted || 0,
      basesInterpretations: result.interpretationOutput,
      supplementaryBasisDiscovery: result.discoveryOutput,
      runtime,
      workDir
    };
    if (supabase) {
      const { error } = await supabase.from("platform_ingestion_campaigns").update({
        status: "completed",
        scanned: summary.scanned,
        changed: summary.eligibleLive,
        skipped: summary.rejected,
        failed: 0,
        finished_at: new Date().toISOString()
      }).eq("id", campaign.id);
      if (error) throw error;
      await supabase.from("platform_sources").update({ health_status: "healthy", last_synced_at: new Date().toISOString() }).eq("id", campaign.sourceId);
    }
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (supabase) {
      await supabase.from("platform_ingestion_campaigns").update({
        status: "failed", failed: 1, error: error instanceof Error ? error.message.slice(0, 4000) : "Error inesperado", finished_at: new Date().toISOString()
      }).eq("id", campaign.id);
      await supabase.from("platform_sources").update({ health_status: "error" }).eq("id", campaign.sourceId);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
