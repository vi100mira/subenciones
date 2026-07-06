import fs from "node:fs/promises";

const catalogPath = "data/private-open-funders/platform-open-funders-v1.json";
const todayArg = process.argv.find((item) => item.startsWith("--today="));
const today = todayArg ? new Date(`${todayArg.split("=")[1]}T00:00:00Z`) : new Date();

function normalizeUrl(value, base) {
  try {
    const url = new URL(value, base);
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

function latestIsoDate(text = "") {
  const dates = [...String(text).matchAll(/20\d{2}-\d{2}-\d{2}/g)].map((match) => new Date(`${match[0]}T23:59:59Z`));
  return dates.sort((a, b) => b - a)[0] || null;
}

function isActiveStatus(status = "") {
  return ["open", "open_by_territory", "open_or_recent_by_line"].includes(status);
}

function isClosedStatus(status = "") {
  return /^(closed|recurring_closed|closed_monitor|expired|resolved)/.test(status);
}

function sameOrigin(left, right) {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

function requiredPolicyIsPresent(catalog, failures) {
  const policy = catalog.catalog?.deep_scan_policy?.basis_verification;
  const required = ["clear_basis_requires", "human_verification_url_required_when", "discarded", "archived"];
  for (const key of required) {
    if (!policy?.[key]) failures.push(`deep_scan_policy.basis_verification.${key} is missing`);
  }
}

function verifySource(source, failures, warnings) {
  const url = normalizeUrl(source.url);
  if (!url) failures.push(`${source.id}: invalid official url`);
  if (!source.watch_fields?.length) failures.push(`${source.id}: missing watch_fields`);

  const deadline = latestIsoDate(source.deadline_text);
  if (isActiveStatus(source.opportunity_status) && deadline && deadline < today) {
    failures.push(`${source.id}: active status has past ISO deadline ${deadline.toISOString().slice(0, 10)}`);
  }

  if (!source.basis_url) {
    if (isClosedStatus(source.opportunity_status) && !source.deadline_text?.toLowerCase().includes("closed")) {
      warnings.push(`${source.id}: closed/archived source has no curated basis_url; keep it monitor-only until evidence is located`);
    }
    return;
  }

  const basisUrl = normalizeUrl(source.basis_url, source.url);
  if (!basisUrl) failures.push(`${source.id}: invalid basis_url`);
  if (basisUrl && url && !sameOrigin(url, basisUrl)) failures.push(`${source.id}: basis_url is not same-origin with official source`);

  const path = source.navigation_path || [];
  const finalPathUrl = normalizeUrl(path[path.length - 1]?.url || "", source.url);
  if (path.length < 2) failures.push(`${source.id}: curated basis_url requires a navigation_path with at least two steps`);
  if (basisUrl && finalPathUrl !== basisUrl) failures.push(`${source.id}: navigation_path final URL must equal basis_url`);

  if (isClosedStatus(source.opportunity_status)) {
    if (!source.status_facts?.status) failures.push(`${source.id}: closed curated source needs status_facts.status`);
    if (!source.status_facts?.closing) failures.push(`${source.id}: closed curated source needs status_facts.closing`);
  }
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const failures = [];
  const warnings = [];
  requiredPolicyIsPresent(catalog, failures);
  for (const source of catalog.sources || []) verifySource(source, failures, warnings);

  const payload = {
    checked_at: new Date().toISOString(),
    today: today.toISOString().slice(0, 10),
    sources_checked: catalog.sources?.length || 0,
    failures,
    warnings
  };
  console.log(JSON.stringify(payload, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
