import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));

const apply = args.get("apply") === "true";
const input = args.get("input") || "data/public-radar/bdns-search.json";

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
      // Local convenience only.
    }
  }
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function confidence(value) {
  return value === "Alta" ? "high" : value === "Media" ? "medium" : value === "Baja" ? "low" : "uncertain";
}

function status(value) {
  return ["open", "closed", "rolling", "uncertain"].includes(value) ? value : "uncertain";
}

function versionHashes(item) {
  return {
    content_hash: hash({
      title: item.title,
      objective: item.objective,
      extractedText: item.extractedText,
      documents: item.documents?.map((doc) => [doc.id, doc.filename, doc.modifiedAt, doc.publishedAt]),
      basesEvidence: item.basesEvidence?.map((doc) => [doc.sourceUrl, doc.sha256, doc.pageCount, doc.extractedChars]),
      proposalConstraints: item.proposalConstraints
    }),
    deadline_hash: hash({
      observed: item.deadlineObserved || item.deadline,
      start: item.deadlineStart,
      end: item.deadlineEnd,
      status: item.deadlineStatus,
      confidence: item.deadlineConfidence,
      evidenceUrl: item.deadlineEvidenceUrl
    }),
    criteria_hash: hash({
      territory: item.territory,
      beneficiaryTypes: item.beneficiaryTypes,
      theme: item.theme,
      eligibleActivities: item.eligibleActivities,
      requiredDocuments: item.documents?.map((doc) => doc.description || doc.filename)
    })
  };
}

function versionRow(opportunityId, item, versionNumber) {
  const hashes = versionHashes(item);
  return {
    opportunity_id: opportunityId,
    version_number: versionNumber,
    version_status: "current",
    source_url: item.officialUrl,
    official_url: item.officialUrl,
    bases_url: item.basesUrl || null,
    deadline_start: item.deadlineStart || null,
    deadline_end: item.deadlineEnd || null,
    deadline_text: item.deadlineObserved || item.deadline || "Plazo no estructurado",
    deadline_status: status(item.deadlineStatus),
    deadline_confidence: confidence(item.deadlineConfidence),
    deadline_observed: item.deadlineObserved || item.deadline || "Plazo no estructurado",
    deadline_evidence_url: item.deadlineEvidenceUrl || item.officialUrl || item.basesUrl || null,
    deadline_evidence_date: item.deadlineEvidenceDate || null,
    deadline_read_at: item.deadlineReadAt || new Date().toISOString(),
    deadline_next_review_at: item.deadlineNextReviewAt || null,
    deadline_uncertainty_reason: item.deadlineUncertaintyReason || null,
    tenant_alarm_policy: item.tenantAlarmPolicy || "Alertar a tenants afectados si cambia fecha, texto de plazo o evidencia.",
    amount_text: item.amount,
    eligibility_text: (item.beneficiaryTypes || []).join("; "),
    criteria_text: [item.territory, item.theme, ...(item.fit || [])].filter(Boolean).join("\n"),
    required_documents_text: (item.documents || []).map((doc) => doc.description || doc.filename).filter(Boolean).join("\n"),
    submission_channel_text: item.basesUrl || item.officialUrl,
    ...hashes,
    evidence_json: {
      source: item.source,
      source_id: item.sourceId,
      official_url: item.officialUrl,
      bases_url: item.basesUrl,
      documents: item.documents || [],
      announcements: item.announcements || [],
      bases_evidence: item.basesEvidence || [],
      proposal_constraints: item.proposalConstraints || null,
      evidence: item.evidence || []
    },
    metadata_json: {
      administration_level: item.administrationLevel,
      sector: item.sector,
      score: item.score,
      actionable: item.actionable !== false,
      bases_status: item.basesStatus || "unknown",
      source_authority: item.sourceAuthority || "unknown",
      lifecycle_status: item.lifecycleStatus || "review_required",
      internal_facts: item.internalFacts || [],
      proposal_constraints_status: item.proposalConstraints?.status || "not_scanned",
      drafting_gate: item.proposalConstraints?.draftingGate || "blocked_pending_constraint_review"
    },
    detected_at: item.deadlineReadAt || new Date().toISOString()
  };
}

async function supabaseClient() {
  await maybeReadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket }
  });
}

async function assertDeadlineTraceSchema(supabase) {
  const { error } = await supabase
    .from("platform_opportunity_versions")
    .select("id, deadline_observed, deadline_evidence_url, deadline_read_at, deadline_next_review_at, tenant_alarm_policy")
    .limit(1);
  if (!error) return;
  if (error.code === "42703") {
    throw new Error("Faltan columnas de trazabilidad de fechas. Aplica supabase/migrations/20260702110000_deadline_trace_fields.sql antes de importar BDNS.");
  }
  throw error;
}

async function ensureSource(supabase, dataset) {
  const row = {
    label: "BDNS/SNPSAP",
    kind: "bdns",
    url: dataset.apiBase,
    status: "active",
    health_status: dataset.detailErrors?.length ? "degraded" : "healthy",
    priority: 95,
    config_json: { mode: dataset.mode, query: dataset.query, total_elements: dataset.totalElements },
    last_synced_at: dataset.generatedAt,
    updated_at: new Date().toISOString()
  };
  const { data: existing, error: readError } = await supabase
    .from("platform_sources")
    .select("id")
    .eq("kind", "bdns")
    .eq("url", dataset.apiBase)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.id) {
    const { error } = await supabase.from("platform_sources").update(row).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase.from("platform_sources").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertOpportunity(supabase, sourceId, item) {
  const row = {
    platform_source_id: sourceId,
    canonical_key: item.id,
    title: item.title,
    funder_name: item.organism || item.source,
    source_scope: "platform_public",
    funder_type: "public",
    territory: item.territory,
    themes: [item.theme].filter(Boolean),
    status: status(item.deadlineStatus) === "uncertain" ? "tracked" : status(item.deadlineStatus),
    priority: item.score || 50,
    metadata_json: { bdns_source_id: item.sourceId, amount: item.amount },
    last_seen_at: item.deadlineReadAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from("platform_opportunities")
    .upsert(row, { onConflict: "canonical_key" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function currentVersion(supabase, opportunityId) {
  const { data, error } = await supabase
    .from("platform_opportunity_versions")
    .select("id, version_number, content_hash, deadline_hash, criteria_hash")
    .eq("opportunity_id", opportunityId)
    .eq("version_status", "current")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function writeVersion(supabase, opportunityId, item) {
  const current = await currentVersion(supabase, opportunityId);
  const next = versionRow(opportunityId, item, current ? current.version_number + 1 : 1);
  if (!current) {
    const { error } = await supabase.from("platform_opportunity_versions").insert(next);
    if (error) throw error;
    return "inserted";
  }
  if (current.content_hash === next.content_hash && current.deadline_hash === next.deadline_hash && current.criteria_hash === next.criteria_hash) {
    const { error } = await supabase
      .from("platform_opportunity_versions")
      .update({
        deadline_read_at: next.deadline_read_at,
        deadline_next_review_at: next.deadline_next_review_at,
        deadline_evidence_date: next.deadline_evidence_date,
        deadline_uncertainty_reason: next.deadline_uncertainty_reason,
        tenant_alarm_policy: next.tenant_alarm_policy,
        detected_at: next.detected_at,
        metadata_json: next.metadata_json
      })
      .eq("id", current.id);
    if (error) throw error;
    return "refreshed";
  }
  const { error: supersedeError } = await supabase
    .from("platform_opportunity_versions")
    .update({ version_status: "superseded" })
    .eq("id", current.id);
  if (supersedeError) throw supersedeError;
  const { error } = await supabase.from("platform_opportunity_versions").insert(next);
  if (error) throw error;
  return "versioned";
}

async function main() {
  const dataset = JSON.parse(await fs.readFile(input, "utf8"));
  const opportunities = dataset.opportunities.filter((item) => item.actionable === true && item.deadlineStatus === "open" && item.basesStatus === "extracted");
  const summary = { apply, input, scanned: dataset.opportunities.length, eligibleLive: opportunities.length, rejectedByLiveEvidenceGate: dataset.opportunities.length - opportunities.length, inserted: 0, refreshed: 0, versioned: 0 };
  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", ...summary }, null, 2));
    return;
  }
  const supabase = await supabaseClient();
  await assertDeadlineTraceSchema(supabase);
  const sourceId = await ensureSource(supabase, dataset);
  for (const item of opportunities) {
    const opportunityId = await upsertOpportunity(supabase, sourceId, item);
    const action = await writeVersion(supabase, opportunityId, item);
    summary[action] += 1;
  }
  console.log(JSON.stringify({ mode: "applied", ...summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
