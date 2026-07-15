(function (root) {
  function count(value) {
    return Math.max(0, Number(value || 0));
  }

  function reconcile(input = {}) {
    const total = count(input.total);
    const following = count(input.following);
    const outside = count(input.outside);
    const archived = count(input.archived);
    const notCurrent = Math.max(0, count(input.mappedActive) - following);
    const unmapped = count(input.unmapped);
    const classified = following + outside + archived + notCurrent + unmapped;
    return {
      total,
      following,
      outside,
      archived,
      notCurrent,
      unmapped,
      pendingClassification: Math.max(0, total - classified),
      overcount: Math.max(0, classified - total)
    };
  }

  root.MatchAccounting = { reconcile };
})(typeof window === "undefined" ? globalThis : window);
