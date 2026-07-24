import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));

function loadEnv(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function canonicalKey(row) {
  const joined = Array.isArray(row.platform_opportunities) ? row.platform_opportunities[0] : row.platform_opportunities;
  return String(joined?.canonical_key || "");
}

export function mergeApprovedBasisSources(dataset, rows) {
  const approved = (rows || []).filter((row) => row.status === "approved" && /^https:\/\//i.test(row.source_url || ""));
  const byKey = new Map(approved.map((row) => [canonicalKey(row), row]).filter(([key]) => key));
  let added = 0;
  for (const item of dataset.opportunities || []) {
    const matching = approved.filter((row) => canonicalKey(row) === String(item.id));
    if (!matching.length) continue;
    const documents = [...(item.basisDocuments || [])];
    for (const row of matching) {
      if (documents.some((document) => document.url === row.source_url)) continue;
      documents.push({
        id: `supplementary-${row.id}`, url: row.source_url, role: row.document_role,
        description: "Fuente oficial suplementaria aprobada", sourceAuthority: row.source_authority,
        supplementarySourceId: row.id, approvedAt: row.reviewed_at
      });
      added += 1;
    }
    item.basisDocuments = documents;
    item.basesUrls = documents.map((document) => document.url);
    item.basesUrl = item.basesUrl || item.basesUrls[0] || "";
    if (item.basesUrl) item.basesStatus = "located";
    item.basesSourceStrategy = item.basesSourceStrategy === "missing"
      ? "approved_supplementary_official_source"
      : `${item.basesSourceStrategy}+approved_supplementary`;
  }
  return { dataset, approved: approved.length, matchedOpportunities: [...byKey.keys()].filter((key) => (dataset.opportunities || []).some((item) => String(item.id) === key)).length, added };
}

async function main() {
  const input = args.get("input");
  const output = args.get("output") || input;
  if (!input || !output) throw new Error("Falta --input para incorporar fuentes suplementarias.");
  for (const file of [".env.local", ".env"]) {
    try { loadEnv(await fs.readFile(file, "utf8")); } catch { /* entorno alojado */ }
  }
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
  const supabase = createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
  const { data, error } = await supabase.from("platform_supplementary_basis_sources")
    .select("id, source_url, document_role, source_authority, status, reviewed_at, platform_opportunities!inner(canonical_key)")
    .eq("status", "approved");
  if (error) throw error;
  const dataset = JSON.parse(await fs.readFile(input, "utf8"));
  const result = mergeApprovedBasisSources(dataset, data || []);
  await fs.writeFile(output, `${JSON.stringify(result.dataset, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ input, output, approved: result.approved, matchedOpportunities: result.matchedOpportunities, added: result.added }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
