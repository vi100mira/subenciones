import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { matchOpportunity } from "./tenant-match-contract.mjs";

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
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function list(value) {
  return (Array.isArray(value) ? value : value ? [value] : []).map(String);
}

async function claim(supabase) {
  const { data: queued, error: queueError } = await supabase.from("tenant_agent_runs")
    .select("id, tenant_id, requested_by, status").eq("agent_key", "match_agent").eq("status", "queued")
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const { data, error } = await supabase.from("tenant_agent_runs")
    .update({ status: "preparing_context", started_at: new Date().toISOString(), updated_at: new Date().toISOString(), error: null })
    .eq("id", queued.id).eq("status", "queued").select("id").maybeSingle();
  if (error) throw error;
  return data ? queued : null;
}

async function loadProfile(supabase, tenantId) {
  const [agentResult, configResult, factsResult] = await Promise.all([
    supabase.from("tenant_agent_configs").select("status, enabled").eq("tenant_id", tenantId).eq("agent_key", "match_agent").maybeSingle(),
    supabase.from("tenant_configs").select("profile_json").eq("tenant_id", tenantId).single(),
    supabase.from("tenant_profile_suggestions").select("id, field_key, suggested_value, source_ref, source_sha256")
      .eq("tenant_id", tenantId).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(100)
  ]);
  if (agentResult.error) throw agentResult.error;
  if (configResult.error) throw configResult.error;
  if (factsResult.error) throw factsResult.error;
  if (agentResult.data?.status !== "ready" || !agentResult.data.enabled) throw new Error("El Asistente de encaje no está habilitado.");
  const stored = configResult.data.profile_json || {};
  if (!["approved", "validated", "aprobado"].includes(stored.review_state)) throw new Error("El perfil de entidad no está aprobado.");
  const profile = {
    territories: list(stored.territory),
    themes: list(stored.themes),
    legalForms: list(stored.legal_form),
    programs: list(stored.programs),
    collectives: list(stored.collectives),
    approvedFactRefs: (factsResult.data || []).map((fact) => fact.id)
  };
  for (const fact of factsResult.data || []) {
    if (fact.field_key === "territory") profile.territories.push(fact.suggested_value);
    if (fact.field_key === "theme") profile.themes.push(fact.suggested_value);
    if (fact.field_key === "legal_form") profile.legalForms.push(fact.suggested_value);
    if (fact.field_key === "program") profile.programs.push(fact.suggested_value);
    if (fact.field_key === "collective") profile.collectives.push(fact.suggested_value);
  }
  return { profile, facts: factsResult.data || [], profileHash: hash({ stored, facts: factsResult.data || [] }) };
}

async function loadOpportunities(supabase) {
  const { data, error } = await supabase.from("platform_opportunity_versions").select(`
    id, opportunity_id, source_url, official_url, deadline_text, deadline_status,
    deadline_confidence, eligibility_text, criteria_text,
    platform_opportunities!inner(id, title, territory, themes, status)
  `).eq("version_status", "current").in("deadline_status", ["open", "rolling"])
    .in("platform_opportunities.status", ["open", "rolling"]).limit(500);
  if (error) throw error;
  return data || [];
}

async function persistRecommendations(supabase, run, profileContext, versions) {
  const rows = versions.map((version) => {
    const opportunity = Array.isArray(version.platform_opportunities)
      ? version.platform_opportunities[0]
      : version.platform_opportunities;
    const result = matchOpportunity(profileContext.profile, {
      versionId: version.id,
      title: opportunity.title,
      territory: opportunity.territory,
      themes: opportunity.themes,
      deadlineStatus: version.deadline_status,
      deadlineConfidence: version.deadline_confidence,
      deadlineText: version.deadline_text,
      eligibilityText: version.eligibility_text,
      criteriaText: version.criteria_text,
      sourceUrl: version.source_url,
      officialUrl: version.official_url
    });
    return {
      tenant_id: run.tenant_id,
      opportunity_id: version.opportunity_id,
      opportunity_version_id: version.id,
      agent_run_id: run.id,
      score: result.score,
      recommendation_status: result.recommendationStatus,
      reasons_json: result.reasons,
      risks_json: result.risks,
      missing_information_json: result.missingInformation,
      evidence_json: result.evidence,
      internal_fact_refs_json: result.internalFactRefs,
      profile_snapshot_hash: profileContext.profileHash,
      human_review_status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString()
    };
  });
  if (!rows.length) return [];
  const { data, error } = await supabase.from("tenant_opportunity_recommendations")
    .upsert(rows, { onConflict: "tenant_id,opportunity_id,opportunity_version_id" })
    .select("id, recommendation_status, score");
  if (error) throw error;
  return data || [];
}

async function main() {
  await prepareEnv();
  const supabase = client();
  const run = await claim(supabase);
  if (!run) return console.log(JSON.stringify({ mode: "idle", message: "No hay cálculos de encaje en cola." }, null, 2));
  try {
    const profileContext = await loadProfile(supabase, run.tenant_id);
    const versions = await loadOpportunities(supabase);
    const recommendations = await persistRecommendations(supabase, run, profileContext, versions);
    const counts = recommendations.reduce((total, item) => ({ ...total, [item.recommendation_status]: (total[item.recommendation_status] || 0) + 1 }), {});
    const { error } = await supabase.from("tenant_agent_runs").update({
      status: "review_required",
      provider: "deterministic_tenant_match",
      context_manifest_json: {
        profileSnapshotHash: profileContext.profileHash,
        approvedFactRefs: profileContext.profile.approvedFactRefs,
        opportunityVersionIds: versions.map((version) => version.id),
        allowedDataClasses: ["public", "internal_approved"],
        humanReviewRequired: true
      },
      output_json: { recommendationIds: recommendations.map((item) => item.id), counts, advisoryOnly: true },
      usage_json: { opportunities: versions.length, external_ai_calls: 0 },
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", run.id);
    if (error) throw error;
    await supabase.from("audit_events").insert({
      tenant_id: run.tenant_id,
      actor_user_id: run.requested_by,
      actor_label: "tenant-match-worker",
      action: "match_agent.generated_for_review",
      target_type: "agent_run",
      target_id: run.id,
      detail_json: { recommendations: recommendations.length, counts, approved_fact_count: profileContext.facts.length, external_ai_calls: 0 }
    });
    console.log(JSON.stringify({ mode: "matched", runId: run.id, recommendations: recommendations.length, counts }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await supabase.from("tenant_agent_runs").update({
      status: "failed", error: message.slice(0, 4000), finished_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", run.id);
    throw error;
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
