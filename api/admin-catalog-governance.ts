import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

const ACTIONS = new Set(["clear_operational_exception", "place_security_hold"]);

function text(value: unknown, limit: number) { return typeof value === "string" ? value.trim().slice(0, limit) : ""; }
function evidence(value: any) {
  const sourceUrl = text(value?.sourceUrl, 2000);
  if (!sourceUrl || !/^https:\/\//.test(sourceUrl)) throw new Error("La excepción técnica requiere una URL HTTPS de evidencia");
  return { source_url: sourceUrl, excerpt: text(value?.excerpt, 2000), captured_at: new Date().toISOString() };
}
function missingSchema(error: any) { return ["42P01", "PGRST205", "42703"].includes(String(error?.code || "")); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();
    if (req.method === "GET") {
      const [candidates, events] = await Promise.all([
        supabase.from("platform_private_source_candidates").select("id, organization_name, official_url, review_status, technical_state, technical_reason, technical_evidence_json, updated_at").in("technical_state", ["operational_exception", "operational_hold"]).order("updated_at", { ascending: false }).limit(200),
        supabase.from("platform_radar_operation_events").select("resource_id, transition, from_state, to_state, actor_scope, reason, evidence_json, created_at").order("created_at", { ascending: false }).limit(100)
      ]);
      for (const result of [candidates, events]) if (result.error) throw result.error;
      return res.status(200).json(ok({ candidates: candidates.data || [], events: events.data || [], scope: "platform_superadmin_technical_operations_only" }));
    }
    if (req.method !== "PATCH") return res.status(405).json(fail("Method Not Allowed"));
    const resourceId = text(req.body?.resourceId, 80);
    const action = text(req.body?.action, 40);
    const reason = text(req.body?.reason, 2000);
    if (!resourceId || !ACTIONS.has(action) || !reason) return res.status(400).json(fail("Fuente, acción técnica y motivo son obligatorios"));
    const evidenceJson = evidence(req.body?.evidence);
    const current = await supabase.from("platform_private_source_candidates").select("id, technical_state").eq("id", resourceId).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) return res.status(404).json(fail("Fuente candidata no encontrada"));
    if (!["operational_exception", "operational_hold"].includes(current.data.technical_state)) return res.status(409).json(fail("Solo se resuelven excepciones técnicas pendientes"));
    const next = action === "clear_operational_exception" ? "automated_evidence_checked" : "operational_hold";
    const now = new Date().toISOString();
    const update = await supabase.from("platform_private_source_candidates").update({ technical_state: next, technical_reason: reason, technical_evidence_json: evidenceJson, technical_updated_at: now, updated_at: now }).eq("id", resourceId).eq("technical_state", current.data.technical_state).select("id, technical_state, technical_updated_at").maybeSingle();
    if (update.error) throw update.error;
    if (!update.data) return res.status(409).json(fail("La excepción técnica ya cambió"));
    const event = await supabase.from("platform_radar_operation_events").insert({ resource_type: "private_source_candidate", resource_id: resourceId, transition: action, from_state: current.data.technical_state, to_state: next, actor_scope: "platform_superadmin", actor_user_id: actor.userId, reason, evidence_json: evidenceJson });
    if (event.error) throw event.error;
    return res.status(200).json(ok({ source: update.data, message: "Excepción técnica registrada; no aprueba bases, elegibilidad, relevancia, matching, alertas ni publicación." }));
  } catch (error) {
    if (missingSchema(error)) return res.status(503).json(fail("La operación técnica del radar no está activada en este entorno"));
    const message = error instanceof Error ? error.message : "Error inesperado";
    return res.status(message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400).json(fail(message));
  }
}
