(function () {
  const actionIcons = {
    "Ver evidencia": "file-search",
    "Verificar": "shield-check",
    "Preparar Word": "file-text",
    "Anexar": "paperclip",
    "Ver analisis": "scan-search",
    "Bases": "scale",
    "Ver texto original usado": "file-text",
    "API oficial": "external-link"
  };

  function applyWorkspaceActionIcons() {
    document.querySelectorAll("[data-workspace-action]").forEach((button) => {
      const label = button.dataset.workspaceAction || button.textContent.trim();
      const icon = actionIcons[label] || "circle-ellipsis";
      button.classList.add("icon-action");
      button.title = label;
      button.setAttribute("aria-label", label);
      button.innerHTML = `<i data-lucide="${icon}"></i><span class="sr-only">${label}</span>`;
    });
    window.lucide?.createIcons();
  }

  function applyOpportunityActionIcons() {
    document.querySelectorAll(".opportunity-item .button-row").forEach((row) => {
      row.classList.add("opportunity-toolbar");
      row.querySelectorAll("button, a").forEach((control) => {
        const label = control.textContent.trim();
        const icon = actionIcons[label] || "circle-ellipsis";
        control.classList.add("icon-action");
        control.title = label;
        control.setAttribute("aria-label", label);
        control.innerHTML = `<i data-lucide="${icon}"></i><span class="sr-only">${label}</span>`;
      });
    });
    window.lucide?.createIcons();
  }

  function watchOpportunityList() {
    const list = document.querySelector("#opportunity-list");
    if (!list) return;
    new MutationObserver(() => {
      applyOpportunityActionIcons();
      renderOpportunityGrid();
      setOpportunityView(currentOpportunityView());
    }).observe(list, { childList: true });
  }

  const gridState = { sort: "score", dir: "desc", query: "" };
  const candidateKey = "workspace-candidates-v1";

  function radarOpportunities() {
    return window.RADAR?.opportunities?.length ? window.RADAR.opportunities : window.MOCK.opportunities;
  }

  function currentOpportunityView() {
    return "grid";
  }

  function activeFilter() {
    return document.querySelector("[data-filter].is-selected")?.dataset.filter || "all";
  }

  function matchesFilter(item) {
    const filter = activeFilter();
    const critical = item.deadlineStatus === "open" && (item.deadlineConfidence === "Baja" || item.score >= 70);
    const privateSource = !["BDNS/SNPSAP"].includes(item.source);
    return filter === "critical" ? critical : filter === "private" ? privateSource : true;
  }

  function compactText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function sortValue(item, key) {
    if (key === "deadline") return item.deadlineEnd || item.deadline || "";
    if (key === "score") return Number(item.score || 0);
    return compactText(item[key]).toLowerCase();
  }

  function sortMark(key) {
    const active = gridState.sort === key;
    const icon = active ? (gridState.dir === "desc" ? "arrow-down" : "arrow-up") : "arrow-up-down";
    const label = active ? `Orden ${gridState.dir === "desc" ? "descendente" : "ascendente"}` : "Ordenar columna";
    return `<span class="sort-mark"><i data-lucide="${icon}"></i><span class="sr-only">${label}</span></span>`;
  }

  function sortAria(key) {
    if (gridState.sort !== key) return "none";
    return gridState.dir === "desc" ? "descending" : "ascending";
  }

  function defaultCandidateSelection() {
    const rows = radarOpportunities();
    const activeId = rows.find((item) => item.id === "bdns-908014")?.id || rows[0]?.id || "";
    return { activeId, selectedIds: rows.slice(0, 4).map((item) => item.id) };
  }

  function candidateSelection() {
    try {
      return { ...defaultCandidateSelection(), ...JSON.parse(localStorage.getItem(candidateKey) || "{}") };
    } catch {
      return defaultCandidateSelection();
    }
  }

  function saveCandidateSelection(next) {
    localStorage.setItem(candidateKey, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("workspace-candidates-changed"));
  }

  function candidateCell(item) {
    const selection = candidateSelection();
    const selected = selection.selectedIds.includes(item.id);
    const active = selection.activeId === item.id;
    if (active) return `<div class="candidate-state"><span class="badge safe">Activa</span><button class="ghost-action" data-candidate-action="open" data-candidate-id="${item.id}" type="button">Abrir</button></div>`;
    if (selected) return `<div class="candidate-state"><span class="badge review">Preseleccionada</span><button class="ghost-action" data-candidate-action="activate" data-candidate-id="${item.id}" type="button">Activar</button></div>`;
    return `<div class="candidate-state"><button class="ghost-action" data-candidate-action="select" data-candidate-id="${item.id}" type="button">Preseleccionar</button></div>`;
  }

  function selectGridOpportunity(id) {
    if (typeof state !== "undefined" && typeof renderOpportunities === "function") {
      state.selectedOpportunityId = id;
      renderOpportunities();
    }
  }

  function gridActions(item) {
    return `
      <div class="opportunity-toolbar grid-actions">
        <button class="icon-action" data-grid-opportunity="${item.id}" title="Ver" aria-label="Ver"><i data-lucide="eye"></i><span class="sr-only">Ver</span></button>
        ${item.basesUrl ? `<a class="icon-action" href="${item.basesUrl}" target="_blank" rel="noreferrer" title="Bases" aria-label="Bases"><i data-lucide="scale"></i><span class="sr-only">Bases</span></a>` : ""}
        ${item.extractedText ? `<button class="icon-action" data-grid-text="${item.id}" title="Ver texto original usado" aria-label="Ver texto original usado"><i data-lucide="file-text"></i><span class="sr-only">Ver texto original usado</span></button>` : ""}
        ${item.officialUrl ? `<a class="icon-action" href="${item.officialUrl}" target="_blank" rel="noreferrer" title="API oficial" aria-label="API oficial"><i data-lucide="external-link"></i><span class="sr-only">API oficial</span></a>` : ""}
      </div>`;
  }

  function renderOpportunityGrid() {
    const grid = document.querySelector("#opportunity-grid");
    if (!grid) return;
    const selectedId = typeof state !== "undefined" ? state.selectedOpportunityId : "";
    const query = gridState.query.toLowerCase();
    const rows = radarOpportunities()
      .filter(matchesFilter)
      .filter((item) => !query || [item.title, item.source, item.theme, item.territory, item.organism].some((value) => compactText(value).toLowerCase().includes(query)))
      .sort((a, b) => {
        const av = sortValue(a, gridState.sort);
        const bv = sortValue(b, gridState.sort);
        const result = av > bv ? 1 : av < bv ? -1 : 0;
        return gridState.dir === "asc" ? result : -result;
      });
    const body = rows.length ? rows.map((item) => `
      <tr class="${item.id === selectedId ? "is-selected" : ""}" data-row-opportunity="${item.id}">
        <td><button class="grid-title" data-grid-opportunity="${item.id}">${item.title}</button><span>${item.organism || item.source}</span></td>
        <td>${item.source}</td>
        <td><strong>${item.score}</strong><span>${item.score >= 75 ? "Alta" : item.score >= 55 ? "Media" : "Baja"}</span></td>
        <td>${item.deadline}<span>${item.deadlineConfidence || "Sin valorar"}</span></td>
        <td>${item.theme}<span>${item.territory}</span></td>
        <td>${candidateCell(item)}</td>
        <td>${item.deadlineStatus === "uncertain" ? "Plazo incierto" : item.deadlineStatus === "closed" ? "Cerrada" : "Abierta"}<span>${item.amount || "Sin importe"}</span></td>
        <td>${gridActions(item)}</td>
      </tr>`).join("") : `<tr><td colspan="8" class="grid-empty">No hay oportunidades con estos filtros.</td></tr>`;
    grid.innerHTML = `
      <table>
        <thead><tr>
          <th aria-sort="${sortAria("title")}"><button data-grid-sort="title">Convocatoria ${sortMark("title")}</button></th>
          <th aria-sort="${sortAria("source")}"><button data-grid-sort="source">Fuente ${sortMark("source")}</button></th>
          <th aria-sort="${sortAria("score")}"><button data-grid-sort="score">Prioridad ${sortMark("score")}</button></th>
          <th aria-sort="${sortAria("deadline")}"><button data-grid-sort="deadline">Plazo ${sortMark("deadline")}</button></th>
          <th aria-sort="${sortAria("theme")}"><button data-grid-sort="theme">Ambito ${sortMark("theme")}</button></th>
          <th>Candidatura</th>
          <th>Estado</th><th>Acciones</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>`;
    syncGridTopScroll();
    window.lucide?.createIcons();
  }

  function syncGridTopScroll() {
    const grid = document.querySelector("#opportunity-grid");
    const topScroll = document.querySelector("#opportunity-grid-x-scroll");
    const spacer = topScroll?.querySelector("span");
    const table = grid?.querySelector("table");
    if (!grid || !topScroll || !spacer || !table) return;
    spacer.style.width = `${table.scrollWidth}px`;
    topScroll.scrollLeft = grid.scrollLeft;
  }

  function setOpportunityView(view) {
    const list = document.querySelector("#opportunity-list");
    const grid = document.querySelector("#opportunity-grid");
    if (!list || !grid) return;
    list.hidden = true;
    grid.hidden = false;
    document.querySelectorAll("[data-opportunity-view]").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.opportunityView === "grid");
    });
    renderOpportunityGrid();
  }

  function bindOpportunityGrid() {
    const list = document.querySelector("#opportunity-list");
    const heading = document.querySelector("#opportunities .list-panel .panel-heading");
    if (!list || !heading || document.querySelector("#opportunity-grid")) return;
    const fit = window.RADAR?.quality;
    if (fit?.entityFitRule && !document.querySelector("#entity-fit-note")) {
      heading.insertAdjacentHTML("afterend", `
        <div class="plain-note entity-fit-note" id="entity-fit-note">
          <strong>Filtro de entidad activo</strong>
          <span>${window.RADAR_ENTITY_CONTEXT?.name || "Entidad actual"}: ${fit.entityCandidateCount} oportunidades vivas o revisables. ${fit.entityDiscardedCount} descartadas por territorio y ${fit.entityArchivedClosedCount || 0} archivadas por plazo cerrado.</span>
        </div>`);
    }
    const filters = [...heading.querySelectorAll(".segmented")].find((group) => group.querySelector("[data-filter]"));
    if (filters && !filters.closest(".filter-control")) {
      const wrapper = document.createElement("div");
      wrapper.className = "filter-control";
      wrapper.innerHTML = `<span class="control-label">Filtrar</span>`;
      filters.before(wrapper);
      wrapper.append(filters);
    }
    (document.querySelector("#entity-fit-note") || heading).insertAdjacentHTML("afterend", `
      <div class="opportunity-grid-tools">
        <button class="ghost-action radar-chat-button" data-open-opportunity-chat type="button"><i data-lucide="message-square-text"></i> Conversar con radar</button>
      </div>`);
    list.insertAdjacentHTML("afterend", `<div id="opportunity-grid-x-scroll" class="opportunity-grid-x-scroll" aria-label="Desplazamiento horizontal del grid"><span></span></div><div id="opportunity-grid" class="opportunity-grid" hidden></div>`);
    const topScroll = document.querySelector("#opportunity-grid-x-scroll");
    topScroll?.addEventListener("scroll", () => {
      const grid = document.querySelector("#opportunity-grid");
      if (grid) grid.scrollLeft = topScroll.scrollLeft;
    });
    document.querySelector("#opportunity-grid")?.addEventListener("scroll", (event) => {
      const scroller = document.querySelector("#opportunity-grid-x-scroll");
      if (scroller) scroller.scrollLeft = event.currentTarget.scrollLeft;
    });
    document.addEventListener("click", (event) => {
      const sort = event.target.closest("[data-grid-sort]");
      const rowAction = event.target.closest("[data-grid-opportunity], [data-grid-text]");
      const candidateAction = event.target.closest("[data-candidate-action]");
      if (sort) {
        gridState.dir = gridState.sort === sort.dataset.gridSort && gridState.dir === "desc" ? "asc" : "desc";
        gridState.sort = sort.dataset.gridSort;
        renderOpportunityGrid();
      }
      if (rowAction?.dataset.gridOpportunity) {
        selectGridOpportunity(rowAction.dataset.gridOpportunity);
        window.openOpportunityModal?.(rowAction.dataset.gridOpportunity, "analysis");
      }
      if (rowAction?.dataset.gridText) {
        selectGridOpportunity(rowAction.dataset.gridText);
        window.openOpportunityModal?.(rowAction.dataset.gridText, "text");
      }
      if (candidateAction) {
        const selection = candidateSelection();
        const id = candidateAction.dataset.candidateId;
        const selectedIds = selection.selectedIds.includes(id) ? selection.selectedIds : [id, ...selection.selectedIds];
        const next = candidateAction.dataset.candidateAction === "activate" || candidateAction.dataset.candidateAction === "open"
          ? { activeId: id, selectedIds }
          : { ...selection, selectedIds };
        saveCandidateSelection(next);
        renderOpportunityGrid();
        if (candidateAction.dataset.candidateAction === "open" && typeof showScreen === "function") showScreen("workspace");
      }
    });
    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => setTimeout(renderOpportunityGrid, 0)));
    setOpportunityView(currentOpportunityView());
  }

  function bindSidebarCollapse() {
    const button = document.querySelector("#sidebar-toggle");
    if (!button) return;
    const setButtonState = (collapsed) => {
      button.title = collapsed ? "Expandir menu lateral" : "Colapsar menu lateral";
      button.setAttribute("aria-label", button.title);
      button.querySelector("i")?.setAttribute("data-lucide", collapsed ? "panel-left-open" : "panel-left-close");
    };
    const stored = localStorage.getItem("sidebar-collapsed") === "true";
    document.body.classList.toggle("sidebar-collapsed", stored);
    setButtonState(stored);
    button.addEventListener("click", () => {
      const collapsed = !document.body.classList.contains("sidebar-collapsed");
      document.body.classList.toggle("sidebar-collapsed", collapsed);
      localStorage.setItem("sidebar-collapsed", String(collapsed));
      setButtonState(collapsed);
      window.lucide?.createIcons();
    });
  }

  bindSidebarCollapse();
  bindOpportunityGrid();
  applyWorkspaceActionIcons();
  applyOpportunityActionIcons();
  watchOpportunityList();
})();
