import { createClient } from "@supabase/supabase-js";
import type { WebSocketLikeConstructor } from "@supabase/realtime-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";
import { fail, ok } from "../src/apiResponse.js";
import { logInfo, logWarn } from "../src/logger.js";
import { getSupabaseAdmin, isPlatformAdminEmail } from "../src/supabaseAdmin.js";

function loadLocalEnv() {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadLocalEnv();

function getAuthClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_ANON_KEY son obligatorias para login.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as unknown as WebSocketLikeConstructor }
  });
}

async function tenantSession(userId: string, email: string, accessToken: string, expiresAt?: number) {
  const supabase = getSupabaseAdmin();
  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select("tenant_id, role")
    .eq("auth_user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!membership?.tenant_id) return null;

  const { data: config } = await supabase
    .from("tenant_configs")
    .select("display_name, logo_url, primary_color, status")
    .eq("tenant_id", membership.tenant_id)
    .maybeSingle();

  await supabase.from("audit_events").insert({
    tenant_id: membership.tenant_id,
    actor_user_id: userId,
    actor_label: email,
    action: "auth.login",
    target_type: "session",
    target_id: userId,
    detail_json: { role: membership.role, provider: "supabase_auth" }
  });

  return {
    email,
    role: "entity",
    tenantRole: membership.role,
    tenantId: membership.tenant_id,
    tenantStatus: config?.status || "unknown",
    label: config?.display_name || "Admin entidad",
    plan: {
      code: "mission_full",
      label: "Plan integral piloto",
      billingStatus: "Contratado",
      features: ["dashboard", "opportunities", "entity", "agents", "workspace", "audit", "plan"],
      note: "Novaterra tiene todos los agentes habilitados durante el piloto."
    },
    screen: "entity",
    accessToken,
    expiresAt
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    loadLocalEnv();
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));

    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email.includes("@") || password.length < 8) return res.status(400).json(fail("Credenciales incompletas"));

    const auth = getAuthClient();
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    const user = data.user;
    const session = data.session;
    if (error || !user?.id || !user.email || !session?.access_token) {
      logWarn("auth.login_rejected", { email });
      return res.status(401).json(fail("Credenciales no validas"));
    }

    if (isPlatformAdminEmail(user.email)) {
      logInfo("auth.platform_login", { email: user.email });
      return res.status(200).json(
        ok({
          email: user.email,
          role: "superadmin",
          tenantId: null,
          label: "Superadmin plataforma",
          plan: {
            code: "platform_ops",
            label: "Operacion de plataforma",
            billingStatus: "Interno",
            features: ["dashboard", "opportunities", "agents", "audit", "platform", "operations", "plan"],
            note: "El superadmin opera fuentes, agentes globales y cobertura de plataforma."
          },
          screen: "platform",
          accessToken: session.access_token,
          expiresAt: session.expires_at
        })
      );
    }

    const tenant = await tenantSession(user.id, user.email, session.access_token, session.expires_at);
    if (!tenant) return res.status(403).json(fail("Usuario sin tenant activo"));
    return res.status(200).json(ok(tenant));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("obligatorias") ? 500 : 400;
    return res.status(status).json(fail(message));
  }
}
