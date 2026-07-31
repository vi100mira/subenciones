import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorMessage, fail, ok } from "../src/apiResponse.js";
import { storedPrivatePreflightCanQueue } from "../src/privateSourcePreflight.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

const SESSION_TTL_MS = 15 * 60_000;

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    const sourceId = String(req.body?.sourceConnectionId || "");
    if (!sourceId) return res.status(400).json(fail("Falta sourceConnectionId"));

    const supabase = getSupabaseAdmin();
    await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
    const { data: source, error: sourceError } = await supabase.from("source_connections")
      .select("id, kind, scope, status, config_json").eq("id", sourceId).eq("tenant_id", actor.tenantId).maybeSingle();
    if (sourceError) throw sourceError;
    if (!source || source.scope !== "tenant_private" || source.kind !== "local_simulation" || source.status !== "active") {
      return res.status(409).json(fail("La fuente local no está activa para esta entidad"));
    }
    if (!storedPrivatePreflightCanQueue(source.config_json)) {
      return res.status(409).json(fail("La carpeta debe superar el preanálisis antes de conectar el puente"));
    }

    const { data: consent, error: consentError } = await supabase.from("tenant_data_consents")
      .select("id, scope_json").eq("tenant_id", actor.tenantId).eq("consent_type", "manual_upload")
      .eq("status", "granted").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (consentError) throw consentError;
    const scope = consent?.scope_json || {};
    if (!consent || scope.readOnly !== true || scope.externalTransfer !== false) {
      return res.status(409).json(fail("El consentimiento de carpeta local ya no es válido"));
    }

    const now = new Date(); const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
    await supabase.from("local_bridge_sessions").update({ status: "revoked", revoked_at: now.toISOString(), revoked_by: actor.userId })
      .eq("tenant_id", actor.tenantId).eq("source_connection_id", source.id).eq("status", "active");
    const token = crypto.randomBytes(32).toString("base64url");
    const { data: session, error: insertError } = await supabase.from("local_bridge_sessions").insert({
      tenant_id: actor.tenantId, source_connection_id: source.id, issued_to: actor.userId,
      token_hash: hashToken(token), expires_at: expiresAt
    }).select("id, expires_at").single();
    if (insertError) throw insertError;
    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.email,
      action: "local_bridge.session_issued", target_type: "source_connection", target_id: source.id,
      detail_json: { session_id: session.id, expires_at: expiresAt, read_only: true, external_transfer: false }
    });
    return res.status(201).json(ok({
      sessionId: session.id, token, expiresAt,
      scope: { tenantId: actor.tenantId, sourceConnectionId: source.id, readOnly: true, externalTransfer: false }
    }));
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("Permiso") || message.includes("no incluido") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
