import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  })
);

const tenantId = args.get("tenant-id");
const limit = Number(args.get("limit") || 25);
const chunkSize = Number(args.get("chunk-size") || 1200);
const overlap = Number(args.get("overlap") || 180);
const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

function chunkText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const hardEnd = Math.min(start + chunkSize, clean.length);
    const softEnd = clean.lastIndexOf(". ", hardEnd);
    const end = softEnd > start + chunkSize * 0.65 ? softEnd + 1 : hardEnd;
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

let query = supabase
  .from("source_documents")
  .select("id, tenant_id, title, data_class, source_sha256, extracted_text")
  .eq("extraction_status", "ready")
  .not("extracted_text", "is", null)
  .not("data_class", "in", '("sensitive","blocked")')
  .limit(limit);

if (tenantId) query = query.eq("tenant_id", tenantId);

const { data: documents, error } = await query;
if (error) throw error;

let processed = 0;
let created = 0;
let skipped = 0;

for (const document of documents || []) {
  const { data: existing, error: existingError } = await supabase
    .from("document_chunks")
    .select("id")
    .eq("document_id", document.id)
    .limit(1);
  if (existingError) throw existingError;
  if (existing?.length) {
    skipped += 1;
    continue;
  }

  const chunks = chunkText(document.extracted_text || "");
  if (!chunks.length) {
    skipped += 1;
    continue;
  }

  const rows = chunks.map((text, index) => ({
    tenant_id: document.tenant_id,
    document_id: document.id,
    chunk_index: index,
    text,
    token_count: Math.ceil(text.length / 4),
    metadata_json: {
      source_sha256: document.source_sha256,
      data_class: document.data_class,
      chunk_version: 1
    }
  }));

  const { error: insertError } = await supabase.from("document_chunks").insert(rows);
  if (insertError) throw insertError;

  await supabase.from("audit_events").insert({
    tenant_id: document.tenant_id,
    actor_label: "chunk-documents-worker",
    action: "document.chunked",
    target_type: "source_document",
    target_id: document.id,
    detail_json: { title: document.title, chunks: rows.length, data_class: document.data_class }
  });

  processed += 1;
  created += rows.length;
}

console.log(JSON.stringify({ processed, created, skipped, limit, tenantId: tenantId || null }, null, 2));
