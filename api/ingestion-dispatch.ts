import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorMessage, fail, ok } from "../src/apiResponse.js";
import { storedPrivatePreflightCanQueue } from "../src/privateSourcePreflight.js";
import { getSupabaseAdmin, requireSourcePermission } from "../src/supabaseAdmin.js";
import { requireTenantAgentEntitlement } from "../src/tenantPlan.js";

function requestedTenant(req: VercelRequest) {
  return req.headers["x-tenant-id"] || req.query.tenantId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json(fail("Method Not Allowed"));

  try {
    const actor = await requireSourcePermission(req.headers.authorization, "sources:write", requestedTenant(req));
    const { sourceConnectionId } = req.body || {};
    if (!sourceConnectionId || typeof sourceConnectionId !== "string") {
      return res.status(400).json(fail("Falta sourceConnectionId"));
    }

    const supabase = getSupabaseAdmin();
    const { data: source, error: sourceError } = await supabase
      .from("source_connections")
      .select("id, label, kind, scope, status, config_json")
      .eq("id", sourceConnectionId)
      .eq("tenant_id", actor.tenantId)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!source) return res.status(404).json(fail("Fuente no encontrada"));
    if (source.status !== "active") return res.status(409).json(fail("La fuente no esta activa"));
    if (["tenant_private", "tenant_internal"].includes(source.scope)) {
      await requireTenantAgentEntitlement(supabase, actor.tenantId, "draft_agent");
    }
    if (source.scope === "tenant_private" && !storedPrivatePreflightCanQueue(source.config_json)) {
      return res.status(409).json(fail("La fuente privada debe superar el preanálisis sin IA antes de encolarse"));
    }
    const { data: activeRun, error: activeRunError } = await supabase.from("ingestion_runs")
      .select("id, status, created_at").eq("tenant_id", actor.tenantId)
      .eq("source_connection_id", source.id).in("status", ["queued", "running"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (activeRunError) throw activeRunError;
    if (activeRun) return res.status(409).json(fail("Ya existe un análisis documental en cola o en curso para esta fuente"));

    const { data: run, error: runError } = await supabase
      .from("ingestion_runs")
      .insert({
        tenant_id: actor.tenantId,
        source_connection_id: source.id,
        status: "queued",
        requested_by: actor.userId
      })
      .select("id, status, created_at")
      .single();

    if (runError) throw runError;

    await supabase.from("audit_events").insert({
      tenant_id: actor.tenantId,
      actor_user_id: actor.userId,
      actor_label: actor.email,
      action: "private_ingestion.queued",
      target_type: "ingestion_run",
      target_id: run.id,
      detail_json: { source_connection_id: source.id, source_scope: source.scope, human_review_required: true }
    });

    return res.status(202).json(ok({
      run,
      message: "Ingesta encolada. El worker se conectara a la fuente y actualizara el estado."
    }));
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
