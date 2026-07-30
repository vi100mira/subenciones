(function () {
  function badge(text, tone) { return `<span class="badge ${tone}">${text}</span>`; }
  function alertTone(severity) { return severity === "critical" ? "danger" : severity === "high" ? "warning" : "review"; }
  function renderRealAlerts(alerts) {
    return alerts.map((alert) => `<div class="stack-item"><div class="opportunity-topline"><strong>${alert.title}</strong>${badge(alert.severity, alertTone(alert.severity))}</div><span>${alert.recommended_action}</span></div>`).join("");
  }
  function renderEmptyAlerts(message = "No hay alertas persistidas para esta entidad.") {
    return `<div class="plain-note"><strong>Sin alertas verificadas</strong><span>${message}</span></div>`;
  }
  async function loadAlerts() {
    const list = document.querySelector("#alerts-list"); if (!list) return;
    const session = window.CredentialsAuth?.getSession?.();
    const tenantId = session?.role === "entity" ? session.tenantId : "";
    if (!session?.accessToken || !tenantId) {
      list.innerHTML = renderEmptyAlerts("Inicia una sesión de entidad para consultar alertas autorizadas.");
      return;
    }
    const response = await fetch("/api/tenant-change-alerts?status=new", {
      headers: { ...window.CredentialsAuth.authHeaders(session), "x-tenant-id": tenantId }
    }).catch(() => null);
    const payload = response?.ok ? await response.json() : null;
    const alerts = payload?.ok ? payload.data : [];
    list.innerHTML = alerts.length ? renderRealAlerts(alerts) : renderEmptyAlerts(response ? "No hay alertas nuevas persistidas para esta entidad." : "No se pudieron recuperar alertas persistidas.");
  }
  setTimeout(loadAlerts, 0);
  window.addEventListener("role-session-applied", loadAlerts);
  window.addEventListener("tenant-watch-changed", loadAlerts);
})();
