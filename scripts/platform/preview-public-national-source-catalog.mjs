import {
  PUBLIC_NATIONAL_SOURCE_CATALOG,
  PUBLIC_NATIONAL_SOURCE_CATALOG_VERSION,
  publicSourceScanBlockReason
} from "./public-national-source-catalog.mjs";

const blockedBy = PUBLIC_NATIONAL_SOURCE_CATALOG.reduce((summary, source) => {
  const reason = publicSourceScanBlockReason(source) || "eligible";
  summary[reason] = (summary[reason] || 0) + 1;
  return summary;
}, {});

console.log(JSON.stringify({
  mode: "dry_run",
  version: PUBLIC_NATIONAL_SOURCE_CATALOG_VERSION,
  sourceCount: PUBLIC_NATIONAL_SOURCE_CATALOG.length,
  discoveryCanonical: PUBLIC_NATIONAL_SOURCE_CATALOG.filter((source) => source.source_role === "discovery_canonical").length,
  officialPublications: PUBLIC_NATIONAL_SOURCE_CATALOG.filter((source) => source.source_role === "official_publication").length,
  scanRequestsPlanned: 0,
  blockedBy
}, null, 2));
