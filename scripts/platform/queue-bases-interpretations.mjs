import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { put } from "@vercel/blob";
import WebSocket from "ws";
import { extractGrantRequirements } from "../radar/extract-grant-requirements.mjs";
import { extractProposalConstraints } from "../radar/extract-proposal-constraints.mjs";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const scanPath = args.get("scan");
const apply = args.get("apply") === "true";
const interpreterVersion = "bases-contract-v1";
if (!scanPath) throw new Error("Falta --scan con el resultado de extraccion de bases.");

function loadEnv(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function prepareEnv() {
  for (const file of [".env.local", ".env"]) {
    try { loadEnv(await fs.readFile(file, "utf8")); } catch { /* entorno alojado */ }
  }
}

function hash(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function opportunityKey(id) {
  return String(id || "").replace(/-bases-\d+$/, "");
}

function documents(scan) {
  return (scan.results || []).flatMap((result) => (result.evidence_documents || [])
    .filter((document) => document.extraction_status === "ready" && document.extracted_text && /^[a-f0-9]{64}$/i.test(document.sha256 || ""))
    .map((document) => ({ key: opportunityKey(result.id), document })));
}

function pagePayload(document) {
  const pages = document.page_evidence?.length ? document.page_evidence : [{ page: 1, text: document.extracted_text }];
  return {
    schemaVersion: 1, dataClass: "public", sourceUrl: document.source_url,
    documentSha256: document.sha256, pages: pages.map((page) => ({ page: Number(page.page), text: String(page.text || "") }))
  };
}

async function platformClient() {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias para --apply.");
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
}

async function persist(supabase, entry) {
  const { data: opportunity, error: opportunityError } = await supabase.from("platform_opportunities")
    .select("id").eq("canonical_key", entry.key).maybeSingle();
  if (opportunityError) throw opportunityError;
  if (!opportunity) return "unmatched";
  const { data: version, error: versionError } = await supabase.from("platform_opportunity_versions")
    .select("id").eq("opportunity_id", opportunity.id).eq("version_status", "current").maybeSingle();
  if (versionError) throw versionError;
  if (!version) return "unmatched";

  const payload = pagePayload(entry.document);
  const body = JSON.stringify(payload);
  const pathname = `platform/bases/${entry.document.sha256}/pages.json`;
  await put(pathname, body, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", token: process.env.BLOB_READ_WRITE_TOKEN });
  const contract = extractGrantRequirements(entry.document.extracted_text, {
    sourceUrl: entry.document.source_url, documentSha256: entry.document.sha256, pageEvidence: payload.pages
  });
  contract.proposalConstraints = extractProposalConstraints(entry.document.extracted_text, {
    sourceUrl: entry.document.source_url, documentSha256: entry.document.sha256, pageEvidence: payload.pages
  });
  const { data: artifact, error: artifactError } = await supabase.from("platform_source_artifacts").upsert({
    opportunity_version_id: version.id, source_url: entry.document.source_url, mime_type: "application/pdf",
    source_sha256: entry.document.sha256, source_size_bytes: entry.document.source_size_bytes || null,
    extracted_text_blob_path: pathname, page_count: entry.document.page_count || payload.pages.length,
    extraction_status: "ready", extraction_method: entry.document.parser || "pdf_or_ocr", updated_at: new Date().toISOString()
  }, { onConflict: "opportunity_version_id,source_sha256" }).select("id").single();
  if (artifactError) throw artifactError;
  const deterministicComplete = contract.documentaryGate === "requirements_extracted_for_review";
  const { error: interpretationError } = await supabase.from("platform_bases_interpretations").upsert({
    opportunity_version_id: version.id, source_artifact_id: artifact.id, interpreter_version: interpreterVersion,
    status: deterministicComplete ? "review_required" : "queued", method: deterministicComplete ? "deterministic" : "hybrid",
    deterministic_json: contract, contract_json: deterministicComplete ? contract : {},
    citations_verified: deterministicComplete, input_hash: hash(payload), output_hash: deterministicComplete ? hash(contract) : null,
    provider: deterministicComplete ? "deterministic" : null, model: null, error: null, updated_at: new Date().toISOString()
  }, { onConflict: "opportunity_version_id,source_artifact_id,interpreter_version" });
  if (interpretationError) throw interpretationError;
  return deterministicComplete ? "reviewRequired" : "queued";
}

async function main() {
  await prepareEnv();
  const scan = JSON.parse(await fs.readFile(scanPath, "utf8"));
  const entries = documents(scan);
  if (!apply) return console.log(JSON.stringify({ mode: "dry-run", scan: scanPath, artifacts: entries.length }, null, 2));
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN es obligatorio para preservar el texto extraido.");
  const supabase = await platformClient();
  for (const result of scan.results || []) {
    if (!result.supplementary_source_id) continue;
    const ready = (result.evidence_documents || []).some((document) => document.extraction_status === "ready" && document.extracted_text);
    const message = ready ? null : String(result.failures?.[0]?.error || result.status || "captura_sin_texto_verificable").slice(0, 1000);
    const { error } = await supabase.from("platform_supplementary_basis_sources").update({
      last_verified_at: new Date().toISOString(), last_verification_error: message, updated_at: new Date().toISOString()
    }).eq("id", result.supplementary_source_id).eq("status", "approved");
    if (error) throw error;
  }
  const summary = { mode: "applied", scan: scanPath, artifacts: entries.length, queued: 0, reviewRequired: 0, unmatched: 0 };
  for (const entry of entries) summary[await persist(supabase, entry)] += 1;
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
