import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fail, ok } from "../src/apiResponse.js";
import { getSupabaseAdmin } from "../src/supabaseAdmin.js";

const QUERIES = ["accion social", "inclusion", "empleo", "asociaciones", "entidades sin animo de lucro"];
const RADARS = [
  {
    campaign: "municipal-social",
    kind: "bdns",
    label: "BDNS/SNPSAP - radar municipal social",
    url: "https://www.infosubvenciones.es/bdnstrans/api#municipal-social",
    administrationType: "L",
    queries: QUERIES
  },
  {
    campaign: "general-social",
    kind: "bdns",
    label: "BDNS/SNPSAP - radar social general",
    url: "https://www.infosubvenciones.es/bdnstrans/api#general-social",
    administrationType: "todas",
    queries: ["social"]
  },
  {
    campaign: "private-open-funders",
    kind: "private_funder",
    label: "Financiadores privados - catálogo público oficial",
    url: "https://subvenciones-rag.vercel.app/sources#private-open-funders",
    administrationType: "no_aplica",
    queries: ["convocatorias sociales privadas"]
  }
] as const;

function authorized(req: VercelRequest) {
  const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  return Boolean(process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`);
}

async function ensureSource(radar: (typeof RADARS)[number]) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("platform_sources")
    .select("id, status")
    .eq("kind", radar.kind)
    .eq("url", radar.url)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("platform_sources")
    .insert({
      label: radar.label,
      kind: radar.kind,
      url: radar.url,
      status: "active",
      health_status: "unknown",
      priority: 92,
      config_json: {
        campaign: radar.campaign,
        administration_type: radar.administrationType,
        queries: radar.queries,
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
    const day = new Date().toISOString().slice(0, 10);
    const campaigns = [];
    for (const radar of RADARS) {
      const source = await ensureSource(radar);
      if (source.status !== "active") {
        campaigns.push({ campaign: radar.campaign, status: "paused" });
        continue;
      }
      const campaignKey = `${radar.campaign}:${day}`;
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
        campaigns.push({ ...existing, duplicate: true });
        continue;
      }
      if (error) throw error;
      campaigns.push({ ...data, duplicate: false });
    }
    const queued = campaigns.some((item) => item.status === "queued" && (!("duplicate" in item) || !item.duplicate));
    return res.status(queued ? 202 : 200).json(ok({ campaigns }));
  } catch (error) {
    return res.status(500).json(fail(error instanceof Error ? error.message : "Error inesperado"));
  }
}
