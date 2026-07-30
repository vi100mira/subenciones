import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const apply = process.argv.includes("--apply=true");
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");

const day = new Date().toISOString().slice(0, 10);
const radars = [
  { campaign: "municipal-social", kind: "bdns", label: "BDNS/SNPSAP - radar municipal social", url: "https://www.infosubvenciones.es/bdnstrans/api#municipal-social", administrationType: "L", queries: ["accion social", "inclusion", "empleo", "asociaciones", "entidades sin animo de lucro"] },
  { campaign: "general-social", kind: "bdns", label: "BDNS/SNPSAP - radar social general", url: "https://www.infosubvenciones.es/bdnstrans/api#general-social", administrationType: "todas", queries: ["social"] },
  { campaign: "private-open-funders", kind: "private_funder", label: "Financiadores privados - catálogo público oficial", url: "https://subvenciones-rag.vercel.app/sources#private-open-funders", administrationType: "no_aplica", queries: ["convocatorias sociales privadas"] }
];

const db = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket }
});
const campaigns = [];
for (const radar of radars) {
  const { data: existing, error: sourceReadError } = await db.from("platform_sources").select("id").eq("kind", radar.kind).eq("url", radar.url).maybeSingle();
  if (sourceReadError) throw sourceReadError;
  let source = existing;
  if (!source && apply) {
    const { data, error } = await db.from("platform_sources").insert({
      label: radar.label, kind: radar.kind, url: radar.url, status: "active", health_status: "unknown", priority: 92,
      config_json: { campaign: radar.campaign, administration_type: radar.administrationType, queries: radar.queries, activation_gate: "official issuer + open applications + extracted official bases" }
    }).select("id").single();
    if (error) throw error;
    source = data;
  }
  const campaignKey = `${radar.campaign}:${day}`;
  if (!source) { campaigns.push({ campaign: radar.campaign, source: "would_create", status: "would_queue" }); continue; }
  const { data: existingCampaign, error: campaignReadError } = await db.from("platform_ingestion_campaigns").select("status").eq("campaign_key", campaignKey).maybeSingle();
  if (campaignReadError) throw campaignReadError;
  if (existingCampaign) { campaigns.push({ campaign: radar.campaign, source: existing ? "existing" : "created", status: existingCampaign.status }); continue; }
  if (apply) {
    const { error } = await db.from("platform_ingestion_campaigns").insert({ platform_source_id: source.id, campaign_key: campaignKey, status: "queued" });
    if (error) throw error;
  }
  campaigns.push({ campaign: radar.campaign, source: existing ? "existing" : "created", status: apply ? "queued" : "would_queue" });
}

console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", day, campaigns }, null, 2));
