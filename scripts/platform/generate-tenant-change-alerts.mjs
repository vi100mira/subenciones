import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const simulateCriticalEvent = args.has("--simulate-critical-event");
const simulateDemoWatch = args.has("--simulate-demo-watch");

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

function titleFor(event, opportunity) {
  const label = event.change_type === "deadline" ? "Plazo actualizado" : event.change_type === "eligibility" ? "Criterios actualizados" : "Convocatoria actualizada";
  return `${label}: ${opportunity.title}`;
}

function messageFor(event) {
  const before = event.previous_value ? `Antes: ${event.previous_value}` : "Antes: no disponible";
  const after = event.new_value ? `Ahora: ${event.new_value}` : "Ahora: revisar evidencia";
  return `${event.summary}\n${before}\n${after}`;
}

function actionFor(event) {
  if (event.severity === "critical") return "Revisar calendario, elegibilidad y candidatura antes de continuar.";
  if (event.severity === "high") return "Revisar checklist, requisitos y documentos antes de exportar.";
  return "Revisar evidencia actualizada cuando sea posible.";
}

async function loadPendingEvents(supabase) {
  if (simulateCriticalEvent) {
    const { data: opportunity, error } = await supabase
      .from("platform_opportunities")
      .select("id, title, canonical_key")
      .eq("canonical_key", "fundacion-la-caixa-convocatorias-sociales")
      .single();
    if (error) throw error;
    return [{
      id: "simulated-critical-event",
      opportunity_id: opportunity.id,
      change_type: "deadline",
      severity: "critical",
      confidence: "medium",
      summary: "Simulated deadline update for tenant impact dry-run.",
      previous_value: "Consult territory-specific dates",
      new_value: "2026-09-12",
      evidence_json: { source_url: "simulation" },
      platform_opportunities: opportunity
    }];
  }

  const { data, error } = await supabase
    .from("platform_opportunity_change_events")
    .select("id, opportunity_id, change_type, severity, confidence, summary, previous_value, new_value, evidence_json, platform_opportunities(id, title, canonical_key)")
    .in("human_review_status", ["pending", "not_required"])
    .order("detected_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return data || [];
}

async function loadWatches(supabase, opportunityIds) {
  if (!opportunityIds.length) return [];
  const { data, error } = await supabase
    .from("tenant_opportunity_watches")
    .select("tenant_id, opportunity_id, reason, metadata_json")
    .in("opportunity_id", opportunityIds)
    .eq("status", "active");
  if (error) throw error;
  const watches = data || [];
  if (!simulateDemoWatch || watches.length) return watches;

  const { data: tenant, error: tenantError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "novaterra-demo")
    .single();
  if (tenantError) throw tenantError;
  return [{ tenant_id: tenant.id, opportunity_id: opportunityIds[0], reason: "manual_follow", metadata_json: { simulated: true } }];
}

async function loadExistingAlerts(supabase, eventIds) {
  if (!eventIds.length || simulateCriticalEvent) return new Set();
  const { data, error } = await supabase
    .from("tenant_change_alerts")
    .select("tenant_id, change_event_id")
    .in("change_event_id", eventIds);
  if (error) throw error;
  return new Set((data || []).map((item) => `${item.tenant_id}:${item.change_event_id}`));
}

async function main() {
  const supabase = await supabaseClient();
  const events = await loadPendingEvents(supabase);
  const eventIds = events.map((item) => item.id);
  const opportunityIds = [...new Set(events.map((item) => item.opportunity_id))];
  const watches = await loadWatches(supabase, opportunityIds);
  const existingAlerts = await loadExistingAlerts(supabase, eventIds);
  const watchesByOpportunity = new Map();
  for (const watch of watches) {
    const list = watchesByOpportunity.get(watch.opportunity_id) || [];
    list.push(watch);
    watchesByOpportunity.set(watch.opportunity_id, list);
  }

  const planned = [];
  for (const event of events) {
    const opportunity = event.platform_opportunities;
    for (const watch of watchesByOpportunity.get(event.opportunity_id) || []) {
      if (existingAlerts.has(`${watch.tenant_id}:${event.id}`)) continue;
      planned.push({
        tenant_id: watch.tenant_id,
        opportunity_id: event.opportunity_id,
        change_event_id: event.id,
        severity: event.severity,
        title: titleFor(event, opportunity),
        message: messageFor(event),
        recommended_action: actionFor(event),
        safe_channel_summary: `${titleFor(event, opportunity)}. Abrir la app para revisar evidencia y accion recomendada.`,
        metadata_json: {
          watch_reason: watch.reason,
          change_type: event.change_type,
          confidence: event.confidence,
          evidence: event.evidence_json
        }
      });
    }
  }

  if (apply && planned.length) {
    if (simulateCriticalEvent) throw new Error("No se puede aplicar una alerta basada en evento simulado.");
    const { error } = await supabase.from("tenant_change_alerts").upsert(planned, { onConflict: "tenant_id,change_event_id" });
    if (error) throw error;
  }

  console.log(JSON.stringify({
    mode: apply ? "applied" : "dry-run",
    events: events.length,
    watches: watches.length,
    plannedAlerts: planned.length,
    alerts: planned.map((item) => ({ tenant_id: item.tenant_id, severity: item.severity, title: item.title }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
