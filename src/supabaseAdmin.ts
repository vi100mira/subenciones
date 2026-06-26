import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias en entorno servidor.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function bearerToken(authorization: string | string[] | undefined): string {
  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!value) return "";
  return value.trim().toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
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

  const allowedEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.includes(user.email.toLowerCase())) throw new Error("Permiso de plataforma insuficiente");
  return { userId: user.id, email: user.email };
}

export async function requireSourcePermission(
  authorization: string | string[] | undefined,
  permission: SourcePermission,
  requestedTenantId?: string | string[]
): Promise<{ userId: string; tenantId: string; role: string }> {
  const token = bearerToken(authorization);
  if (!token) throw new Error("No autorizado");

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) throw new Error("Token invalido");

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("tenant_id, role")
    .eq("auth_user_id", userData.user.id)
    .eq("status", "active")
    .match(typeof requestedTenantId === "string" ? { tenant_id: requestedTenantId } : {})
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.tenant_id) throw new Error("Sin pertenencia activa a entidad");

  const role = String(membership.role || "").toLowerCase();
  const allowed =
    role === "owner" ||
    role === "admin" ||
    (permission === "sources:read" && ["reader", "analyst", "member"].includes(role));

  if (!allowed) throw new Error("Permiso insuficiente");

  return {
    userId: userData.user.id,
    tenantId: String(membership.tenant_id),
    role
  };
}
