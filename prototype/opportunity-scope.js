(function () {
  function isCurrent(item) {
    const today = new Date().toISOString().slice(0, 10);
    if (item.actionable === false || item.deadlineStatus === "closed") return false;
    if (item.actionable === true) return true;
    if (item.deadlineEnd) return item.deadlineEnd >= today;
    const evidenceDate = String(item.deadlineEvidenceDate || item.deadlineStart || "");
    return item.deadlineStatus === "open" && evidenceDate.startsWith(today.slice(0, 4));
  }

  function rows() {
    const publicBase = document.body.dataset.role === "superadmin" && window.RADAR_PLATFORM_OPPORTUNITIES?.length
      ? window.RADAR_PLATFORM_OPPORTUNITIES
      : window.RADAR?.opportunities || [];
    const publicRows = [...new Map([...publicBase, ...(window.MUNICIPAL_RADAR?.opportunities || [])]
      .map((item) => [item.id, item])).values()];
    const privateRows = [...(window.MOCK?.opportunities || []), ...(window.PRIVATE_OPEN_OPPORTUNITIES || [])]
      .filter((item) => item.sourceScope && item.sourceScope !== "Publica oficial" && !item.sourceScope.toLowerCase().includes("tenant"));
    const combined = publicRows.length ? [...publicRows, ...privateRows] : window.MOCK?.opportunities || [];
    return [...new Map(combined.filter(isCurrent).map((item) => [item.id, item])).values()];
  }

  function summary() {
    const current = rows();
    return {
      total: current.length,
      open: current.filter((item) => item.deadlineStatus === "open").length,
      highPriority: current.filter((item) => Number(item.score || 0) >= 75).length,
      uncertain: current.filter((item) => item.deadlineStatus === "uncertain").length
    };
  }

  window.OpportunityScope = { rows, summary };
})();
