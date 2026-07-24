(function () {
  const state = { items: [], sortKey: "name", sortDirection: "asc", filters: { name: "", status: "", control: "" } };
  const statusLabels = { active: "Activa", onboarding: "Alta pendiente", archived: "Archivada", suspended: "Suspendida", unconfigured: "Sin configurar" };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  function normalize(item) {
    const rawStatus = item.status || ({ Activa: "active", Archivada: "archived", Pendiente: "onboarding" }[item.state] || "unconfigured");
    return {
      name: item.title || item.name || "Entidad sin nombre", slug: item.slug || "", rawStatus,
      status: item.state || statusLabels[rawStatus] || rawStatus,
      detail: item.detail || `${item.slug || "Sin slug"}${item.createdAt ? ` · alta ${new Date(item.createdAt).toLocaleDateString("es-ES")}` : ""}`,
      control: "Registro y ciclo de vida auditados"
    };
  }
  function tone(item) { return item.rawStatus === "active" ? "safe" : item.rawStatus === "archived" ? "warning" : "review"; }
  function iconAction(item, action, label, icon, enabled = true) {
    const title = enabled ? label : `${label}: no disponible en estado ${item.status}`;
    return `<button class="icon-button tenant-action-icon" data-tenant-admin-action="${action}" type="button" aria-label="${title}" title="${title}" ${enabled ? "" : "disabled"}><i data-lucide="${icon}"></i></button>`;
  }
  function row(item) {
    return `<div class="tenant-grid-row" data-tenant-slug="${escapeHtml(item.slug)}" role="row"><div role="cell"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.detail)}</span></div><div role="cell"><span class="badge ${tone(item)}">${escapeHtml(item.status)}</span></div><div role="cell"><span>Gobierno</span><strong>${escapeHtml(item.control)}</strong></div><div class="tenant-actions" role="cell">${iconAction(item, "export", "Exportar blueprint", "download")}${iconAction(item, "activate", "Activar tenant", "play", item.rawStatus === "onboarding")}${iconAction(item, "archive", "Archivar tenant", "archive", item.rawStatus === "active")}${iconAction(item, "restore", "Restaurar tenant", "rotate-ccw", item.rawStatus === "archived")}</div></div>`;
  }
  function visibleItems() {
    const filtered = state.items.filter((item) => item.name.toLowerCase().includes(state.filters.name) && (!state.filters.status || item.rawStatus === state.filters.status) && item.control.toLowerCase().includes(state.filters.control));
    return filtered.sort((left, right) => {
      const key = state.sortKey === "name" ? "name" : state.sortKey === "status" ? "status" : "control";
      return left[key].localeCompare(right[key], "es", { sensitivity: "base" }) * (state.sortDirection === "asc" ? 1 : -1);
    });
  }
  function sortButton(key, label) {
    const active = state.sortKey === key; const icon = active && state.sortDirection === "desc" ? "arrow-down" : active ? "arrow-up" : "arrow-up-down";
    return `<button type="button" data-tenant-sort="${key}" aria-label="Ordenar por ${label}">${label}<i data-lucide="${icon}"></i></button>`;
  }
  function render(items = state.items) {
    const host = document.querySelector("[data-tenant-grid-host]"); if (!host) return;
    state.items = items.map(normalize); const rows = visibleItems();
    host.innerHTML = `<div class="tenant-grid" role="table" aria-label="Entidades de la plataforma"><div class="tenant-grid-head" role="row"><span role="columnheader">${sortButton("name", "Entidad")}</span><span role="columnheader">${sortButton("status", "Estado")}</span><span role="columnheader">${sortButton("control", "Control")}</span><span role="columnheader">Operaciones</span></div><div class="tenant-grid-filters"><label><span class="sr-only">Filtrar entidad</span><input data-tenant-filter="name" value="${escapeHtml(state.filters.name)}" placeholder="Filtrar entidad…"></label><label><span class="sr-only">Filtrar estado</span><select data-tenant-filter="status"><option value="">Todos los estados</option>${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${state.filters.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label><span class="sr-only">Filtrar control</span><input data-tenant-filter="control" value="${escapeHtml(state.filters.control)}" placeholder="Filtrar control…"></label><label><span class="sr-only">Ordenar entidades</span><select data-tenant-quick-sort><option value="name:asc">Entidad A–Z</option><option value="name:desc">Entidad Z–A</option><option value="status:asc">Estado A–Z</option><option value="status:desc">Estado Z–A</option></select></label></div><div class="tenant-grid-body">${rows.map(row).join("") || '<div class="empty-state">No hay entidades que coincidan con los filtros.</div>'}</div></div>`;
    const quickSort = host.querySelector("[data-tenant-quick-sort]"); if (quickSort) quickSort.value = `${state.sortKey}:${state.sortDirection}`;
    window.lucide?.createIcons();
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-tenant-sort]"); if (!button) return;
    state.sortDirection = state.sortKey === button.dataset.tenantSort && state.sortDirection === "asc" ? "desc" : "asc"; state.sortKey = button.dataset.tenantSort; render();
  });
  document.addEventListener("input", (event) => {
    const filter = event.target.closest?.("[data-tenant-filter]"); if (!filter) return;
    state.filters[filter.dataset.tenantFilter] = filter.value.trim().toLowerCase(); render();
  });
  document.addEventListener("change", (event) => {
    const sort = event.target.closest?.("[data-tenant-quick-sort]"); if (!sort) return;
    [state.sortKey, state.sortDirection] = sort.value.split(":"); render();
  });
  window.TenantGrid = { render };
})();
