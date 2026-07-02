(function () {
  const storageKey = "tenant-watch-demo-v1";

  function rows() {
    const radar = document.body.dataset.role === "superadmin" && window.RADAR_PLATFORM_OPPORTUNITIES?.length ? window.RADAR_PLATFORM_OPPORTUNITIES : window.RADAR?.opportunities || [];
    const privateMocks = [...(window.MOCK?.opportunities || []), ...(window.PRIVATE_OPEN_OPPORTUNITIES || [])].filter((item) => item.sourceScope && item.sourceScope !== "Publica oficial");
    return radar.length ? [...radar, ...privateMocks] : (window.MOCK?.opportunities || []);
  }

  function saveLocalWatch(item, reason) {
    const current = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const entry = {
      id: item.id,
      canonicalKey: item.canonicalKey || item.id,
      title: item.title,
      reason,
      status: "active",
      savedAt: new Date().toISOString()
    };
    const next = [entry, ...current.filter((watch) => watch.id !== item.id)].slice(0, 20);
    localStorage.setItem(storageKey, JSON.stringify(next));
    return entry;
  }

  async function tryApiWatch(item, reason) {
    const token = window.DEMO_AUTH_TOKEN;
    const tenantId = window.DEMO_TENANT_ID;
    if (!token || !tenantId || !item.canonicalKey) return null;
    const response = await fetch("/api/tenant-opportunity-watches", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-tenant-id": tenantId
      },
      body: JSON.stringify({ canonicalKey: item.canonicalKey, reason, metadata: { source: "prototype" } })
    });
    return response.ok ? response.json() : null;
  }

  function note(text) {
    if (typeof showToast === "function") showToast(text);
  }

  document.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-watch-opportunity]");
    if (!trigger) return;
    const item = rows().find((entry) => entry.id === trigger.dataset.watchOpportunity);
    if (!item) return;
    saveLocalWatch(item, trigger.dataset.watchReason || "candidate_workspace");
    const apiResult = await tryApiWatch(item, trigger.dataset.watchReason || "candidate_workspace").catch(() => null);
    note(apiResult ? "Seguimiento registrado. Se avisara si cambian plazos o criterios." : "Seguimiento guardado en modo demo. Sin datos privados enviados.");
    window.dispatchEvent(new CustomEvent("tenant-watch-changed"));
  });
})();
