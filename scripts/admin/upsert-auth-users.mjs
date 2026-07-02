import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import WebSocket from "ws";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found || data.users.length < 1000) return found || null;
  }
  throw new Error("Demasiados usuarios para busqueda local por email.");
}

async function upsertUser(supabase, email, password) {
  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error) throw error;
  return data.user;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} es obligatorio.`);
  return value;
}

loadLocalEnv();

const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket }
});

const superadminEmail = process.env.AUTH_SUPERADMIN_EMAIL || "vicentmirabarrachina@gmail.com";
const tenantEmail = process.env.AUTH_TENANT_ADMIN_EMAIL || "admin@novaterra.org.es";
const tenantSlug = process.env.AUTH_TENANT_SLUG || "novaterra-demo";
const superadminPassword = requireEnv("AUTH_SUPERADMIN_PASSWORD");
const tenantPassword = requireEnv("AUTH_TENANT_ADMIN_PASSWORD");

const superadmin = await upsertUser(supabase, superadminEmail, superadminPassword);
const tenantAdmin = await upsertUser(supabase, tenantEmail, tenantPassword);

const { data: org, error: orgError } = await supabase
  .from("organizations")
  .select("id, name, slug")
  .eq("slug", tenantSlug)
  .single();
if (orgError) throw orgError;

const { error: membershipError } = await supabase.from("organization_memberships").upsert(
  {
    tenant_id: org.id,
    auth_user_id: tenantAdmin.id,
    role: "owner",
    status: "active",
    updated_at: new Date().toISOString()
  },
  { onConflict: "tenant_id,auth_user_id" }
);
if (membershipError) throw membershipError;

await supabase.from("audit_events").insert({
  tenant_id: org.id,
  actor_user_id: superadmin.id,
  actor_label: superadminEmail,
  action: "auth.users_seeded",
  target_type: "organization",
  target_id: org.id,
  detail_json: { tenant_admin_email: tenantEmail, provider: "supabase_auth" }
});

const allowlist = `${process.env.PLATFORM_ADMIN_EMAILS || ""},${process.env.AUTH_SUPERADMIN_EMAIL || ""}`.toLowerCase();
if (!allowlist.includes(superadminEmail.toLowerCase())) {
  console.warn("Aviso: PLATFORM_ADMIN_EMAILS o AUTH_SUPERADMIN_EMAIL debe incluir el email superadmin para acceder a Plataforma.");
}

console.log(`Credenciales Supabase preparadas para superadmin y tenant ${org.slug}.`);
