import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin } from "../src/supabaseAdmin.js";

const SOURCE_URL = "https://www.infosubvenciones.es/bdnstrans/api#municipal-social";
const SOURCE_LABEL = "BDNS/SNPSAP - radar municipal social";
const QUERIES = ["accion social", "inclusion", "empleo", "asociaciones", "entidades sin animo de lucro"];

function authorized(req: VercelRequest) {
  const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  return Boolean(process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`);
}

async function ensureMunicipalSource() {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("platform_sources")
    .select("id, status")
    .eq("kind", "bdns")
    .eq("url", SOURCE_URL)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("platform_sources")
    .insert({
      label: SOURCE_LABEL,
      kind: "bdns",
      url: SOURCE_URL,
      status: "active",
      health_status: "unknown",
      priority: 92,
      config_json: {
        campaign: "municipal-social",
        administration_type: "L",
        queries: QUERIES,
        activation_gate: "official issuer + open applications + extracted official bases"
      }
    })
    .select("id, status")
    .single();
  if (error) throw error;
  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json(fail("Method Not Allowed"));
  if (!process.env.CRON_SECRET) return res.status(503).json(fail("CRON_SECRET no configurado"));
  if (!authorized(req)) return res.status(401).json(fail("No autorizado"));

  try {
    const supabase = getSupabaseAdmin();
    const source = await ensureMunicipalSource();
    if (source.status !== "active") return res.status(409).json(fail("Radar municipal pausado"));

    const campaignKey = `municipal-social:${new Date().toISOString().slice(0, 10)}`;
    const { data, error } = await supabase
      .from("platform_ingestion_campaigns")
      .insert({ platform_source_id: source.id, campaign_key: campaignKey, status: "queued" })
      .select("id, status, created_at, campaign_key")
      .single();

    if (error?.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("platform_ingestion_campaigns")
        .select("id, status, created_at, campaign_key")
        .eq("campaign_key", campaignKey)
        .single();
      if (existingError) throw existingError;
      return res.status(200).json(ok({ campaign: existing, duplicate: true }));
    }
    if (error) throw error;
    return res.status(202).json(ok({ campaign: data, duplicate: false }));
  } catch (error) {
    return res.status(500).json(fail(error instanceof Error ? error.message : "Error inesperado"));
  }
}
