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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} es obligatorio.`);
  return value;
}

function allowedPlatformEmail(email) {
  return `${process.env.PLATFORM_ADMIN_EMAILS || ""},${process.env.AUTH_SUPERADMIN_EMAIL || ""}`
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

async function signIn(auth, email, password) {
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.user?.id || !data.session?.access_token) throw new Error(`Login fallido para ${email}`);
  return data.user;
}

loadLocalEnv();

const url = requireEnv("SUPABASE_URL");
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || requireEnv("VITE_SUPABASE_ANON_KEY");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const options = { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: WebSocket } };
const auth = createClient(url, anonKey, options);
const admin = createClient(url, serviceKey, options);

const superadminEmail = process.env.AUTH_SUPERADMIN_EMAIL || "vicentmirabarrachina@gmail.com";
const tenantEmail = process.env.AUTH_TENANT_ADMIN_EMAIL || "admin@novaterra.org.es";
const superadmin = await signIn(auth, superadminEmail, requireEnv("AUTH_SUPERADMIN_PASSWORD"));
const tenant = await signIn(auth, tenantEmail, requireEnv("AUTH_TENANT_ADMIN_PASSWORD"));

if (!allowedPlatformEmail(superadmin.email || "")) throw new Error("Superadmin no esta en allowlist de plataforma.");

const { data: membership, error } = await admin
  .from("organization_memberships")
  .select("tenant_id, role, status, organizations(slug)")
  .eq("auth_user_id", tenant.id)
  .eq("status", "active")
  .limit(1)
  .single();
if (error || !membership?.tenant_id) throw new Error("Tenant admin sin membership activa.");

console.log(
  JSON.stringify({
    superadmin: { email: superadmin.email, role: "superadmin", allowlisted: true },
    tenantAdmin: { email: tenant.email, role: membership.role, status: membership.status, tenantSlug: membership.organizations?.slug }
  })
);
