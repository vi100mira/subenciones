import fs from "node:fs/promises";

const catalogPath = "data/private-open-funders/platform-open-funders-v1.json";
const datasetArg = process.argv.find((item) => item.startsWith("--dataset="));
const forbiddenEvidence = /beneficiary|recipient|tenant|relationship/i;
const liveStatuses = new Set(["open", "open_by_territory", "open_or_recent_by_line"]);

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function verifyCatalog(catalog, failures) {
  for (const source of catalog.sources || []) {
    if (!isHttpUrl(source.url)) failures.push(`${source.id}: source URL is not valid`);
    if (forbiddenEvidence.test(source.evidence_quality || "")) {
      failures.push(`${source.id}: beneficiary/tenant evidence cannot be a platform source`);
    }
    if (source.opportunity_status === "relationship_based_manual_review") {
      failures.push(`${source.id}: relationship evidence belongs to tenant context, not the platform catalogue`);
    }
    if (!liveStatuses.has(source.opportunity_status)) continue;
    if (!isHttpUrl(source.basis_url)) failures.push(`${source.id}: live opportunity has no official basis_url`);
    if (source.deadline_confidence !== "high") failures.push(`${source.id}: live opportunity deadline is not high confidence`);
  }
}

function verifyDataset(dataset, failures) {
  for (const item of dataset.opportunities || []) {
    if (!item.actionable) continue;
    if (item.sourceAuthority !== "official_registry" && item.sourceAuthority !== "issuer_official") {
      failures.push(`${item.id}: actionable opportunity lacks official issuer authority`);
    }
    if (item.deadlineStatus !== "open") failures.push(`${item.id}: actionable opportunity is not open`);
    if (!isHttpUrl(item.basesUrl)) failures.push(`${item.id}: actionable opportunity has no official bases URL`);
    if (item.basesStatus !== "extracted") failures.push(`${item.id}: actionable opportunity lacks extracted bases`);
    if (!(item.basesEvidence || []).some((entry) => /^[a-f0-9]{64}$/i.test(entry.sha256 || "") && entry.extractedChars >= 1000)) {
      failures.push(`${item.id}: actionable opportunity lacks hashed substantive bases evidence`);
    }
  }
}

async function main() {
  const failures = [];
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  verifyCatalog(catalog, failures);
  if (datasetArg) {
    const datasetPath = datasetArg.split("=").slice(1).join("=");
    verifyDataset(JSON.parse(await fs.readFile(datasetPath, "utf8")), failures);
  }
  const payload = {
    catalogSourcesChecked: catalog.sources?.length || 0,
    dataset: datasetArg ? datasetArg.split("=").slice(1).join("=") : null,
    failures
  };
  console.log(JSON.stringify(payload, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
