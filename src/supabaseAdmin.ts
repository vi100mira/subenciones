import { createClient } from "@supabase/supabase-js";
import type { WebSocketLikeConstructor } from "@supabase/realtime-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";

function loadLocalServerEnv() {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

export function getSupabaseAdmin() {
  loadLocalServerEnv();
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias en entorno servidor.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: { transport: WebSocket as unknown as WebSocketLikeConstructor }
  });
}

export function bearerToken(authorization: string | string[] | undefined): string {
  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!value) return "";
  return value.trim().toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

export function isPlatformAdminEmail(email: string): boolean {
  const configured = [
    process.env.PLATFORM_ADMIN_EMAILS || "",
    process.env.AUTH_SUPERADMIN_EMAIL || ""
  ].join(",");
  const allowedEmails = configured
    .split(",")
    .map((allowedEmail) => allowedEmail.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(email.trim().toLowerCase());
}

export type SourcePermission = "sources:read" | "sources:write" | "sources:approve" | "sources:delete";

export async function requirePlatformAdmin(
  authorization: string | string[] | undefined
): Promise<{ userId: string; email: string }> {
  const token = bearerToken(authorization);
  if (!token) throw new Error("No autorizado");

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.id || !user.email) throw new Error("Token invalido");

  if (!isPlatformAdminEmail(user.email)) throw new Error("Permiso de plataforma insuficiente");
  return { userId: user.id, email: user.email };
}

export async function requireSourcePermission(
  authorization: string | string[] | undefined,
  permission: SourcePermission,
  requestedTenantId?: string | string[]
): Promise<{ userId: string; tenantId: string; role: string; email: string }> {
  const token = bearerToken(authorization);
  if (!token) throw new Error("No autorizado");

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    throw new Error("Token invalido");
  }
  const requestedTenant = typeof requestedTenantId === "string" ? requestedTenantId.trim() : "";
  if (requestedTenant && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedTenant)) {
    throw new Error("Token con tenant invalido");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("tenant_id, role")
    .eq("auth_user_id", userData.user.id)
    .eq("status", "active")
    .match(requestedTenant ? { tenant_id: requestedTenant } : {})
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }
  if (!membership?.tenant_id) {
    throw new Error("Token sin pertenencia activa a entidad");
  }

  const role = String(membership.role || "").toLowerCase();
  const allowed =
    role === "owner" ||
    role === "admin" ||
    (permission === "sources:read" && ["reader", "analyst", "member"].includes(role));

  if (!allowed) throw new Error("Permiso insuficiente");

  return {
    userId: userData.user.id,
    tenantId: String(membership.tenant_id),
    role,
    email: String(userData.user.email || role)
  };
}
