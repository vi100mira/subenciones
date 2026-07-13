(function () {
  function session() {
    const value = window.CredentialsAuth?.getSession?.();
    return value?.role === "entity" && value?.tenantId ? value : null;
  }

  async function recommendations() {
    const current = session();
    if (!current) return [];
    const response = await fetch("/api/tenant-match-runs", {
      headers: { "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current) }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data || [];
  }

  function localRows() {
    return [...new Map([
      ...(window.RADAR?.opportunities || []),
      ...(window.MUNICIPAL_RADAR?.opportunities || []),
      ...(window.PRIVATE_OPEN_OPPORTUNITIES || []),
      ...(window.MOCK?.opportunities || [])
    ].map((item) => [String(item.id), item])).values()];
  }

  function reasonText(recommendation) {
    return (recommendation.reasons_json || []).map((reason) => reason.text).filter(Boolean).slice(0, 2).join(" ")
      || (recommendation.risks_json || []).map((risk) => risk.text).filter(Boolean)[0]
      || "Pendiente de revisión humana.";
  }

  function apply(items) {
    if (!items.length || !window.RADAR) return false;
    if (!window.RADAR_PLATFORM_OPPORTUNITIES) window.RADAR_PLATFORM_OPPORTUNITIES = [...(window.RADAR.opportunities || [])];
    const rows = localRows();
    const byKey = new Map(rows.map((item) => [String(item.id), item]));
    const annotated = items.map((recommendation) => {
      const opportunity = Array.isArray(recommendation.platform_opportunities)
        ? recommendation.platform_opportunities[0]
        : recommendation.platform_opportunities;
      const local = byKey.get(String(opportunity?.canonical_key));
      if (!local) return null;
      const candidate = recommendation.recommendation_status !== "low_fit";
      return {
        ...local,
        score: recommendation.score,
        entityFit: { status: candidate ? "candidate" : "discarded", reason: reasonText(recommendation) },
        matchRecommendation: recommendation
      };
    }).filter(Boolean);
    const active = annotated.filter((item) => item.entityFit.status === "candidate" && item.deadlineStatus !== "closed");
    const discarded = annotated.filter((item) => item.entityFit.status === "discarded");
    const archived = annotated.filter((item) => item.deadlineStatus === "closed").map((item) => ({ ...item, entityFit: { status: "archived", reason: "Versión archivada por plazo cerrado." } }));
    const current = session();
    window.RADAR_ENTITY_CONTEXT = { name: current?.label || "Entidad actual" };
    window.RADAR_ENTITY_DISCARDED = discarded;
    window.RADAR_DEADLINE_ARCHIVED = archived;
    window.RADAR.opportunities = active;
    window.RADAR.count = active.length;
    window.RADAR.quality = {
      ...(window.RADAR.quality || {}),
      entityCandidateCount: active.length,
      entityDiscardedCount: discarded.length,
      entityArchivedClosedCount: archived.length,
      entityFitRule: "Recomendaciones persistidas desde perfil aprobado y evidencia oficial versionada."
    };
    window.TENANT_RECOMMENDATIONS_APPLIED = true;
    return true;
  }

  async function refresh() {
    if (!session()) return;
    try {
      if (!apply(await recommendations())) return;
      window.refreshRoleViews?.();
      window.dispatchEvent(new CustomEvent("tenant-recommendations-applied"));
    } catch (error) {
      const note = document.querySelector("#agents-readiness-note span");
      if (note) note.textContent = `Encaje persistido no disponible: ${error.message}`;
    }
  }

  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0));
  setTimeout(refresh, 0);
})();
