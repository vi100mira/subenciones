import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin, requirePlatformAdmin } from "../src/supabaseAdmin.js";

const ROLES = new Set(["regulatory", "call", "application_form"]);
const AUTHORITIES = new Set(["official_registry", "official_journal", "issuing_body"]);
const ACTIONS = new Set(["approve", "reject"]);

function cleanUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2000) throw new Error("URL oficial no valida");
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("La fuente debe usar HTTPS sin credenciales");
  url.hash = "";
  return url.toString();
}

function missingSchema(error: any) {
  return ["42P01", "PGRST205"].includes(String(error?.code || ""))
    || /platform_supplementary_basis_sources.*(?:not exist|schema cache)/i.test(String(error?.message || ""));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await requirePlatformAdmin(req.headers.authorization);
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const status = typeof req.query.status === "string" ? req.query.status : "proposed";
      if (!["proposed", "approved", "rejected", "all"].includes(status)) return res.status(400).json(fail("Estado no valido"));
      let query = supabase.from("platform_supplementary_basis_sources").select(`
        id, opportunity_id, source_url, document_role, source_authority, status,
        proposal_note, proposal_origin, discovery_path, match_score, proposed_by, reviewed_by, reviewed_at, review_note,
        last_verified_at, last_verification_error, created_at, updated_at,
        platform_opportunities(canonical_key, title, funder_name)
      `).order("updated_at", { ascending: false }).limit(100);
      if (status !== "all") query = query.eq("status", status);
      const [{ data, error }, { data: opportunities, error: opportunitiesError }] = await Promise.all([
        query,
        supabase.from("platform_opportunities").select("id, canonical_key, title, funder_name, status")
          .in("status", ["tracked", "open", "rolling"]).order("updated_at", { ascending: false }).limit(200)
      ]);
      if (error) throw error;
      if (opportunitiesError) throw opportunitiesError;
      return res.status(200).json(ok({ sources: data || [], opportunities: opportunities || [] }));
    }

    if (req.method === "POST") {
      const { opportunityId, sourceUrl, documentRole, sourceAuthority, note = "" } = req.body || {};
      if (typeof opportunityId !== "string" || !opportunityId) return res.status(400).json(fail("Falta opportunityId"));
      if (!ROLES.has(documentRole)) return res.status(400).json(fail("Tipo de documento no valido"));
      if (!AUTHORITIES.has(sourceAuthority)) return res.status(400).json(fail("Autoridad de fuente no valida"));
      const { data: opportunity, error: opportunityError } = await supabase.from("platform_opportunities")
        .select("id").eq("id", opportunityId).maybeSingle();
      if (opportunityError) throw opportunityError;
      if (!opportunity) return res.status(404).json(fail("Oportunidad no encontrada"));
      const { data, error } = await supabase.from("platform_supplementary_basis_sources").insert({
        opportunity_id: opportunity.id, source_url: cleanUrl(sourceUrl), document_role: documentRole,
        source_authority: sourceAuthority, status: "proposed", proposal_origin: "human", proposed_by: actor.userId,
        proposal_note: String(note || "").trim().slice(0, 2000)
      }).select("id, opportunity_id, source_url, document_role, source_authority, status, created_at").single();
      if (error) throw error;
      return res.status(201).json(ok({ source: data, message: "Fuente propuesta. No se usara hasta que un administrador la apruebe." }));
    }

    if (req.method === "PATCH") {
      const { sourceId, action, note = "" } = req.body || {};
      if (typeof sourceId !== "string" || !sourceId) return res.status(400).json(fail("Falta sourceId"));
      if (!ACTIONS.has(action)) return res.status(400).json(fail("Accion de revision invalida"));
      const now = new Date().toISOString();
      const status = action === "approve" ? "approved" : "rejected";
      const { data, error } = await supabase.from("platform_supplementary_basis_sources").update({
        status, reviewed_by: actor.userId, reviewed_at: now,
        review_note: String(note || "").trim().slice(0, 2000), updated_at: now
      }).eq("id", sourceId).in("status", ["proposed", "approved", "rejected"])
        .select("id, opportunity_id, source_url, document_role, source_authority, status, reviewed_at, review_note").maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json(fail("Fuente suplementaria no encontrada"));
      return res.status(200).json(ok({ source: data, message: status === "approved"
        ? "Fuente aprobada. El siguiente radar intentara capturarla y verificara su contenido."
        : "Fuente rechazada. El radar no la utilizara." }));
    }

    return res.status(405).json(fail("Method Not Allowed"));
  } catch (error) {
    if (missingSchema(error)) return res.status(503).json(fail("El registro de fuentes suplementarias aun no esta activado"));
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("Permiso") ? 403 : message.includes("autoriz") || message.includes("Token") ? 401 : 400;
    return res.status(status).json(fail(message));
  }
}
