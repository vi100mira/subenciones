import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function loadEnv(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function prepareEnv() {
  for (const file of [".env.local", ".env"]) {
    try { loadEnv(await fs.readFile(file, "utf8")); } catch { /* opcional */ }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function suite(supabase, tenantId) {
  const { data, error } = await supabase.from("tenant_agent_configs")
    .select("agent_key, status, enabled, status_reason").eq("tenant_id", tenantId).order("agent_key");
  if (error) throw error;
  return data || [];
}

async function provision(supabase, blueprint) {
  const { data, error } = await supabase.rpc("provision_tenant_agent_suite", { blueprint, actor_user_id: null, actor_label: "recovery-verifier" });
  if (error) throw error;
  return data;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
  const slug = slugArg?.slice(7) || `recovery-fixture-${Date.now()}`;
  assert(/^recovery-fixture-[a-z0-9-]+$/.test(slug), "La prueba solo admite slugs recovery-fixture-*");
  const blueprint = {
    version: 1,
    entity: { name: "Entidad de recuperación", slug, displayName: "Entidad de recuperación", websiteUrl: "https://recovery.example", primaryColor: "#24515a" },
    profile: { legal_form: "fundación", territory: "Comunitat Valenciana", themes: ["inclusión"], review_state: "approved" },
    motivations: { disposable_recovery_test: true }
  };
  if (!apply) return console.log(JSON.stringify({ mode: "dry-run", slug, steps: ["provision", "grant disposable gates", "archive", "restore", "delete fixture", "reprovision same slug", "cleanup"] }, null, 2));
  await prepareEnv();
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && key, "Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let tenantId = null;
  try {
    const first = await provision(supabase, blueprint);
    tenantId = first.tenantId;
    assert((await suite(supabase, tenantId)).length === 6, "La primera provisión no creó seis agentes");
    const now = new Date().toISOString();
    const { error: consentError } = await supabase.from("tenant_data_consents").update({ status: "granted", granted_at: now, scope_json: { recovery_test: true } })
      .eq("tenant_id", tenantId).in("consent_type", ["public_web_analysis", "ai_processing"]);
    if (consentError) throw consentError;
    const { error: sourceError } = await supabase.from("source_connections").update({ status: "active", approved_at: now })
      .eq("tenant_id", tenantId).eq("label", "Web pública de la entidad");
    if (sourceError) throw sourceError;
    const { error: activeError } = await supabase.from("tenant_configs").update({ status: "active" }).eq("tenant_id", tenantId);
    if (activeError) throw activeError;
    const { error: reconcileError } = await supabase.rpc("reconcile_tenant_agent_suite", { target_tenant_id: tenantId });
    if (reconcileError) throw reconcileError;
    assert((await suite(supabase, tenantId)).every((agent) => agent.enabled && agent.status === "ready"), "No quedaron seis agentes listos tras abrir puertas");
    await supabase.from("tenant_configs").update({ status: "archived" }).eq("tenant_id", tenantId);
    await supabase.from("tenant_agent_configs").update({ status: "paused", enabled: false, status_reason: "Tenant archivado" }).eq("tenant_id", tenantId);
    assert((await suite(supabase, tenantId)).every((agent) => !agent.enabled), "El archivo dejó agentes habilitados");
    await supabase.from("tenant_configs").update({ status: "active" }).eq("tenant_id", tenantId);
    await supabase.from("tenant_agent_configs").update({ status: "requested", status_reason: "Restauración solicitada" }).eq("tenant_id", tenantId).eq("status_reason", "Tenant archivado");
    await supabase.rpc("reconcile_tenant_agent_suite", { target_tenant_id: tenantId });
    assert((await suite(supabase, tenantId)).every((agent) => agent.enabled), "La restauración no recuperó los agentes");
    const { error: deleteError } = await supabase.from("organizations").delete().eq("id", tenantId).eq("slug", slug);
    if (deleteError) throw deleteError;
    tenantId = null;
    const second = await provision(supabase, blueprint);
    tenantId = second.tenantId;
    const rebuilt = await suite(supabase, tenantId);
    assert(rebuilt.length === 6, "La reconstrucción no recuperó el catálogo completo");
    assert(rebuilt.some((agent) => agent.agent_key === "entity_research" && !agent.enabled), "La reconstrucción copió consentimiento web");
    console.log(JSON.stringify({ mode: "verified", slug, agents: rebuilt.length, archiveRestore: "ok", recreateSameSlug: "ok", consentsRegrantedAutomatically: false }, null, 2));
  } finally {
    if (tenantId) await supabase.from("organizations").delete().eq("id", tenantId).eq("slug", slug);
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
