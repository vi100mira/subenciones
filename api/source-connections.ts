import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorMessage, fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

const PRIVATE_SOURCE_CONSENT: Record<string, string> = {
  local_simulation: "manual_upload", manual_upload: "manual_upload", vercel_blob: "manual_upload",
  google_drive: "drive_connection", microsoft_graph: "sharepoint_connection"
};

function safePrivateConfig(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  const input = config as Record<string, unknown>;
  const forbidden = Object.keys(input).some((key) => /token|secret|password|credential|path/i.test(key));
  if (forbidden || JSON.stringify(input).length > 4_000) throw new Error("La configuración contiene secretos, rutas locales o supera el límite permitido");
  return {
    connector: String(input.connector || ""), rootLabel: String(input.rootLabel || "").slice(0, 120),
    readOnly: input.readOnly === true, externalTransfer: false,
    includePersonalData: false, includeSensitiveData: false
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const permission = req.method === "GET" ? "sources:read" : "sources:write";
    const actor = await requireSourcePermission(req.headers.authorization, permission, requestedTenant(req));
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("source_connections")
        .select("id, label, kind, status, scope, priority, health_status, last_synced_at, created_at, updated_at")
        .eq("tenant_id", actor.tenantId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "POST") {
      const { label, kind, scope, config } = req.body || {};
      if (!label || !kind || !scope) return res.status(400).json(fail("Faltan label, kind o scope"));
      if (scope === "platform_public") {
        return res.status(403).json(fail("Las fuentes de plataforma se gestionan desde consola superadmin"));
      }
      const privateConsent = PRIVATE_SOURCE_CONSENT[String(kind)];
      if (privateConsent && scope !== "tenant_private") return res.status(400).json(fail("Las fuentes privadas deben usar alcance tenant_private"));
      if (scope === "tenant_private" && !privateConsent) return res.status(400).json(fail("Tipo de fuente privada no permitido"));
      const sanitizedConfig = scope === "tenant_private" ? safePrivateConfig(config) : (config || {});
      if (scope === "tenant_private") {
        const expectedConnector = kind === "google_drive" ? "google_drive"
          : kind === "microsoft_graph" ? "microsoft_graph" : ["local_folder", "manual_upload"];
        const connectorMatches = Array.isArray(expectedConnector)
          ? expectedConnector.includes(String(sanitizedConfig.connector)) : sanitizedConfig.connector === expectedConnector;
        if (!connectorMatches || sanitizedConfig.readOnly !== true) {
          return res.status(400).json(fail("La fuente privada debe coincidir con el conector autorizado y operar en solo lectura"));
        }
        const { data: consent, error: consentError } = await supabase.from("tenant_data_consents")
          .select("id").eq("tenant_id", actor.tenantId).eq("consent_type", privateConsent)
          .eq("status", "granted").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (consentError) throw consentError;
        if (!consent) return res.status(409).json(fail("La fuente privada requiere consentimiento vigente antes de registrarse"));
      }

      const { data, error } = await supabase
        .from("source_connections")
        .insert({
          tenant_id: actor.tenantId,
          label,
          kind,
          scope,
          config_json: sanitizedConfig,
          status: "pending_approval",
          health_status: "unknown",
          created_by: actor.userId
        })
        .select("id, label, kind, status, scope, priority, health_status, created_at")
        .single();

      if (error) throw error;
      await supabase.from("audit_events").insert({
        tenant_id: actor.tenantId, actor_user_id: actor.userId, actor_label: actor.role,
        action: "source_connection.requested", target_type: "source_connection", target_id: data.id,
        detail_json: { kind, scope, config_keys: Object.keys(sanitizedConfig as Record<string, unknown>) }
      });
      return res.status(201).json(ok(data));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
