import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const input = args.get("input") || "data/public-radar/bdns-municipal-social.json";
const output = args.get("output") || ".tmp/bdns-bases-scan-catalog.json";

async function main() {
  const dataset = JSON.parse(await fs.readFile(input, "utf8"));
  const candidates = (dataset.opportunities || []).filter((item) => item.actionable && item.basesUrl);
  const catalog = {
    catalog: {
      name: `Official bases scan from ${dataset.source}`,
      observed_at: dataset.generatedAt,
      source_authority: "official_registry",
      supplementary_source_id: null,
      rules: [
        "The issuing body or official registry is the only accepted provenance.",
        "A beneficiary publication can never activate an opportunity.",
        "Each candidate is open and has an official bases URL before scanning."
      ]
    },
    sources: candidates.flatMap((item) => (item.basisDocuments?.length ? item.basisDocuments : (item.basesUrls?.length ? item.basesUrls : [item.basesUrl]).map((url, index) => ({ url, role: index ? "supporting" : "primary" }))).map((basisDocument, index) => ({
      id: `${item.id}-bases-${index + 1}`,
      name: `${item.title} [${basisDocument.role || "supporting"}]`,
      url: item.officialUrl,
      basis_url: basisDocument.url,
      navigation_path: [
        { url: item.officialUrl, label: `Ficha oficial ${item.id}` },
        { url: basisDocument.url, label: `Documento oficial ${index + 1} · ${basisDocument.role || "supporting"}` }
      ],
      source_authority: "official_registry",
      opportunity_status: "open",
      deadline_text: item.deadlineEnd || item.deadline,
      deadline_confidence: item.deadlineConfidence,
      territory: item.territory,
      themes: [item.theme].filter(Boolean)
    })))
  };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ input, output, candidates: candidates.length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
