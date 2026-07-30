import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";
import { isMissingBasesSchema } from "../src/platformBases.js";

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

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    if (isMissingBasesSchema(error)) return res.status(503).json(fail("La revision de bases aun no esta activada en este entorno"));
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
