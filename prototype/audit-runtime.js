(function () {
  const state = { events: [], filters: { search: "", actor: "", date: "" }, loading: false, error: "" };
  const labels = {
    "entity_research.queued": "Investigación de entidad encolada",
    "entity_research.started": "Investigación de entidad iniciada",
    "entity_research.generated_for_review": "Investigación preparada para revisión",
    "entity_research.failed": "Investigación de entidad fallida",
    "entity_profile.suggestions_reviewed": "Sugerencias de perfil revisadas",
    "entity_profile.approved": "Perfil de entidad aprobado",
    "match_agent.queued": "Cálculo de encaje encolado",
    "match_agent.started": "Cálculo de encaje iniciado",
    "match_agent.generated_for_review": "Encaje preparado para revisión",
    "match_agent.failed": "Cálculo de encaje fallido",
    "document_review.queued": "Revisión documental encolada",
    "document_review.started": "Revisión documental iniciada",
    "document_review.generated_for_review": "Revisión documental preparada",
    "document_review.failed": "Revisión documental fallida",
    "draft_agent.queued": "Borrador documental encolado",
    "draft_agent.started": "Borrador documental iniciado",
    "draft_agent.generated_for_review": "Borrador preparado para revisión",
    "draft_agent.failed": "Preparación documental fallida",
    "private_ingestion.queued": "Análisis documental privado encolado",
    "private_ingestion.started": "Análisis documental privado iniciado",
    "private_ingestion.completed": "Análisis documental privado completado",
    "private_ingestion.cancelled": "Análisis documental privado cancelado",
    "private_ingestion.failed": "Análisis documental privado fallido",
    "entity_profile.master_approved": "Plantilla maestra privada aprobada",
    "audit.exported": "Auditoría exportada"
  };

  function session() { const value = window.CredentialsAuth?.getSession?.(); return value?.role === "entity" && value?.tenantId ? value : null; }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function actionLabel(action) { return labels[action] || String(action || "Evento").replaceAll(".", " · ").replaceAll("_", " "); }
  function detailText(detail) {
    if (!detail || typeof detail !== "object") return "Sin detalle adicional";
    return Object.entries(detail).slice(0, 8).map(([key, value]) => `${key.replaceAll("_", " ")}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join(" · ") || "Sin detalle adicional";
  }
  async function request(method = "GET", body) {
    const current = session(); if (!current) throw new Error("Inicia sesión como entidad para consultar la auditoría real.");
    const response = await fetch("/api/tenant-audit-events", {
      method,
      headers: { "Content-Type": "application/json", "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current) },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 401) {
      window.CredentialsAuth.handleUnauthorized?.();
      throw new Error("Tu sesiÃ³n ha caducado. Vuelve a acceder para consultar la auditorÃ­a.");
    }
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data;
  }
  function filteredEvents() {
    const search = state.filters.search.toLowerCase();
    return state.events.filter((item) => {
      const haystack = [actionLabel(item.action), item.actor_label, item.target_type, item.target_id, detailText(item.detail_json)].join(" ").toLowerCase();
      return (!search || haystack.includes(search)) && (!state.filters.actor || item.actor_label === state.filters.actor) && (!state.filters.date || item.created_at.slice(0, 10) === state.filters.date);
    });
  }
  function row(item) {
    const date = new Date(item.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
    return `<div class="audit-grid-row" role="row"><time role="cell">${escapeHtml(date)}</time><span role="cell">${escapeHtml(item.actor_label)}</span><strong role="cell">${escapeHtml(actionLabel(item.action))}</strong><span role="cell">${escapeHtml(item.target_type)}</span><span role="cell">${escapeHtml(detailText(item.detail_json))}</span></div>`;
  }
  function render() {
    const target = document.querySelector("#audit-timeline"); if (!target) return;
    document.querySelector("#audit .panel-heading h2").textContent = "Eventos reales de la entidad";
    const actors = [...new Set(state.events.map((item) => item.actor_label).filter(Boolean))].sort();
    const events = filteredEvents();
    target.innerHTML = `<div class="audit-filter-grid"><label><span>Buscar</span><input data-audit-filter="search" value="${escapeHtml(state.filters.search)}" placeholder="Acción, recurso o detalle" /></label><label><span>Actor</span><select data-audit-filter="actor"><option value="">Todos</option>${actors.map((actor) => `<option value="${escapeHtml(actor)}" ${state.filters.actor === actor ? "selected" : ""}>${escapeHtml(actor)}</option>`).join("")}</select></label><label><span>Fecha</span><input data-audit-filter="date" type="date" value="${escapeHtml(state.filters.date)}" /></label><button class="ghost-action" data-audit-clear type="button">Limpiar filtros</button></div>
      <div class="plain-note"><strong>${events.length} eventos visibles</strong><span>Registro persistido y aislado para esta entidad. La exportación también queda auditada.</span></div>
      ${state.loading ? '<div class="empty-state">Cargando eventos reales…</div>' : state.error ? `<div class="empty-state warning">${escapeHtml(state.error)}</div>` : `<div class="audit-table" role="table" aria-label="Eventos de auditoría"><div class="audit-grid-row audit-grid-header" role="row"><span role="columnheader">Fecha</span><span role="columnheader">Actor</span><span role="columnheader">Acción</span><span role="columnheader">Recurso</span><span role="columnheader">Detalle</span></div>${events.length ? events.map(row).join("") : '<div class="empty-state">No hay eventos con estos filtros.</div>'}</div>`}`;
  }
  async function load() {
    state.loading = true; state.error = ""; render();
    try { state.events = await request(); } catch (error) { state.error = error.message; }
    state.loading = false; render();
  }
  function csvCell(value) {
    let text = String(value ?? "").replace(/\r?\n/g, " ");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }
  async function exportExcel(button) {
    const events = filteredEvents(); if (!events.length) return window.showToast?.("No hay eventos para exportar con estos filtros.");
    button.disabled = true;
    try {
      await request("POST", { action: "record_export", count: events.length, filters: state.filters });
      const rows = [["Fecha", "Actor", "Acción", "Recurso", "ID recurso", "Detalle"], ...events.map((item) => [item.created_at, item.actor_label, actionLabel(item.action), item.target_type, item.target_id, detailText(item.detail_json)])];
      const blob = new Blob(["\ufeff", rows.map((values) => values.map(csvCell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `auditoria-entidad-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
      window.showToast?.("Auditoría exportada para Excel y registrada."); await load();
    } catch (error) { window.showToast?.(error.message); }
    button.disabled = false;
  }
  document.addEventListener("input", (event) => { const input = event.target.closest?.("[data-audit-filter]"); if (!input) return; state.filters[input.dataset.auditFilter] = input.value; render(); });
  document.addEventListener("change", (event) => { const input = event.target.closest?.("[data-audit-filter]"); if (!input) return; state.filters[input.dataset.auditFilter] = input.value; render(); });
  document.addEventListener("click", (event) => { const clear = event.target.closest?.("[data-audit-clear]"); if (clear) { state.filters = { search: "", actor: "", date: "" }; render(); } const button = event.target.closest?.("[data-audit-export]"); if (button) exportExcel(button); });
  window.addEventListener("role-session-applied", () => setTimeout(load, 0));
  window.addEventListener("hashchange", () => { if (location.hash === "#view-audit") load(); });
  setTimeout(load, 0);
})();
