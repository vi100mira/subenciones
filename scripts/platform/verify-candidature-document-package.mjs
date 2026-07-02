import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import WebSocket from "ws";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const endpoint = process.env.CANDIDATURE_PACKAGE_API_URL || "http://127.0.0.1:4190/api/candidature-document-package";
const defaultTenantEmail = "pmira@novaterra.org.es";

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

function missingEnv() {
  const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return [
    ["SUPABASE_URL", process.env.SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
    ["SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY", anon],
    ["TENANT_AUTH_OR_TOKEN", (process.env.CANDIDATURE_TENANT_ACCESS_TOKEN && process.env.CANDIDATURE_TENANT_ID) || (process.env.AUTH_TENANT_ADMIN_PASSWORD || process.env.AUTH_SUPERADMIN_PASSWORD)],
    ["BLOB_READ_WRITE_TOKEN", process.env.BLOB_READ_WRITE_TOKEN]
  ].filter(([, value]) => !value).map(([name]) => name);
}

function client(key) {
  return createClient(process.env.SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket }
  });
}

async function tenantSession() {
  if (process.env.CANDIDATURE_TENANT_ACCESS_TOKEN && process.env.CANDIDATURE_TENANT_ID) {
    return {
      accessToken: process.env.CANDIDATURE_TENANT_ACCESS_TOKEN,
      tenantId: process.env.CANDIDATURE_TENANT_ID,
      tenantSlug: process.env.CANDIDATURE_TENANT_SLUG || "token-provided",
      role: "token"
    };
  }
  const auth = client(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const admin = client(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const email = process.env.AUTH_TENANT_ADMIN_EMAIL || defaultTenantEmail;
  const password = process.env.AUTH_TENANT_ADMIN_PASSWORD || process.env.AUTH_SUPERADMIN_PASSWORD;
  const { data: signIn, error: signInError } = await auth.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session?.access_token || !signIn.user?.id) throw new Error("Login tenant fallido.");

  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .select("tenant_id, role, status, organizations(slug)")
    .eq("auth_user_id", signIn.user.id)
    .eq("status", "active")
    .limit(1)
    .single();
  if (membershipError || !membership?.tenant_id) throw new Error("Tenant admin sin membership activa.");

  return { accessToken: signIn.session.access_token, tenantId: membership.tenant_id, tenantSlug: membership.organizations?.slug, role: membership.role };
}

function fixtureDocuments() {
  return [{
    id: "memory",
    title: "Memoria tecnica verificacion",
    filename: "memoria-verificacion.doc",
    sections: [
      { title: "Aviso de uso", lines: "Documento Word de verificacion. No presentar ni compartir." },
      { title: "Convocatoria", lines: ["Fuente controlada", "Revision humana obligatoria"] }
    ]
  }];
}

loadLocalEnv();
const missing = missingEnv();
if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    endpoint,
    readyForApply: missing.length === 0,
    missing,
    contract: {
      requiresTenantAuth: true,
      writesUnder: "tenants/{tenantId}/candidatures/{opportunityId}/...",
      returnsPublicBlobUrl: false,
      requiresHumanReview: true
    }
  }, null, 2));
  process.exit(0);
}

if (missing.length) {
  console.error(JSON.stringify({ mode: "apply", ok: false, missing }, null, 2));
  process.exit(1);
}

try {
  const session = await tenantSession();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      "x-tenant-id": session.tenantId
    },
    body: JSON.stringify({
      opportunityId: `verify-package-${Date.now()}`,
      title: "Verificacion paquete documental",
      decisions: ["Verificacion tecnica sin uso externo.", "No se usa Drive tenant en esta prueba."],
      documents: fixtureDocuments()
    })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || `HTTP ${response.status}`);

  const documents = payload.data?.documents || [];
  const leakedUrl = documents.some((doc) => "url" in doc);
  const wrongPath = documents.some((doc) => !String(doc.pathname || "").startsWith(`tenants/${session.tenantId}/candidatures/`));
  if (!documents.length) throw new Error("La API no devolvio documentos.");
  if (leakedUrl) throw new Error("La API devolvio una URL publica de Blob.");
  if (wrongPath) throw new Error("La ruta Blob no esta limitada al tenant.");

  console.log(JSON.stringify({
    mode: "apply",
    ok: true,
    tenantSlug: session.tenantSlug,
    documents: documents.map((doc) => ({ id: doc.id, pathname: doc.pathname, sha256: doc.sha256, size: doc.size })),
    publicBlobUrlReturned: false
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ mode: "apply", ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
}
