import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));
const tenantId = args.get("tenant-id");
const sourceId = args.get("source-id");
const runId = args.get("run-id");
const inventoryPath = args.get("inventory");

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

await loadEnv();
if (!tenantId || !sourceId || !runId || !inventoryPath) throw new Error("Faltan argumentos del backfill documental.");
const inventory = JSON.parse(await fs.readFile(path.resolve(inventoryPath), "utf8"));
if (inventory.tenant !== tenantId || inventory.privacy?.external_ai_calls !== 0) throw new Error("El inventario no pertenece al tenant o incumple privacidad.");
const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Falta configuración de Supabase.");
const db = createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
const [{ data: source }, { data: run }, { data: consent }] = await Promise.all([
  db.from("source_connections").select("id,kind,scope,status").eq("id", sourceId).eq("tenant_id", tenantId).maybeSingle(),
  db.from("ingestion_runs").select("id,status").eq("id", runId).eq("tenant_id", tenantId).eq("source_connection_id", sourceId).maybeSingle(),
  db.from("tenant_data_consents").select("id,scope_json").eq("tenant_id", tenantId).eq("consent_type", "manual_upload")
    .eq("status", "granted").order("created_at", { ascending: false }).limit(1).maybeSingle()
]);
const scope = consent?.scope_json || {};
if (!source || source.kind !== "local_simulation" || source.scope !== "tenant_private" || source.status !== "active") throw new Error("Fuente privada no válida.");
if (!run || run.status !== "completed") throw new Error("La ejecución de origen no está completada.");
if (!consent || scope.readOnly !== true || scope.externalTransfer !== false) throw new Error("Falta consentimiento local seguro.");
const { data: existing, error: existingError } = await db.from("source_documents")
  .select("external_id,metadata_json").eq("tenant_id", tenantId).eq("source_connection_id", sourceId);
if (existingError) throw existingError;
const reviews = new Map((existing || []).map((item) => [item.external_id, item.metadata_json?.review_status]));
const mime = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
const rows = inventory.documents.map((item) => {
  const externalId = `local-inventory:${item.document_id}`;
  return {
    tenant_id: tenantId, source_connection_id: sourceId, external_id: externalId,
    title: path.basename(item.relative_path), path: `private://${sourceId}/${item.document_id}`,
    mime_type: mime[item.extension] || "application/octet-stream", data_class: item.data_class,
    source_sha256: item.source_sha256, extracted_text: null,
    extraction_status: item.data_class === "sensitive" ? "blocked" : "pending",
    metadata_json: {
      document_candidate: true, template_candidate: item.candidate, ingestion_run_id: runId,
      kind: item.kind, recommendation: item.decision,
      review_status: item.decision === "blocked_sensitive" ? "blocked" : reviews.get(externalId) || "pending",
      safe_field_keys: item.safe_field_keys, blocked_field_keys: item.blocked_field_keys,
      content_stored_remotely: false, local_only_extraction: true, backfilled: true
    }
  };
});
if (new Set(rows.map((item) => item.external_id)).size !== rows.length) {
  throw new Error("El inventario contiene identificadores documentales duplicados.");
}
for (let index = 0; index < rows.length; index += 100) {
  const { error } = await db.from("source_documents").upsert(rows.slice(index, index + 100), {
    onConflict: "tenant_id,source_connection_id,external_id"
  });
  if (error) throw error;
}
await db.from("audit_events").insert({
  tenant_id: tenantId, actor_user_id: null, actor_label: "local-private-document-backfill",
  action: "private_document_candidates.backfilled", target_type: "ingestion_run", target_id: runId,
  detail_json: { source_connection_id: sourceId, documents: rows.length, content_copied: false, external_ai_calls: 0 }
});
console.log(JSON.stringify({ ok: true, documents: rows.length, contentCopied: false, externalAiCalls: 0 }));
