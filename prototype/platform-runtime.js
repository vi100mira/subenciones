(function () {
  const state = { data: null, loading: false, error: "" };
  const activeRunStates = new Set(["queued", "preparing_context", "awaiting_provider", "generating", "running"]);

  function session() {
    const value = window.CredentialsAuth?.getSession?.();
    return value?.role === "superadmin" && value?.accessToken ? value : null;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function badge(text, tone = "review") { return `<span class="badge ${tone}">${escapeHtml(text)}</span>`; }
  function tone(status) {
    if (["active", "ready", "completed", "healthy"].includes(status)) return "safe";
    if (["failed", "error", "blocked", "degraded"].includes(status)) return "warning";
    return "review";
  }
  function date(value) { return value ? new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Sin ejecución"; }
  function organizationMap(data) { return new Map(data.organizations.map((item) => [item.id, item])); }
  async function request(path, options = {}) {
    const current = session(); if (!current) throw new Error("Sesión superadmin no disponible");
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...window.CredentialsAuth.authHeaders(current), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data;
  }
  function renderDashboard(data) {
    const activeTenants = data.tenantConfigs.filter((item) => item.status === "active").length;
    const readyAgents = data.tenantAgents.filter((item) => item.enabled && item.status === "ready").length;
    const values = [
      ["Oportunidades públicas", data.counts.opportunities, "Corpus común de plataforma"],
      ["Tenants activos", activeTenants, `${data.organizations.length} entidades registradas`],
      ["Asistentes operativos", readyAgents, "Activaciones aisladas por tenant"],
      ["Revisiones pendientes", data.counts.pendingPlatformReviews, "Cambios públicos que requieren decisión humana"]
    ];
    document.querySelectorAll("#dashboard .metric").forEach((metric, index) => {
      metric.querySelector("span").textContent = values[index][0]; metric.querySelector("strong").textContent = values[index][1]; metric.querySelector("small").textContent = values[index][2];
    });
    const degraded = data.platformSources.filter((item) => ["degraded", "error"].includes(item.health_status));
    document.querySelector("#alerts-list").innerHTML = [
      { title: "Revisiones públicas pendientes", detail: `${data.counts.pendingPlatformReviews} cambios esperan revisión humana.` },
      { title: "Alertas tenant abiertas", detail: `${data.counts.pendingTenantAlerts} alertas requieren atención dentro de sus entidades.` },
      { title: "Salud de fuentes", detail: degraded.length ? `${degraded.length} fuentes degradadas o con error.` : "Todas las fuentes registradas sin incidencias declaradas." }
    ].map((item) => `<div class="stack-item"><strong>${item.title}</strong><span>${item.detail}</span></div>`).join("");
  }
  function renderAgents(data) {
    const orgs = organizationMap(data);
    document.querySelector("#agents-readiness-note span").textContent = "Estado persistido del catálogo común y de la activación aislada de cada tenant. La plataforma no abre documentos ni contexto privado.";
    document.querySelector("#agents-status-legend")?.remove();
    document.querySelector("#agent-grid").innerHTML = data.agentDefinitions.map((definition) => {
      const configs = data.tenantAgents.filter((item) => item.agent_key === definition.agent_key);
      const ready = configs.filter((item) => item.enabled && item.status === "ready").length;
      const blocked = configs.filter((item) => item.status === "blocked").length;
      const status = definition.scope === "platform" ? "Activo en plataforma" : `${ready}/${data.organizations.length} tenants operativos`;
      return `<article class="agent-card"><div class="agent-icon"><i data-lucide="bot"></i></div><div class="opportunity-topline"><strong>${escapeHtml(definition.display_name)}</strong>${badge(status, ready || definition.scope === "platform" ? "safe" : "review")}</div><p>${definition.execution_mode === "scheduled" ? "Ejecución programada" : definition.execution_mode === "both" ? "Programado y bajo demanda" : "Ejecución bajo demanda"}</p><span>${definition.requires_human_review ? "Salida con revisión humana" : "Salida operativa sin decisión automática"}${blocked ? ` · ${blocked} bloqueados` : ""}</span></article>`;
    }).join("");
    const recent = data.agentRuns.slice(0, 20);
    const runs = document.querySelector("#agent-runs");
    runs.closest(".panel").querySelector("h2").textContent = "Últimas ejecuciones reales";
    runs.closest(".panel").querySelector(".agent-panel-note")?.remove();
    runs.innerHTML = recent.length ? recent.map((run) => `<div class="stack-item"><div class="opportunity-topline"><strong>${escapeHtml(run.agent_key)}</strong>${badge(run.status, tone(run.status))}</div><span>${escapeHtml(orgs.get(run.tenant_id)?.name || "Tenant no disponible")} · ${date(run.created_at)}</span></div>`).join("") : '<div class="empty-state">Todavía no hay ejecuciones persistidas.</div>';
    const channelPanel = document.querySelector("#agents .channel-list")?.closest(".panel");
    if (channelPanel) { channelPanel.querySelector("h2").textContent = "Límite administrativo"; channelPanel.querySelector(".channel-list").innerHTML = '<div><i data-lucide="shield-check"></i><strong>Metadatos operativos</strong><span>Estados, colas, errores y costes; sin documentos, hechos internos ni borradores tenant.</span></div>'; }
  }
  function renderAudit(data) {
    const orgs = organizationMap(data); const target = document.querySelector("#audit-timeline");
    document.querySelector("#audit .panel-heading h2").textContent = "Auditoría global por tenant";
    const exportButton = document.querySelector("[data-audit-export]"); if (exportButton) { exportButton.removeAttribute("data-audit-export"); exportButton.dataset.platformAuditExport = ""; exportButton.textContent = "Exportar metadatos (.csv)"; }
    target.innerHTML = `<div class="plain-note"><strong>${data.auditEvents.length} eventos operativos</strong><span>Vista transversal sin detalle privado del evento. Cada registro conserva tenant, actor, acción, recurso y fecha.</span></div><div class="audit-table" role="table"><div class="audit-grid-row audit-grid-header" role="row"><span>Fecha</span><span>Tenant</span><span>Actor</span><span>Acción</span><span>Recurso</span></div>${data.auditEvents.map((item) => `<div class="audit-grid-row" role="row"><time>${date(item.created_at)}</time><strong>${escapeHtml(orgs.get(item.tenant_id)?.name || item.tenant_id)}</strong><span>${escapeHtml(item.actor_label)}</span><span>${escapeHtml(item.action)}</span><span>${escapeHtml(item.target_type)}</span></div>`).join("") || '<div class="empty-state">No hay eventos persistidos.</div>'}</div>`;
  }
  function latestCampaign(data, sourceId) { return data.ingestionCampaigns.find((item) => item.platform_source_id === sourceId); }
  function runnableSource(source) {
    return ["https://www.infosubvenciones.es/bdnstrans/api#municipal-social", "https://www.infosubvenciones.es/bdnstrans/api#general-social", "https://subvenciones-rag.vercel.app/sources#private-open-funders"].includes(source.url);
  }
  function renderReviews(data) {
    document.querySelector('[data-review-action="create"]')?.remove();
    document.querySelector("[data-platform-pane='reviews'] .panel-heading h2").textContent = "Revisiones operativas";
    document.querySelector("#platform-campaigns").innerHTML = data.platformSources.filter(runnableSource).map((source) => {
      const campaign = latestCampaign(data, source.id); const running = campaign && activeRunStates.has(campaign.status);
      return `<div class="stack-item"><div class="opportunity-topline"><div><strong>${escapeHtml(source.label)}</strong><span>${escapeHtml(source.kind)} · última sincronización: ${date(source.last_synced_at)}</span></div>${badge(source.health_status, tone(source.health_status))}</div><div class="source-state-line"><span>Última revisión: ${campaign ? `${escapeHtml(campaign.status)} · ${date(campaign.created_at)}` : "sin campañas"} · worker diario 05:15</span><button class="primary-action" data-platform-source-run="${source.id}" type="button" ${source.status !== "active" || running ? "disabled" : ""}>${running ? "En cola" : "Encolar revisión"}</button></div></div>`;
    }).join("") || '<div class="empty-state">No hay fuentes de plataforma registradas.</div>';
  }
  function renderOperations(data) {
    const queued = [...data.agentRuns, ...data.ingestionCampaigns].filter((item) => activeRunStates.has(item.status)).length;
    const failures = data.agentRuns.filter((item) => item.status === "failed").length + data.ingestionCampaigns.filter((item) => item.status === "failed").length;
    const values = [["Tenants activos", data.tenantConfigs.filter((item) => item.status === "active").length, "Configuración persistida"], ["Trabajos en cola", queued, "Agentes tenant y campañas públicas"], ["Errores recientes", failures, "Últimas 200 ejecuciones tenant y 100 campañas"], ["Fuentes degradadas", data.platformSources.filter((item) => ["degraded", "error"].includes(item.health_status)).length, "Estado declarado por conectores"]];
    document.querySelectorAll("#operations .metric").forEach((metric, index) => { metric.querySelector("span").textContent = values[index][0]; metric.querySelector("strong").textContent = values[index][1]; metric.querySelector("small").textContent = values[index][2]; });
    document.querySelector("#operations-jobs").innerHTML = data.ingestionCampaigns.slice(0, 15).map((item) => `<div class="stack-item"><div class="opportunity-topline"><strong>Campaña ${escapeHtml(item.campaign_key || item.id)}</strong>${badge(item.status, tone(item.status))}</div><span>${date(item.created_at)} · leídas ${item.scanned} · cambiadas ${item.changed} · fallidas ${item.failed}</span></div>`).join("") || '<div class="empty-state">No hay campañas persistidas.</div>';
    document.querySelector("#operations-health").innerHTML = data.platformSources.map((item) => `<div class="stack-item"><div class="opportunity-topline"><strong>${escapeHtml(item.label)}</strong>${badge(item.health_status, tone(item.health_status))}</div><span>${escapeHtml(item.status)} · ${date(item.last_synced_at)}</span></div>`).join("");
    const capacity = document.querySelector("#operations .capacity-grid"); if (capacity) capacity.innerHTML = `<div><span>Fuentes registradas</span><strong>${data.platformSources.length}</strong></div><div><span>Ejecuciones tenant</span><strong>${data.agentRuns.length}</strong></div><div><span>Campañas públicas</span><strong>${data.ingestionCampaigns.length}</strong></div><div><span>Eventos auditados</span><strong>${data.auditEvents.length}</strong></div>`;
  }
  function render() {
    if (!state.data) return; renderDashboard(state.data); renderAgents(state.data); renderAudit(state.data); renderReviews(state.data); renderOperations(state.data);
    const globalAction = document.querySelector(".top-actions .primary-action"); if (globalAction) globalAction.style.display = "none";
    const refreshButton = document.querySelector("#refresh-button"); if (refreshButton) refreshButton.title = "Actualizar estado real";
    window.lucide?.createIcons();
  }
  async function refresh() {
    if (!session() || state.loading) return; state.loading = true;
    try { state.data = await request("/api/admin-platform-overview"); state.error = ""; render(); }
    catch (error) { state.error = error.message; window.showToast?.(`Estado global no disponible: ${error.message}`); }
    state.loading = false;
  }
  async function runSource(button) {
    button.disabled = true;
    try { await request("/api/admin-platform-campaigns", { method: "POST", body: JSON.stringify({ platformSourceId: button.dataset.platformSourceRun }) }); window.showToast?.("Revisión encolada; el worker diario la recogerá y conserva el superadmin solicitante."); await refresh(); }
    catch (error) { window.showToast?.(error.message); button.disabled = false; }
  }
  function exportAudit() {
    if (!state.data?.auditEvents.length) return;
    const orgs = organizationMap(state.data); const rows = [["Fecha", "Tenant", "Actor", "Acción", "Recurso"], ...state.data.auditEvents.map((item) => [item.created_at, orgs.get(item.tenant_id)?.name || item.tenant_id, item.actor_label, item.action, item.target_type])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")).join("\r\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = `auditoria-plataforma-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
  document.addEventListener("click", (event) => { const run = event.target.closest?.("[data-platform-source-run]"); if (run) runSource(run); if (event.target.closest?.("[data-platform-audit-export]")) exportAudit(); });
  window.PlatformRuntime = { refresh };
  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0)); window.addEventListener("hashchange", () => { if (session()) setTimeout(render, 0); }); setTimeout(refresh, 0);
})();
