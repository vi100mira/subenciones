import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorMessage, fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin } from "../src/supabaseAdmin.js";

type BridgeDocument = { documentId?: string; relativePath?: string; sourceSha256?: string; extension?: string; dataClass?: string; candidate?: boolean; decision?: string; safeFieldKeys?: string[]; blockedFieldKeys?: string[] };
type BridgeProposal = { fieldKey?: string; value?: string; sourceSha256?: string; confidence?: "low" | "medium" | "high" };

function tokenFrom(req: VercelRequest) {
  const value = String(req.headers.authorization || "");
  return value.startsWith("Bridge ") ? value.slice("Bridge ".length) : "";
}

function hash(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

function safeList<T>(value: unknown, limit: number): T[] {
  return Array.isArray(value) ? value.slice(0, limit) as T[] : [];
}

function isSha(value: unknown) { return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const token = tokenFrom(req);
    if (!token) return res.status(401).json(fail("Falta la sesión temporal del puente local"));

    const supabase = getSupabaseAdmin(); const now = new Date().toISOString();
    const { data: bridge, error: bridgeError } = await supabase.from("local_bridge_sessions")
      .select("id, tenant_id, source_connection_id, issued_to, expires_at, status")
      .eq("token_hash", hash(token)).eq("status", "active").maybeSingle();
    if (bridgeError) throw bridgeError;
    if (!bridge || new Date(bridge.expires_at).getTime() <= Date.now()) return res.status(401).json(fail("La sesión del puente ha caducado o ya fue utilizada"));

    const documents = safeList<BridgeDocument>(req.body?.documents, 5_000).filter((item) => isSha(item.sourceSha256) && typeof item.documentId === "string" && typeof item.relativePath === "string");
    const proposals = safeList<BridgeProposal>(req.body?.proposals, 500).filter((item) => isSha(item.sourceSha256) && typeof item.fieldKey === "string" && typeof item.value === "string");
    const metrics = req.body?.metrics || {};
    if (!documents.length && !proposals.length) return res.status(400).json(fail("El puente no ha recibido inventario ni propuestas válidas"));

    const { data: source, error: sourceError } = await supabase.from("source_connections")
      .select("id, kind, scope, status, config_json").eq("id", bridge.source_connection_id).eq("tenant_id", bridge.tenant_id).maybeSingle();
    if (sourceError) throw sourceError;
    if (!source || source.kind !== "local_simulation" || source.scope !== "tenant_private" || source.status !== "active") return res.status(409).json(fail("La fuente local ya no está autorizada"));

    const run = await supabase.from("ingestion_runs").insert({ tenant_id: bridge.tenant_id, source_connection_id: source.id, status: "running", requested_by: bridge.issued_to, started_at: now }).select("id").single();
    if (run.error) throw run.error;
    const mime: Record<string, string> = { ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
    const documentRows = documents.map((item) => ({
      tenant_id: bridge.tenant_id, source_connection_id: source.id, external_id: `local-inventory:${item.documentId}`,
      title: item.relativePath!.split(/[\\/]/).pop() || "Documento local", path: `private://${source.id}/${item.documentId}`,
      mime_type: mime[String(item.extension || "").toLowerCase()] || "application/octet-stream", data_class: ["public", "internal", "personal", "sensitive", "blocked"].includes(String(item.dataClass)) ? item.dataClass : "internal",
      source_sha256: item.sourceSha256, extracted_text: null, extraction_status: item.decision === "blocked_sensitive" ? "blocked" : "pending",
      metadata_json: { document_candidate: true, template_candidate: Boolean(item.candidate), ingestion_run_id: run.data.id, review_status: item.decision === "blocked_sensitive" ? "blocked" : "pending", safe_field_keys: safeList<string>(item.safeFieldKeys, 50), blocked_field_keys: safeList<string>(item.blockedFieldKeys, 50), content_stored_remotely: false, local_only_extraction: true }
    }));
    if (documentRows.length) { const { error } = await supabase.from("source_documents").upsert(documentRows, { onConflict: "tenant_id,source_connection_id,external_id" }); if (error) throw error; }
    await supabase.from("tenant_profile_suggestions").update({ status: "superseded" }).eq("tenant_id", bridge.tenant_id).eq("source_type", "uploaded_document").eq("status", "pending");
    const proposalRows = proposals.map((item) => ({ tenant_id: bridge.tenant_id, field_key: item.fieldKey!.slice(0, 120), suggested_value: item.value!.slice(0, 4000), source_type: "uploaded_document", source_ref: `local-inventory:${item.sourceSha256!.slice(0, 16)}`, source_sha256: item.sourceSha256, confidence: ["low", "medium", "high"].includes(String(item.confidence)) ? item.confidence : "medium", status: "pending", evidence_excerpt: `Documento local autorizado · huella ${item.sourceSha256!.slice(0, 12)} · extracción local sin IA`, metadata_json: { source_connection_id: source.id, ingestion_run_id: run.data.id, local_only_extraction: true, external_ai_calls: 0, content_stored_remotely: false } }));
    if (proposalRows.length) { const { error } = await supabase.from("tenant_profile_suggestions").insert(proposalRows); if (error) throw error; }
    const summary = { runId: run.data.id, completedAt: now, documentsScanned: Number(metrics.documentsScanned || documents.length), proposalCount: proposalRows.length, externalAiCalls: 0, contentStoredRemotely: false };
    await supabase.from("source_connections").update({ config_json: { ...(source.config_json || {}), lastInventory: summary }, last_synced_at: now, updated_at: now }).eq("id", source.id).eq("tenant_id", bridge.tenant_id);
    await supabase.from("ingestion_runs").update({ status: "completed", scanned: summary.documentsScanned, inserted: proposalRows.length, skipped: Math.max(0, summary.documentsScanned - documentRows.length), finished_at: now }).eq("id", run.data.id).eq("tenant_id", bridge.tenant_id);
    await supabase.from("local_bridge_sessions").update({ status: "revoked", last_seen_at: now, revoked_at: now, revoked_by: bridge.issued_to }).eq("id", bridge.id);
    await supabase.from("audit_events").insert({ tenant_id: bridge.tenant_id, actor_user_id: bridge.issued_to, actor_label: "local-bridge", action: "local_bridge.inventory_completed", target_type: "ingestion_run", target_id: run.data.id, detail_json: { source_connection_id: source.id, documents_scanned: summary.documentsScanned, proposals: proposalRows.length, external_ai_calls: 0, content_copied_to_audit: false } });
    return res.status(201).json(ok(summary));
  } catch (error) {
    const message = errorMessage(error); return res.status(message.includes("caduc") || message.includes("sesión") ? 401 : 400).json(fail(message));
  }
}
