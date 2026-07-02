(function () {
  const watchKey = "tenant-watch-demo-v1";

  function badge(text, tone) {
    return `<span class="badge ${tone}">${text}</span>`;
  }

  function watchedCount() {
    try {
      return JSON.parse(localStorage.getItem(watchKey) || "[]").filter((watch) => watch.status === "active").length;
    } catch {
      return 0;
    }
  }

  function alertTone(severity) {
    return severity === "critical" ? "danger" : severity === "high" ? "warning" : "review";
  }

  function renderRealAlerts(alerts) {
    return alerts.map((alert) => `
      <div class="stack-item">
        <div class="opportunity-topline"><strong>${alert.title}</strong>${badge(alert.severity, alertTone(alert.severity))}</div>
        <span>${alert.recommended_action}</span>
      </div>
    `).join("");
  }

  function renderDemoAlerts() {
    const count = watchedCount();
    const note = `<div class="plain-note"><strong>${count ? `${count} oportunidades en seguimiento demo` : "Sin alertas reales en modo demo"}</strong><span>Cuando una fuente cambie plazo, bases o criterios, aqui apareceran las alertas del tenant.</span></div>`;
    const mocks = (window.MOCK?.alerts || []).slice(0, 2).map((item) => `<div class="stack-item"><strong>${item.title}</strong><span>${item.detail}</span></div>`).join("");
    return note + mocks;
  }

  async function loadAlerts() {
    const list = document.querySelector("#alerts-list");
    if (!list) return;
    const token = window.DEMO_AUTH_TOKEN;
    const tenantId = window.DEMO_TENANT_ID;
    if (!token || !tenantId) {
      list.innerHTML = renderDemoAlerts();
      return;
    }
    const response = await fetch("/api/tenant-change-alerts?status=new", { headers: { authorization: `Bearer ${token}`, "x-tenant-id": tenantId } }).catch(() => null);
    const payload = response?.ok ? await response.json() : null;
    const alerts = payload?.ok ? payload.data : [];
    list.innerHTML = alerts.length ? renderRealAlerts(alerts) : renderDemoAlerts();
  }

  setTimeout(loadAlerts, 0);
  window.addEventListener("tenant-watch-changed", loadAlerts);
})();
