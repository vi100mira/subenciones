import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const catalogPath = "data/private-open-funders/platform-open-funders-v1.json";

function loadEnvFile(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function statusFromSource(item) {
  if (item.opportunity_status === "open" || item.opportunity_status === "open_by_territory") return "open";
  if (item.opportunity_status?.includes("closed")) return "closed";
  return "tracked";
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

async function maybeReadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      loadEnvFile(await fs.readFile(file, "utf8"));
    } catch {
      // Optional local convenience only.
    }
  }
}

async function getSource(supabase, item) {
  const { data: existing, error: readError } = await supabase
    .from("platform_sources")
    .select("id")
    .eq("url", item.url)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.id) {
    const { error } = await supabase
      .from("platform_sources")
      .update({
        label: item.name,
        kind: "private_funder",
        status: "active",
        health_status: "unknown",
        priority: item.opportunity_status === "open" ? 85 : 65,
        config_json: {
          catalogue_id: item.id,
          funder_type: item.funder_type,
          monitoring_cadence: item.monitoring_cadence,
          watch_fields: item.watch_fields,
          evidence_quality: item.evidence_quality
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("platform_sources")
    .insert({
      label: item.name,
      kind: "private_funder",
      url: item.url,
      status: "active",
      health_status: "unknown",
      priority: item.opportunity_status === "open" ? 85 : 65,
      config_json: {
        catalogue_id: item.id,
        funder_type: item.funder_type,
        monitoring_cadence: item.monitoring_cadence,
        watch_fields: item.watch_fields,
        evidence_quality: item.evidence_quality
      }
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertOpportunity(supabase, sourceId, item) {
  const opportunity = {
    platform_source_id: sourceId,
    canonical_key: item.id,
    title: item.name,
    funder_name: item.name.split(" - ")[0],
    source_scope: "platform_curated",
    funder_type: item.funder_type,
    territory: item.territory,
    themes: item.themes || [],
    status: statusFromSource(item),
    priority: item.opportunity_status === "open" ? 85 : 65,
    metadata_json: {
      initial_action: item.initial_action,
      opportunity_status: item.opportunity_status
    },
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from("platform_opportunities")
    .upsert(opportunity, { onConflict: "canonical_key" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureVersion(supabase, opportunityId, item, observedAt) {
  const content = {
    name: item.name,
    url: item.url,
    themes: item.themes,
    territory: item.territory,
    deadline_text: item.deadline_text,
    initial_action: item.initial_action
  };
  const version = {
    opportunity_id: opportunityId,
    version_number: 1,
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
      catalogue_import: "platform-open-funders-v1"
    }
  };
  const { error } = await supabase
    .from("platform_opportunity_versions")
    .upsert(version, { onConflict: "opportunity_id,version_number" });
  if (error) throw error;
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const observedAt = catalog.catalog?.observed_at || null;
  const summary = {
    apply,
    sources: catalog.sources.length,
    openOrActive: catalog.sources.filter((item) => item.opportunity_status === "open" || item.opportunity_status === "open_by_territory").length,
    tenantPrivateSources: catalog.vuelta_1_metrics.tenant_private_sources_used
  };

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", ...summary }, null, 2));
    return;
  }

  await maybeReadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket }
  });
  for (const item of catalog.sources) {
    const sourceId = await getSource(supabase, item);
    const opportunityId = await upsertOpportunity(supabase, sourceId, item);
    await ensureVersion(supabase, opportunityId, item, observedAt);
  }

  console.log(JSON.stringify({ mode: "applied", ...summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
