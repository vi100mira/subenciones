import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function readEnv(file) {
  const values = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

function service(env) {
  const url = env.APP_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.APP_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("El fichero de entorno no contiene acceso servidor a Supabase.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: WebSocket } });
}

function snapshotHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function required(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function main() {
  const fromFile = option("--from-env");
  const toFile = option("--to-env");
  const tenantId = option("--tenant-id");
  const email = option("--email").trim().toLowerCase();
  const backupDir = option("--backup-dir") || path.join(process.cwd(), ".tmp", `tenant-config-backup-${Date.now()}`);
  const apply = process.argv.includes("--apply");
  if (!fromFile || !toFile || !tenantId || !email) throw new Error("Uso: --from-env --to-env --tenant-id --email [--backup-dir] [--apply]");

  const source = service(readEnv(fromFile));
  const target = service(readEnv(toFile));
  const [organization, config, connections, agents, users] = await Promise.all([
    required(await source.from("organizations").select("*").eq("id", tenantId).maybeSingle(), "Organización origen"),
    required(await source.from("tenant_configs").select("*").eq("tenant_id", tenantId).maybeSingle(), "Configuración origen"),
    required(await source.from("source_connections").select("*").eq("tenant_id", tenantId).order("created_at"), "Conexiones origen"),
    required(await source.from("tenant_agent_configs").select("*").eq("tenant_id", tenantId).order("agent_key"), "Agentes origen"),
    source.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);
  if (!organization || !config) throw new Error("No existe una configuración completa para el tenant indicado.");
  if (users.error) throw new Error(`Usuarios origen: ${users.error.message}`);
  const oldUser = users.data.users.find((user) => String(user.email || "").toLowerCase() === email);
  const memberships = await required(await source.from("organization_memberships").select("role,status").eq("tenant_id", tenantId).eq("auth_user_id", oldUser?.id || "00000000-0000-0000-0000-000000000000").maybeSingle(), "Membresía origen");
  const backup = { tenantId, exportedAt: new Date().toISOString(), organization, config, connections, agents, membership: memberships || null };
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, "tenant-configuration.json"), JSON.stringify(backup, null, 2));
  fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify({ tenantId, hash: snapshotHash(backup), connections: connections.length, agents: agents.length }, null, 2));

  const newUsers = await target.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (newUsers.error) throw new Error(`Usuarios destino: ${newUsers.error.message}`);
  const newUser = newUsers.data.users.find((user) => String(user.email || "").toLowerCase() === email);
  if (!newUser) throw new Error("El usuario indicado no existe en el proyecto nuevo.");
  const existing = await required(await target.from("organizations").select("id").eq("id", tenantId).maybeSingle(), "Precomprobación destino");
  const definitions = await required(await target.from("platform_agent_definitions").select("agent_key"), "Catálogo de agentes destino");
  const available = new Set(definitions.map((item) => item.agent_key));
  const missing = agents.map((item) => item.agent_key).filter((key) => !available.has(key));
  const result = { mode: apply ? "apply" : "dry_run", tenant: organization.name, tenantId, connections: connections.length, agents: agents.length, backupDir, snapshotHash: snapshotHash(backup), missingAgentDefinitions: missing };
  if (!apply) return console.log(JSON.stringify(result, null, 2));
  if (existing) throw new Error("El tenant ya existe en el proyecto nuevo; no se sobrescribe.");
  if (missing.length) throw new Error(`Faltan definiciones de agentes: ${missing.join(", ")}`);

  let created = false;
  try {
    await required(await target.from("organizations").insert({ id: organization.id, name: organization.name, slug: organization.slug }), "Crear organización");
    created = true;
    await required(await target.from("tenant_configs").insert({ tenant_id: tenantId, display_name: config.display_name, logo_url: config.logo_url, primary_color: config.primary_color, status: config.status, profile_json: config.profile_json, motivations_json: config.motivations_json, created_by: newUser.id }), "Restaurar configuración");
    await required(await target.from("organization_memberships").insert({ tenant_id: tenantId, auth_user_id: newUser.id, role: memberships?.role || "owner", status: "active" }), "Vincular administrador");
    if (connections.length) await required(await target.from("source_connections").insert(connections.map((item) => ({ tenant_id: tenantId, label: item.label, kind: item.kind, scope: item.scope, status: item.status, health_status: "unknown", priority: item.priority, config_json: item.config_json, cursor_json: null, last_synced_at: null, created_by: newUser.id, approved_by: null, approved_at: null }))), "Restaurar conexiones");
    if (agents.length) await required(await target.from("tenant_agent_configs").insert(agents.map((item) => ({ tenant_id: tenantId, agent_key: item.agent_key, status: item.enabled ? "requested" : "disabled", enabled: item.enabled, permissions_json: item.permissions_json, config_json: item.config_json, status_reason: "Configuración restaurada; pendiente de verificación en el entorno nuevo.", provisioned_version: item.provisioned_version, activated_at: null, last_verified_at: null }))), "Restaurar agentes");
    await required(await target.from("audit_events").insert({ tenant_id: tenantId, actor_user_id: newUser.id, actor_label: email, action: "tenant.configuration_restored", target_type: "tenant", target_id: tenantId, detail_json: { source: "previous_supabase_project", copied: { configuration: true, connections: connections.length, agents: agents.length }, excluded: ["source_documents", "recommendations", "agent_runs", "audit_history", "candidate_documents"] } }), "Auditar restauración");
  } catch (error) {
    if (created) await target.from("organizations").delete().eq("id", tenantId);
    throw error;
  }
  console.log(JSON.stringify({ ...result, restored: true, excluded: ["source_documents", "recommendations", "agent_runs", "audit_history", "candidate_documents"] }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exit(1); });
