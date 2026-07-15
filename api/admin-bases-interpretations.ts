import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";
import { isMissingBasesSchema } from "../src/platformBases.js";

const REVIEW_ACTIONS = new Set(["approve", "reject"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const status = typeof req.query.status === "string" ? req.query.status : "review_required";
      const { data, error } = await supabase.from("platform_bases_interpretations").select(`
        id, opportunity_version_id, source_artifact_id, interpreter_version, status, method,
        contract_json, citations_verified, provider, model, usage_json, error, review_note,
        reviewed_at, created_at, updated_at,
        platform_source_artifacts(source_url, source_sha256, page_count, extraction_method),
        platform_opportunity_versions(source_url, bases_url,
          platform_opportunities(canonical_key, title, funder_name))
      `).eq("status", status).order("updated_at", { ascending: false }).limit(100);
      if (error) throw error;
      return res.status(200).json(ok(data || []));
    }

    if (req.method === "PATCH") {
      const { interpretationId, action, note = "" } = req.body || {};
      if (typeof interpretationId !== "string" || !interpretationId) return res.status(400).json(fail("Falta interpretationId"));
      if (!REVIEW_ACTIONS.has(action)) return res.status(400).json(fail("Accion de revision invalida"));
      const { data: current, error: currentError } = await supabase.from("platform_bases_interpretations")
        .select("id, status, citations_verified, contract_json, opportunity_version_id")
        .eq("id", interpretationId).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return res.status(404).json(fail("Interpretacion no encontrada"));
      if (!['review_required', 'approved', 'rejected'].includes(current.status)) return res.status(409).json(fail("La interpretacion aun no esta lista para revision"));
      if (action === "approve" && !current.citations_verified) return res.status(409).json(fail("No se puede aprobar: las citas no estan verificadas contra las bases"));

      const status = action === "approve" ? "approved" : "rejected";
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("platform_bases_interpretations").update({
        status, reviewed_by: actor.userId, reviewed_at: now,
        review_note: String(note || "").trim().slice(0, 2000), updated_at: now
      }).eq("id", interpretationId)
        .select("id, opportunity_version_id, status, citations_verified, contract_json, review_note, reviewed_at").single();
      if (error) throw error;
      return res.status(200).json(ok({ interpretation: data, message: status === "approved"
        ? "Bloque de bases aprobado. La candidatura se habilitara cuando el conjunto cubra los cuatro requisitos esenciales."
        : "Bloque de bases rechazado; no se utilizara para documentacion ni redaccion." }));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    if (isMissingBasesSchema(error)) return res.status(503).json(fail("La revision de bases aun no esta activada en este entorno"));
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
