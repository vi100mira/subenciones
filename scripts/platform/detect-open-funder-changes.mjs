import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const simulateDeadlineChange = args.has("--simulate-deadline-change");
const catalogPath = "data/private-open-funders/platform-open-funders-v1.json";

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
      // Optional local convenience only.
    }
  }
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function deadlineStatus(item) {
  if (item.opportunity_status === "open" || item.opportunity_status === "open_by_territory") return "open";
  if (item.opportunity_status?.includes("closed")) return "closed";
  return "uncertain";
}

function nextReviewAt(item) {
  const days = item.monitoring_cadence?.toLowerCase().includes("daily") ? 1 : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function deadlineTraceFields(item, observedAt) {
  const confidence = item.deadline_confidence || "uncertain";
  const status = deadlineStatus(item);
  return {
    deadline_observed: item.deadline_text || "Deadline not stated",
    deadline_evidence_url: item.url,
    deadline_evidence_date: observedAt || null,
    deadline_read_at: new Date().toISOString(),
    deadline_next_review_at: nextReviewAt(item),
    deadline_uncertainty_reason: confidence === "high" ? null : "Deadline is relative, line-specific, or requires source-specific confirmation.",
    tenant_alarm_policy: status === "closed" ? "Alert only if reopened or next edition appears." : "Alert affected tenants if deadline text, confidence, evidence URL, or source document changes."
  };
}

function versionFromItem(opportunityId, item, versionNumber, observedAt) {
  const content = {
    name: item.name,
    url: item.url,
    themes: item.themes,
    territory: item.territory,
    deadline_text: item.deadline_text,
    initial_action: item.initial_action
  };
  return {
    opportunity_id: opportunityId,
    version_number: versionNumber,
    version_status: "current",
    source_url: item.url,
    deadline_text: item.deadline_text,
    deadline_status: deadlineStatus(item),
    deadline_confidence: item.deadline_confidence,
    ...deadlineTraceFields(item, observedAt),
    criteria_text: [item.territory, ...(item.themes || []), item.initial_action].filter(Boolean).join("\n"),
    submission_channel_text: "Official funder page; channel requires source-specific review.",
    content_hash: hash(content),
    deadline_hash: hash({ deadline_text: item.deadline_text, confidence: item.deadline_confidence }),
    criteria_hash: hash({ themes: item.themes, territory: item.territory, action: item.initial_action }),
    evidence_json: {
      source_url: item.url,
      evidence_quality: item.evidence_quality,
      watch_fields: item.watch_fields
    },
    metadata_json: {
      monitoring_cadence: item.monitoring_cadence,
      catalogue_import: "platform-open-funders-v1",
      change_detection_worker: "detect-open-funder-changes"
    }
  };
}

function classifyChange(currentVersion, nextVersion) {
  if (currentVersion.deadline_hash !== nextVersion.deadline_hash) {
    return {
      change_type: "deadline",
      severity: "critical",
      summary: "Deadline text or confidence changed.",
      previous_value: currentVersion.deadline_text,
      new_value: nextVersion.deadline_text
    };
  }
  if (currentVersion.criteria_hash !== nextVersion.criteria_hash) {
    return {
      change_type: "eligibility",
      severity: "high",
      summary: "Eligibility, territory, theme, or review action changed.",
      previous_value: currentVersion.criteria_text,
      new_value: nextVersion.criteria_text
    };
  }
  return {
    change_type: "text_document",
    severity: "medium",
    summary: "Source content changed without a detected deadline or criteria hash change.",
    previous_value: currentVersion.content_hash,
    new_value: nextVersion.content_hash
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

async function loadCurrentState(supabase, canonicalKeys) {
  const { data: opportunities, error: opportunitiesError } = await supabase
    .from("platform_opportunities")
    .select("id, canonical_key, title")
    .in("canonical_key", canonicalKeys);
  if (opportunitiesError) throw opportunitiesError;

  const opportunityIds = (opportunities || []).map((item) => item.id);
  const { data: versions, error: versionsError } = opportunityIds.length
    ? await supabase
      .from("platform_opportunity_versions")
      .select("id, opportunity_id, version_number, content_hash, deadline_hash, criteria_hash, deadline_text, criteria_text")
      .in("opportunity_id", opportunityIds)
      .eq("version_status", "current")
    : { data: [], error: null };
  if (versionsError) throw versionsError;

  return {
    opportunities: new Map((opportunities || []).map((item) => [item.canonical_key, item])),
    versions: new Map((versions || []).map((item) => [item.opportunity_id, item]))
  };
}

async function applyChange(supabase, opportunity, currentVersion, nextVersion, change) {
  const { error: supersedeError } = await supabase
    .from("platform_opportunity_versions")
    .update({ version_status: "superseded" })
    .eq("id", currentVersion.id);
  if (supersedeError) throw supersedeError;

  const { data: insertedVersion, error: insertVersionError } = await supabase
    .from("platform_opportunity_versions")
    .insert(nextVersion)
    .select("id")
    .single();
  if (insertVersionError) throw insertVersionError;

  const { error: eventError } = await supabase
    .from("platform_opportunity_change_events")
    .insert({
      opportunity_id: opportunity.id,
      previous_version_id: currentVersion.id,
      new_version_id: insertedVersion.id,
      change_type: change.change_type,
      severity: change.severity,
      confidence: "medium",
      summary: change.summary,
      previous_value: change.previous_value,
      new_value: change.new_value,
      evidence_json: nextVersion.evidence_json,
      human_review_status: change.severity === "critical" || change.severity === "high" ? "pending" : "not_required"
    });
  if (eventError) throw eventError;
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const observedAt = catalog.catalog?.observed_at || null;
  if (simulateDeadlineChange) catalog.sources[0].deadline_text = `${catalog.sources[0].deadline_text} SIMULATED`;
  const supabase = await supabaseClient();
  const state = await loadCurrentState(supabase, catalog.sources.map((item) => item.id));
  const results = [];

  for (const item of catalog.sources) {
    const opportunity = state.opportunities.get(item.id);
    if (!opportunity) {
      results.push({ id: item.id, status: "missing_opportunity" });
      continue;
    }

    const currentVersion = state.versions.get(opportunity.id);
    if (!currentVersion) {
      results.push({ id: item.id, status: "missing_current_version" });
      continue;
    }

    const nextVersion = versionFromItem(opportunity.id, item, currentVersion.version_number + 1, observedAt);
    if (currentVersion.content_hash === nextVersion.content_hash) {
      results.push({ id: item.id, status: "unchanged" });
      continue;
    }

    const change = classifyChange(currentVersion, nextVersion);
    results.push({ id: item.id, status: "changed", change_type: change.change_type, severity: change.severity });
    if (apply) await applyChange(supabase, opportunity, currentVersion, nextVersion, change);
  }

  const summary = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", summary, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
