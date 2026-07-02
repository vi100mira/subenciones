import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");

function loadEnvFile(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function maybeReadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      loadEnvFile(await fs.readFile(file, "utf8"));
    } catch {
      // Optional local convenience only.
    }
  }
}

async function main() {
  await maybeReadEnv();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket }
  });

  const [{ data: tenant, error: tenantError }, { data: opportunity, error: opportunityError }] = await Promise.all([
    supabase.from("organizations").select("id").eq("slug", "novaterra-demo").single(),
    supabase.from("platform_opportunities").select("id, title").eq("canonical_key", "fundacion-la-caixa-convocatorias-sociales").single()
  ]);
  if (tenantError) throw tenantError;
  if (opportunityError) throw opportunityError;

  const row = {
    tenant_id: tenant.id,
    opportunity_id: opportunity.id,
    reason: "manual_follow",
    status: "active",
    metadata_json: { seeded_demo: true, source: "seed-demo-watch" }
  };

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", watch: row, opportunity: opportunity.title }, null, 2));
    return;
  }

  const { data, error } = await supabase
    .from("tenant_opportunity_watches")
    .upsert(row, { onConflict: "tenant_id,opportunity_id,reason" })
    .select("id, tenant_id, opportunity_id, reason, status")
    .single();
  if (error) throw error;
  console.log(JSON.stringify({ mode: "applied", watch: data, opportunity: opportunity.title }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
