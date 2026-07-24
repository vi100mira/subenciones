(function (root) {
  function normalizedUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return `${url.hostname}${url.pathname}`.replace(/\/$/, "").toLowerCase();
    } catch {
      return "";
    }
  }

  function rowUrls(row) {
    return [row?.officialUrl, row?.basesUrl, ...(row?.supplementaryBasesUrls || [])]
      .map(normalizedUrl).filter(Boolean);
  }

  function createIndex(rows = []) {
    const byCanonical = new Map();
    const byUrl = new Map();
    const duplicatedUrls = new Set();
    rows.forEach((row) => {
      byCanonical.set(String(row.id), row);
      rowUrls(row).forEach((url) => {
        if (duplicatedUrls.has(url)) return;
        if (byUrl.has(url) && byUrl.get(url)?.id !== row.id) {
          byUrl.delete(url);
          duplicatedUrls.add(url);
          return;
        }
        byUrl.set(url, row);
      });
    });
    return { byCanonical, byUrl };
  }

  function relation(recommendation, key) {
    const value = recommendation?.[key];
    return Array.isArray(value) ? value[0] : value;
  }

  function resolve(recommendation, index) {
    const opportunity = relation(recommendation, "platform_opportunities");
    const version = relation(recommendation, "platform_opportunity_versions");
    const direct = index.byCanonical.get(String(opportunity?.canonical_key));
    if (direct) return { row: direct, method: "canonical_key", opportunity, version };
    for (const value of [version?.official_url, version?.source_url]) {
      const row = index.byUrl.get(normalizedUrl(value));
      if (row) return { row, method: "official_url", opportunity, version };
    }
    return { row: null, method: "unresolved", opportunity, version };
  }

  root.RecommendationReconciliation = { createIndex, normalizedUrl, resolve };
})(typeof window === "undefined" ? globalThis : window);
