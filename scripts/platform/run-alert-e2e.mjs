import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const execFileAsync = promisify(execFile);
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const testMarker = { e2e: true, source: "platform:run-alert-e2e" };

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

async function loadFixture(supabase) {
  const [{ data: tenant, error: tenantError }, { data: opportunity, error: opportunityError }] = await Promise.all([
    supabase.from("organizations").select("id, slug").eq("slug", "novaterra-demo").single(),
    supabase
      .from("platform_opportunities")
      .select("id, title, canonical_key")
      .eq("canonical_key", "fundacion-la-caixa-convocatorias-sociales")
      .single()
  ]);
  if (tenantError) throw tenantError;
  if (opportunityError) throw opportunityError;

  const { data: watch, error: watchError } = await supabase
    .from("tenant_opportunity_watches")
    .select("id, reason, status")
    .eq("tenant_id", tenant.id)
    .eq("opportunity_id", opportunity.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (watchError) throw watchError;

  return { tenant, opportunity, watch };
}

async function cleanupStaleE2E(supabase) {
  const { data: events, error: eventsError } = await supabase
    .from("platform_opportunity_change_events")
    .select("id")
    .contains("evidence_json", testMarker);
  if (eventsError) throw eventsError;
  const eventIds = (events || []).map((item) => item.id);
  if (!eventIds.length) return 0;

  const { error: alertsError } = await supabase.from("tenant_change_alerts").delete().in("change_event_id", eventIds);
  if (alertsError) throw alertsError;
  const { error: deleteEventsError } = await supabase.from("platform_opportunity_change_events").delete().in("id", eventIds);
  if (deleteEventsError) throw deleteEventsError;
  return eventIds.length;
}

async function countPendingEvents(supabase) {
  const { count, error } = await supabase
    .from("platform_opportunity_change_events")
    .select("id", { count: "exact", head: true })
    .in("human_review_status", ["pending", "not_required"]);
  if (error) throw error;
  return count || 0;
}

async function insertE2EEvent(supabase, opportunity) {
  const { data, error } = await supabase
    .from("platform_opportunity_change_events")
    .insert({
      opportunity_id: opportunity.id,
      change_type: "deadline",
      severity: "critical",
      confidence: "medium",
      summary: "E2E controlled deadline change for tenant alert pipeline.",
      previous_value: "Consult territory-specific dates",
      new_value: "2026-09-12",
      evidence_json: { ...testMarker, source_url: "e2e://controlled-alert-pipeline" },
      human_review_status: "pending"
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function runWorker() {
  const { stdout } = await execFileAsync(process.execPath, ["scripts/platform/generate-tenant-change-alerts.mjs", "--apply"], {
    cwd: process.cwd(),
    env: process.env,
    windowsHide: true
  });
  return JSON.parse(stdout);
}

async function loadCreatedAlert(supabase, tenantId, eventId) {
  const { data, error } = await supabase
    .from("tenant_change_alerts")
    .select("id, status, severity, title")
    .eq("tenant_id", tenantId)
    .eq("change_event_id", eventId)
    .single();
  if (error) throw error;
  return data;
}

async function cleanupByIds(supabase, alertId, eventId) {
  if (alertId) {
    const { error } = await supabase.from("tenant_change_alerts").delete().eq("id", alertId);
    if (error) throw error;
  }
  if (eventId) {
    const { error } = await supabase.from("tenant_change_alerts").delete().eq("change_event_id", eventId);
    if (error) throw error;
  }
  if (eventId) {
    const { error } = await supabase.from("platform_opportunity_change_events").delete().eq("id", eventId);
    if (error) throw error;
  }
}

async function main() {
  const supabase = await supabaseClient();
  const staleEventsCleaned = apply ? await cleanupStaleE2E(supabase) : 0;
  const fixture = await loadFixture(supabase);
  const pendingBefore = await countPendingEvents(supabase);
  if (!fixture.watch) throw new Error("Falta un watch activo del tenant demo para la oportunidad de Fundacion la Caixa.");

  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
      tenant: fixture.tenant.slug,
      opportunity: fixture.opportunity.canonical_key,
      watch: fixture.watch.status,
      pendingEvents: pendingBefore,
      wouldCreateEvent: true,
      wouldRunWorker: true,
      wouldCleanArtifacts: true
    }, null, 2));
    return;
  }

  if (pendingBefore > 0) {
    throw new Error("La prueba e2e se detiene porque existen eventos pendientes reales; ejecutala cuando la cola este limpia.");
  }

  let eventId;
  let alertId;
  try {
    eventId = await insertE2EEvent(supabase, fixture.opportunity);
    const worker = await runWorker();
    const alert = await loadCreatedAlert(supabase, fixture.tenant.id, eventId);
    alertId = alert.id;

    const { error: resolveError } = await supabase
      .from("tenant_change_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    if (resolveError) throw resolveError;

    await cleanupByIds(supabase, alertId, eventId);
    alertId = undefined;
    eventId = undefined;

    console.log(JSON.stringify({
      mode: "applied",
      staleEventsCleaned,
      eventCreated: true,
      workerPlannedAlerts: worker.plannedAlerts,
      alertCreated: true,
      alertResolved: true,
      alertTitle: alert.title,
      cleanup: "complete"
    }, null, 2));
  } finally {
    await cleanupByIds(supabase, alertId, eventId);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
