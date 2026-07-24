import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { get } from "@vercel/blob";
import WebSocket from "ws";
import { pathToFileURL } from "node:url";
import { combineGrantRequirements } from "../radar/extract-grant-requirements.mjs";
import { combineProposalConstraints } from "../radar/extract-proposal-constraints.mjs";
import { interpretPublicBases } from "./openai-bases-provider.mjs";

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

function client() {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
}

function hash(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

async function claim(supabase) {
  const { data: queued, error: queueError } = await supabase.from("platform_bases_interpretations")
    .select("id, opportunity_version_id, source_artifact_id, deterministic_json, status")
    .eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const { data, error } = await supabase.from("platform_bases_interpretations")
    .update({ status: "generating", provider: "openai", model: process.env.AI_BASES_MODEL || process.env.AI_DRAFT_MODEL || "gpt-5.6-luna", error: null, updated_at: new Date().toISOString() })
    .eq("id", queued.id).eq("status", "queued").select("id").maybeSingle();
  if (error) throw error;
  return data ? queued : null;
}

async function artifactPayload(supabase, run) {
  const { data, error } = await supabase.from("platform_source_artifacts")
    .select("source_url, source_sha256, extracted_text_blob_path, extraction_status")
    .eq("id", run.source_artifact_id).eq("opportunity_version_id", run.opportunity_version_id).single();
  if (error) throw error;
  if (data.extraction_status !== "ready" || !data.extracted_text_blob_path) throw new Error("El artefacto de bases no tiene texto extraido listo.");
  const blob = await get(data.extracted_text_blob_path, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN, useCache: false });
  if (!blob || blob.statusCode !== 200 || !blob.stream) throw new Error("No se pudo recuperar el texto de bases desde Blob.");
  const payload = JSON.parse(await new Response(blob.stream).text());
  if (payload.documentSha256 !== data.source_sha256) throw new Error("El hash del artefacto no coincide con el registro de plataforma.");
  return payload;
}

function pageScore(page) {
  const text = String(page.text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const signals = [/beneficiari/g, /requisit/g, /objeto|finalidad/g, /actuacion|proyecto subvencionable/g, /documentacion|anexo/g, /criterios? de valoracion/g, /gastos?|cuantia|presupuesto/g, /presentacion|sede electronica/g, /obligaciones?|justificacion/g, /exclusion|incompatib/g];
  return signals.reduce((score, pattern) => score + Math.min((text.match(pattern) || []).length, 4), 0);
}

export function selectInterpretationPages(pages, deterministic, maximum = 20) {
  const cited = new Set(Object.values(deterministic?.sections || {}).flat().map((item) => Number(item.sourcePage)).filter(Boolean));
  return [...(pages || [])].sort((a, b) => Number(cited.has(Number(b.page))) - Number(cited.has(Number(a.page))) || pageScore(b) - pageScore(a) || Number(a.page) - Number(b.page)).slice(0, maximum);
}

export function aiContract(output, payload) {
  const sections = Object.fromEntries(Object.entries(output.sections || {}).map(([key, clauses]) => [key, clauses.map((clause) => ({
    text: clause.text, sourceUrl: payload.sourceUrl, documentSha256: payload.documentSha256,
    sourcePage: clause.sourcePage, evidenceExcerpt: clause.evidenceQuote, confidence: clause.confidence,
    coreEvidence: true
  }))]));
  const evidence = (item) => ({ sourceUrl: payload.sourceUrl, documentSha256: payload.documentSha256,
    sourcePage: item.sourcePage, evidenceExcerpt: item.evidenceQuote, confidence: item.confidence });
  return { schemaVersion: 1, sections, proposalConstraints: {
    limits: (output.proposalConstraints?.limits || []).map((item) => ({ documentType: item.documentType, kind: item.kind, value: item.value, unit: item.unit, ...evidence(item) })),
    formatRules: (output.proposalConstraints?.formatRules || []).map((item) => ({ kind: item.kind, value: item.value, ...evidence(item) }))
  } };
}

async function monthlySpend(supabase) {
  const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase.from("platform_bases_interpretations").select("usage_json")
    .eq("provider", "openai").gte("created_at", since.toISOString());
  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + Number(row.usage_json?.estimated_eur || 0), 0);
}

async function main() {
  await prepareEnv();
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN no esta configurado.");
  const supabase = client();
  const run = await claim(supabase);
  if (!run) return console.log(JSON.stringify({ mode: "idle", message: "No hay interpretaciones de bases en cola." }, null, 2));
  try {
    const budget = Number(process.env.AI_BASES_MONTHLY_BUDGET_EUR || 15);
    if (await monthlySpend(supabase) + Number(process.env.AI_BASES_MAX_RUN_COST_EUR || 0.15) > budget) throw new Error("Presupuesto mensual del interpretador de bases agotado o insuficiente.");
    const payload = await artifactPayload(supabase, run);
    const pages = selectInterpretationPages(payload.pages, run.deterministic_json);
    const generated = await interpretPublicBases({ ...payload, pages });
    const ai = aiContract(generated.output, payload);
    const contract = combineGrantRequirements([run.deterministic_json, ai]);
    contract.proposalConstraints = combineProposalConstraints([run.deterministic_json?.proposalConstraints, ai.proposalConstraints]);
    const { error } = await supabase.from("platform_bases_interpretations").update({
      status: "review_required", contract_json: contract, citations_verified: true,
      output_hash: hash(contract), provider: "openai", model: generated.model,
      usage_json: { ...generated.usage, response_id: generated.responseId, pages_sent: pages.map((page) => page.page), public_only: true },
      error: null, updated_at: new Date().toISOString()
    }).eq("id", run.id);
    if (error) throw error;
    console.log(JSON.stringify({ mode: "interpreted", interpretationId: run.id, status: "review_required", contractStatus: contract.status, pages: pages.length, usage: generated.usage }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const rejectedUsage = error?.usage ? {
      ...error.usage,
      response_id: error.responseId || null,
      public_only: true,
      rejected_by: "citation_validation"
    } : {};
    await supabase.from("platform_bases_interpretations").update({
      status: "failed", error: message.slice(0, 4000), usage_json: rejectedUsage,
      model: error?.model || process.env.AI_BASES_MODEL || process.env.AI_DRAFT_MODEL || "gpt-5.6-luna",
      updated_at: new Date().toISOString()
    }).eq("id", run.id);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
