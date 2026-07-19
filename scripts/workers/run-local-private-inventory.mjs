import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const execFileAsync = promisify(execFile);
const args = new Map(process.argv.slice(2).map((arg) => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=") || "true"]; }));
const tenantId = args.get("tenant-id");
const sourceId = args.get("source-id");
const corpus = path.resolve(args.get("corpus") || "");
const entityName = args.get("entity-name") || "Entidad";
const watch = args.get("watch") === "true";

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of (await fs.readFile(file, "utf8")).split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    } catch { /* configuración local opcional */ }
  }
}

function client() {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta la configuración local de Supabase para el puente privado.");
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
}

async function validateScope(db) {
  if (!tenantId || !sourceId || !args.get("corpus")) throw new Error("Faltan --tenant-id, --source-id o --corpus.");
  const stats = await fs.stat(corpus);
  if (!stats.isDirectory()) throw new Error("La carpeta autorizada no está disponible.");
  const [sourceResult, consentResult] = await Promise.all([
    db.from("source_connections").select("id, kind, scope, status, config_json").eq("id", sourceId).eq("tenant_id", tenantId).maybeSingle(),
    db.from("tenant_data_consents").select("id, scope_json").eq("tenant_id", tenantId).eq("consent_type", "manual_upload").eq("status", "granted").order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);
  if (sourceResult.error) throw sourceResult.error;
  if (consentResult.error) throw consentResult.error;
  const source = sourceResult.data; const consent = consentResult.data;
  if (!source || source.kind !== "local_simulation" || source.scope !== "tenant_private" || source.status !== "active") throw new Error("La fuente local privada no está activa para este tenant.");
  if (!["ready", "ready_limited"].includes(source.config_json?.preflight?.status)) throw new Error("La fuente local no ha superado la criba previa sin IA.");
  const scope = consent?.scope_json || {};
  if (!consent || scope.readOnly !== true || scope.externalTransfer !== false || scope.includePersonalData !== false || scope.includeSensitiveData !== false) throw new Error("El consentimiento local no conserva un alcance seguro.");
}

async function claim(db) {
  const { data: queued, error } = await db.from("ingestion_runs").select("id, requested_by, created_at")
    .eq("tenant_id", tenantId).eq("source_connection_id", sourceId).eq("status", "queued")
    .order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  if (!queued?.length) return null;
  const current = queued[0]; const now = new Date().toISOString();
  const { data, error: claimError } = await db.from("ingestion_runs").update({ status: "running", started_at: now, error: null })
    .eq("id", current.id).eq("tenant_id", tenantId).eq("status", "queued").select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!data) return null;
  for (const stale of queued.slice(1)) {
    await db.from("ingestion_runs").update({ status: "cancelled", error: "Sustituida por una ejecución más reciente.", finished_at: now }).eq("id", stale.id).eq("tenant_id", tenantId);
    await audit(db, stale, "private_ingestion.cancelled", { reason: "superseded_stale_queue", replacement_run_id: current.id });
  }
  await audit(db, current, "private_ingestion.started", { processing: "local_only", external_ai_calls: 0 });
  return current;
}

async function audit(db, run, action, detail) {
  const { error } = await db.from("audit_events").insert({ tenant_id: tenantId, actor_user_id: run.requested_by || null,
    actor_label: "local-private-inventory-worker", action, target_type: "ingestion_run", target_id: run.id,
    detail_json: { source_connection_id: sourceId, ...detail } });
  if (error) throw error;
}

async function analyze(run) {
  const root = path.join(os.tmpdir(), "insertia-private-inventory", run.id);
  await fs.rm(root, { recursive: true, force: true }); await fs.mkdir(root, { recursive: true });
  const inventoryPath = path.join(root, "inventory.json"); const masterRoot = path.join(root, "master");
  const privateIndexRoot = process.env.PRIVATE_INDEX_ROOT || path.join(process.env.LOCALAPPDATA || os.homedir(), "Insertia", "private-index");
  const quarantinePath = path.join(privateIndexRoot, tenantId, sourceId, "quarantine.sqlite3");
  const python = process.env.PYTHON_BIN || "python";
  await execFileAsync(python, ["scripts/private-corpus/inventory_document_templates.py", "--corpus", corpus, "--out", inventoryPath, "--tenant", tenantId], { timeout: 30 * 60_000, maxBuffer: 2_000_000 });
  await execFileAsync(python, ["scripts/private-corpus/build_master_draft.py", "--corpus", corpus, "--out", masterRoot, "--tenant", tenantId, "--entity-name", entityName], { timeout: 30 * 60_000, maxBuffer: 2_000_000 });
  const { stdout: quarantineOutput } = await execFileAsync(python, ["scripts/private-corpus/build_quarantine_index.py", "--corpus", corpus, "--inventory", inventoryPath, "--out", quarantinePath, "--tenant", tenantId, "--source-id", sourceId], { timeout: 30 * 60_000, maxBuffer: 2_000_000 });
  const inventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
  const masterPath = path.join(masterRoot, "master-facts-proposals.json");
  const masterBytes = await fs.readFile(masterPath); const master = JSON.parse(masterBytes.toString("utf8"));
  const quarantine = JSON.parse(quarantineOutput.trim());
  if (inventory.tenant !== tenantId || master.tenant !== tenantId || inventory.privacy?.external_ai_calls !== 0 || master.privacy?.external_ai_calls !== 0 || quarantine.external_ai_calls !== 0) throw new Error("El resultado local no supera el contrato de aislamiento y coste.");
  return { root, inventory, master, quarantine, artifactSha: crypto.createHash("sha256").update(masterBytes).digest("hex") };
}

async function persist(db, run, result) {
  const { inventory, master, quarantine, artifactSha } = result;
  const byId = new Map(inventory.documents.map((item) => [item.document_id, item.source_sha256]));
  const byPath = new Map(inventory.documents.map((item) => [item.relative_path, item.source_sha256]));
  const proposals = [];
  for (const [fieldKey, item] of Object.entries(master.institutional_facts || {})) if (item?.value) proposals.push({ fieldKey, value: String(item.value), sourceSha: byPath.get(item.evidence?.[0]) || artifactSha, confidence: item.status === "proposed" ? "high" : "medium" });
  for (const [fieldKey, item] of Object.entries(master.section_proposals || {})) if (item?.text) proposals.push({ fieldKey, value: String(item.text), sourceSha: byId.get(item.document_id) || artifactSha, confidence: Number(item.score || 0) >= 30 ? "high" : "medium" });
  await db.from("tenant_profile_suggestions").update({ status: "superseded" }).eq("tenant_id", tenantId).eq("source_type", "uploaded_document").eq("status", "pending");
  const rows = proposals.map((item) => ({ tenant_id: tenantId, field_key: item.fieldKey, suggested_value: item.value.slice(0, 4000), source_type: "uploaded_document",
    source_ref: `local-inventory:${item.sourceSha.slice(0, 16)}`, source_sha256: item.sourceSha, confidence: item.confidence, status: "pending",
    evidence_excerpt: `Documento local autorizado · huella ${item.sourceSha.slice(0, 12)} · contenido extraído sin IA`,
    metadata_json: { data_class: "internal", allowed_uses: ["matching", "drafting", "forms"], personal_data_included: false, sensitive_data_included: false,
      source_connection_id: sourceId, ingestion_run_id: run.id, local_only_extraction: true, external_ai_calls: 0 } }));
  if (rows.length) {
    const { error: insertError } = await db.from("tenant_profile_suggestions").insert(rows); if (insertError) throw insertError;
  }
  const decisions = inventory.metrics.decisions || {}; const now = new Date().toISOString();
  const { data: source } = await db.from("source_connections").select("config_json").eq("id", sourceId).eq("tenant_id", tenantId).single();
  await db.from("source_connections").update({ config_json: { ...(source?.config_json || {}), lastInventory: { runId: run.id, completedAt: now,
    documentsScanned: inventory.metrics.documents_scanned, templateCandidates: inventory.metrics.template_candidates, blockedSensitive: decisions.blocked_sensitive || 0,
    proposalCount: rows.length, coveragePercent: master.metrics.coverage_percent, personalParagraphsExcluded: master.metrics.personal_paragraphs_excluded,
    extractionErrors: inventory.metrics.extraction_errors, externalAiCalls: 0, contentStoredRemotely: false, localArtifactSha256: artifactSha,
    quarantineIndex: { chunks: quarantine.chunks_quarantined, documents: quarantine.documents_indexed, status: "prepared_pending_review",
      retrievalMode: "local_fts_quarantine", embeddingState: quarantine.embedding_state, localOnly: true, indexSha256: quarantine.index_sha256 } } }, updated_at: now }).eq("id", sourceId).eq("tenant_id", tenantId);
  await db.from("ingestion_runs").update({ status: "completed", scanned: inventory.metrics.documents_scanned, inserted: rows.length,
    skipped: Math.max(0, inventory.metrics.documents_scanned - inventory.metrics.template_candidates), blocked: decisions.blocked_sensitive || 0,
    error: null, finished_at: now }).eq("id", run.id).eq("tenant_id", tenantId);
  await audit(db, run, "private_ingestion.completed", { documents_scanned: inventory.metrics.documents_scanned, template_candidates: inventory.metrics.template_candidates,
    proposal_count: rows.length, blocked_sensitive: decisions.blocked_sensitive || 0, personal_paragraphs_excluded: master.metrics.personal_paragraphs_excluded,
    coverage_percent: master.metrics.coverage_percent, quarantine_chunks: quarantine.chunks_quarantined,
    quarantine_status: "prepared_pending_review", embeddings_created: 0, external_ai_calls: 0,
    content_copied_to_audit: false, local_artifact_sha256: artifactSha, quarantine_index_sha256: quarantine.index_sha256 });
  return { documents: inventory.metrics.documents_scanned, proposals: rows.length };
}

async function execute(db) {
  const run = await claim(db); if (!run) return false;
  let result;
  try {
    result = await analyze(run); const summary = await persist(db, run, result);
    console.log(JSON.stringify({ mode: "completed", runId: run.id, ...summary, externalAiCalls: 0 }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await db.from("ingestion_runs").update({ status: "failed", error: message.slice(0, 4000), finished_at: new Date().toISOString() }).eq("id", run.id).eq("tenant_id", tenantId);
    await audit(db, run, "private_ingestion.failed", { error: message.slice(0, 500), external_ai_calls: 0 }).catch(() => {});
  } finally { if (result?.root) await fs.rm(result.root, { recursive: true, force: true }); }
  return true;
}

await loadEnv(); const db = client(); await validateScope(db);
do { await execute(db); if (watch) await new Promise((resolve) => setTimeout(resolve, 10_000)); } while (watch);
