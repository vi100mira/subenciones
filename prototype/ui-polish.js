(function () {
  const actionIcons = {
    "Ver evidencia": "file-search",
    "Verificar": "shield-check",
    "Preparar Word": "file-text",
    "Anexar": "paperclip",
    "Ver analisis": "scan-search",
    "Bases": "scale",
    "Bases/convocatoria": "scale",
    "Ver texto original usado": "file-text",
    "Texto fuente privada usado": "file-text",
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
    applyOpportunityCandidateState();
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

  function applyOpportunityCandidateState() {
    const selection = candidateSelection();
    document.querySelectorAll(".opportunity-item").forEach((card, index) => {
      const item = currentOpportunities()[index];
      const active = item?.id && selection.activeId === item.id;
      card.classList.toggle("is-candidate-active", Boolean(active));
      const button = card.querySelector("[data-opportunity]");
      if (!button || !active) return;
      button.removeAttribute("data-opportunity");
      button.dataset.candidateDetail = item.id;
      button.textContent = "Ver detalle";
    });
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

  const gridState = { sort: "score", dir: "desc", query: "", scope: "active", visibleRows: 30, loadStep: 30, filters: {} };
  let lastFilteredRowCount = 0;
  const filterColumns = [
    ["title", "Convocatoria"],
    ["source", "Fuente"],
    ["score", "Prioridad"],
    ["deadline", "Plazo"],
    ["theme", "Ambito"],
    ["status", "Estado"],
    ["actions", "Acciones"]
  ];
  const candidateKey = "workspace-candidates-v1";
  const documentBlobKey = "tenant-document-blob-demo-v1";

  function privateOpenRows() {
    return [...(window.MOCK.opportunities || []), ...(window.PRIVATE_OPEN_OPPORTUNITIES || [])].filter((item) => item.sourceScope && item.sourceScope !== "Publica oficial" && !item.sourceScope.toLowerCase().includes("tenant"));
  }

  function privateArchivedRows() {
    return privateOpenRows()
      .filter((item) => item.deadlineStatus === "closed" && (document.body.dataset.role === "superadmin" || item.entityFit?.status === "candidate"))
      .map((item) => ({
        ...item,
        entityFit: {
          status: "archived",
          reason: "Archivada por plazo cerrado; conserva ficha y bases para trazabilidad."
        }
      }));
  }

  function privateActiveRows() {
    return privateOpenRows().filter((item) => item.actionable === true && item.deadlineStatus === "open" && (document.body.dataset.role === "superadmin" || item.entityFit?.status === "candidate"));
  }

  function publicRows() {
    const baseRows = document.body.dataset.role === "superadmin" && window.RADAR_PLATFORM_OPPORTUNITIES?.length ? window.RADAR_PLATFORM_OPPORTUNITIES : window.RADAR?.opportunities || [];
    return [...new Map([...baseRows, ...(window.MUNICIPAL_RADAR?.opportunities || [])].map((item) => [item.id, item])).values()];
  }

  function radarOpportunities() {
    const rows = publicRows();
    return rows.length ? [...rows, ...privateActiveRows()] : window.MOCK.opportunities;
  }

  function scopeRows() {
    if (gridState.scope === "discarded") return window.RADAR_ENTITY_DISCARDED || [];
    if (gridState.scope === "archived") return [...(window.RADAR_DEADLINE_ARCHIVED || []), ...privateArchivedRows()];
    return radarOpportunities();
  }

  function scopeLabel() {
    return {
      active: "vivas o revisables",
      discarded: "descartadas por territorio",
      archived: "archivadas por plazo cerrado"
    }[gridState.scope] || "vivas o revisables";
  }

  function radarCounts() {
    const fit = window.RADAR?.quality || {};
    return {
      active: radarOpportunities().length,
      discarded: Number(fit.entityDiscardedCount || 0),
      archived: Number(fit.entityArchivedClosedCount || 0) + privateArchivedRows().length
    };
  }

  function setEntityScope(scope) {
    gridState.scope = scope;
    gridState.visibleRows = gridState.loadStep;
    renderEntityFitDashboard();
    renderOpportunityGrid();
  }

  function scopeFromChartClick(event, chart) {
    const rect = chart.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    if (distance < rect.width * 0.22 || distance > rect.width * 0.55) return "";
    const degrees = (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360;
    const percent = degrees / 360 * 100;
    const counts = radarCounts();
    const total = Math.max(1, counts.active + counts.discarded + counts.archived);
    const activeEnd = counts.active / total * 100;
    const discardedEnd = activeEnd + counts.discarded / total * 100;
    return percent < activeEnd ? "active" : percent < discardedEnd ? "discarded" : "archived";
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
    const privateSource = item.sourceScope ? item.sourceScope !== "Publica oficial" : !["BDNS/SNPSAP"].includes(item.source);
    return filter === "critical" ? critical : filter === "private" ? privateSource : true;
  }

  function compactText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function escapeAttr(value) {
    return compactText(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function priorityLabel(item) {
    return item.score >= 75 ? "Alta" : item.score >= 55 ? "Media" : "Baja";
  }

  function operationalAreaLabel(item) {
    const text = compactText([item.theme, item.title, ...(item.programFeatures || [])].join(" ")).toLowerCase();
    if (text.includes("servicios sociales") || text.includes("promocion social") || text.includes("promoción social") || text.includes("accion social") || text.includes("acción social") || text.includes("accion comunitaria") || text.includes("inclusion social") || text.includes("inclusión social")) return "Accion social";
    if (text.includes("empleo") || text.includes("desempleo") || text.includes("insercion laboral") || text.includes("inserción laboral")) return "Empleo";
    if (text.includes("educacion") || text.includes("educación") || text.includes("competencias digitales") || text.includes("inclusion digital") || text.includes("inclusión digital")) return "Educacion y digital";
    return "";
  }

  function sortValue(item, key) {
    if (key === "deadline") return item.deadlineEnd || item.deadline || "";
    if (key === "score") return Number(item.score || 0);
    if (key === "candidate") return candidateSortValue(item);
    if (key === "status") return statusSortValue(item);
    return compactText(item[key]).toLowerCase();
  }

  function filterValue(item, key) {
    if (key === "title") return compactText([item.title, item.organism || item.source, ...(item.programFeatures || [])].join(" "));
    if (key === "score") return `${item.score} ${priorityLabel(item)}`;
    if (key === "deadline") return compactText([item.deadline, item.deadlineConfidence].join(" "));
    if (key === "theme") return compactText([item.theme, item.territory, operationalAreaLabel(item)].join(" "));
    if (key === "actions") return candidateLabel(item);
    if (key === "status") return compactText([statusLabel(item), item.entityFit?.reason || item.amount || "Sin importe"].join(" "));
    return compactText(item[key]);
  }

  function matchesColumnFilters(item, exceptKey = "") {
    return filterColumns.every(([key]) => {
      if (key === exceptKey) return true;
      const term = compactText(gridState.filters[key]).toLowerCase();
      return !term || filterValue(item, key).toLowerCase().includes(term);
    });
  }

  function filterOptions(rows, key) {
    const options = new Set();
    rows.filter((item) => matchesColumnFilters(item, key)).forEach((item) => {
      if (key === "score") {
        options.add(priorityLabel(item));
        options.add(String(item.score));
      } else if (key === "theme") {
        options.add(item.theme);
        options.add(item.territory);
        options.add(operationalAreaLabel(item));
      } else if (key === "status") {
        options.add(statusLabel(item));
      } else if (key === "actions") {
        options.add(candidateLabel(item));
      } else {
        options.add(filterValue(item, key));
      }
    });
    return [...options].map(compactText).filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
  }

  function hasColumnFilters() {
    return filterColumns.some(([key]) => compactText(gridState.filters[key]));
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

  function documentState(id) {
    try {
      return JSON.parse(localStorage.getItem(documentBlobKey) || "{}")[id] || null;
    } catch {
      return null;
    }
  }

  function candidateSortValue(item) {
    if (document.body.dataset.role === "superadmin") return "0-no-aplica";
    if (gridState.scope === "discarded") return "5-no candidata";
    if (gridState.scope === "archived") return "6-archivada";
    const selection = candidateSelection();
    const docs = documentState(item.id);
    if (selection.activeId === item.id && docs?.projectState === "active") return "0-proyecto";
    if (selection.activeId === item.id && docs) return "1-docs listas";
    if (selection.activeId === item.id) return "2-docs pendientes";
    if (selection.selectedIds.includes(item.id)) return "3-preseleccionada";
    return "4-preseleccionar";
  }

  function candidateLabel(item) {
    if (document.body.dataset.role === "superadmin") return "No aplica";
    if (gridState.scope === "discarded") return "No candidata";
    if (gridState.scope === "archived") return "Archivada";
    const selection = candidateSelection();
    const docs = documentState(item.id);
    if (selection.activeId === item.id && docs?.projectState === "active") return "Proyecto";
    if (selection.activeId === item.id && docs) return "Docs listas";
    if (selection.activeId === item.id) return "Docs pendientes";
    if (selection.selectedIds.includes(item.id)) return "Preseleccionada";
    return "Preseleccionar";
  }

  function statusLabel(item) {
    const isPlatform = document.body.dataset.role === "superadmin";
    if (!isPlatform && item.entityFit?.status === "discarded") return "Descartada";
    if (!isPlatform && item.entityFit?.status === "archived") return "Archivada";
    if (item.deadlineStatus === "uncertain") return "Plazo incierto";
    if (item.deadlineStatus === "closed") return "Cerrada";
    return "Abierta";
  }

  function statusDetail(item) {
    if (document.body.dataset.role === "superadmin") return item.amount || item.evidenceQuality || "Sin importe";
    return item.entityFit?.reason || item.amount || "Sin importe";
  }

  function statusSortValue(item) {
    const order = {
      "Abierta": "0",
      "Plazo incierto": "1",
      "Cerrada": "2",
      "Descartada": "3",
      "Archivada": "4"
    };
    const label = statusLabel(item);
    return `${order[label] || "9"}-${compactText(statusDetail(item)).toLowerCase()}`;
  }

  function candidateCell(item) {
    if (document.body.dataset.role === "superadmin") return `<span class="badge review">No aplica</span>`;
    if (gridState.scope === "discarded") return `<span class="badge danger">No candidata</span>`;
    if (gridState.scope === "archived") return `<span class="badge review">Archivada</span>`;
    const selection = candidateSelection();
    const selected = selection.selectedIds.includes(item.id);
    const active = selection.activeId === item.id;
    if (active) {
      const docs = documentState(item.id);
      const label = docs?.projectState === "active" ? "Proyecto" : docs ? "Docs listas" : "Docs pendientes";
      const tone = docs?.projectState === "active" ? "safe" : "warning";
      return `<div class="candidate-state"><span class="badge ${tone}">${label}</span><button class="ghost-action" data-candidate-detail="${item.id}" type="button">Ver detalle</button></div>`;
    }
    if (selected) return `<div class="candidate-state"><span class="badge review">Preseleccionada</span><button class="ghost-action" data-candidate-action="activate" data-candidate-id="${item.id}" type="button">Preparar</button></div>`;
    return `<div class="candidate-state"><button class="ghost-action" data-candidate-action="select" data-candidate-id="${item.id}" type="button">Preseleccionar</button></div>`;
  }

  function renderFilterHeaders(optionRows) {
    const cells = filterColumns.map(([key, label]) => {
      const listId = `grid-filter-options-${key}`;
      const value = gridState.filters[key] || "";
      const options = filterOptions(optionRows, key).slice(0, 80).map((option) => `<option value="${escapeAttr(option)}"></option>`).join("");
      return `<th><label class="grid-filter"><span>${label}</span><input data-grid-filter="${key}" list="${listId}" value="${escapeAttr(value)}" placeholder="Filtrar..." autocomplete="off" /><datalist id="${listId}">${options}</datalist></label></th>`;
    }).join("");
    return `<tr class="grid-filter-row">${cells}</tr>`;
  }

  function selectGridOpportunity(id) {
    if (typeof state !== "undefined" && typeof renderOpportunities === "function") {
      state.selectedOpportunityId = id;
      renderOpportunities();
    }
  }

  function gridActions(item) {
    const isPublicOfficial = (item.sourceScope || "").includes("Publica oficial") || item.source === "BDNS/SNPSAP";
    const basesLabel = isPublicOfficial ? "Bases reguladoras" : "Bases/convocatoria privada";
    const textLabel = item.sourceTextLabel || (isPublicOfficial ? "Texto original usado" : "Texto fuente privada usado");
    const officialLabel = isPublicOfficial ? "API oficial BDNS" : "Fuente externa";
    return `
      <div class="opportunity-toolbar grid-actions">
        ${candidateCell(item)}
        <button class="icon-action" data-grid-opportunity="${item.id}" title="Ver" aria-label="Ver"><i data-lucide="eye"></i><span class="sr-only">Ver</span></button>
        ${item.basesUrl ? `<a class="icon-action" href="${item.basesUrl}" target="_blank" rel="noreferrer" title="${basesLabel}" aria-label="${basesLabel}"><i data-lucide="scale"></i><span class="sr-only">${basesLabel}</span></a>` : ""}
        ${item.extractedText ? `<button class="icon-action" data-grid-text="${item.id}" title="${textLabel}" aria-label="${textLabel}"><i data-lucide="file-text"></i><span class="sr-only">${textLabel}</span></button>` : ""}
        ${item.officialUrl ? `<a class="icon-action" href="${item.officialUrl}" target="_blank" rel="noreferrer" title="${officialLabel}" aria-label="${officialLabel}"><i data-lucide="external-link"></i><span class="sr-only">${officialLabel}</span></a>` : ""}
      </div>`;
  }

  function programFeatures(item) {
    if (!item.programFeatures?.length || item.sourceScope === "Publica oficial") return "";
    return `<small class="grid-program-features">${item.programFeatures.slice(0, 3).join(" · ")}</small>`;
  }

  function renderGridStatus(totalRows, visibleRows) {
    const holder = document.querySelector("#opportunity-pagination");
    if (!holder) return;
    const publicLoaded = window.RADAR_PLATFORM_OPPORTUNITIES?.length || window.RADAR?.count || 0;
    const publicPotential = window.RADAR?.totalElements || publicLoaded;
    holder.innerHTML = `
      <span><strong>${visibleRows}</strong> de ${totalRows} resultados visibles</span>
      <div class="pager-buttons">
        ${hasColumnFilters() ? `<button class="ghost-action grid-clear-inline" data-grid-clear-filters type="button">Limpiar filtros</button>` : ""}
      </div>
      <small>BDNS público cargado: ${publicLoaded}/${publicPotential}. Desplázate dentro de la tabla para cargar más resultados; la cabecera permanece visible.</small>`;
  }

  function renderOpportunityGrid() {
    const grid = document.querySelector("#opportunity-grid");
    if (!grid) return;
    const selectedId = typeof state !== "undefined" ? state.selectedOpportunityId : "";
    const query = gridState.query.toLowerCase();
    const baseRows = scopeRows()
      .filter(matchesFilter)
      .filter((item) => !query || [item.title, item.source, item.theme, item.territory, item.organism].some((value) => compactText(value).toLowerCase().includes(query)));
    const filteredRows = baseRows
      .filter(matchesColumnFilters)
      .sort((a, b) => {
        const av = sortValue(a, gridState.sort);
        const bv = sortValue(b, gridState.sort);
        const result = av > bv ? 1 : av < bv ? -1 : 0;
        return gridState.dir === "asc" ? result : -result;
      });
    lastFilteredRowCount = filteredRows.length;
    gridState.visibleRows = Math.min(Math.max(gridState.loadStep, gridState.visibleRows), Math.max(gridState.loadStep, filteredRows.length));
    const rows = filteredRows.slice(0, gridState.visibleRows);
    const emptyMessage = hasColumnFilters()
      ? `No hay oportunidades con esta combinacion. <button class="ghost-action grid-clear-inline" data-grid-clear-filters type="button">Limpiar filtros</button>`
      : "No hay oportunidades con estos filtros.";
    const body = rows.length ? rows.map((item) => `
      <tr class="${item.id === selectedId ? "is-selected" : ""} ${candidateSelection().activeId === item.id ? "is-candidate-active" : ""}" data-row-opportunity="${item.id}">
        <td><button class="grid-title" data-grid-opportunity="${item.id}">${item.title}</button><span>${item.organism || item.source}</span>${programFeatures(item)}</td>
        <td>${item.source}</td>
        <td><strong>${item.score}</strong><span>${item.score >= 75 ? "Alta" : item.score >= 55 ? "Media" : "Baja"}</span></td>
        <td>${window.deadlineTrace ? window.deadlineTrace.cell(item) : `${item.deadline}<span>${item.deadlineConfidence || "Sin valorar"}</span>`}</td>
        <td>${item.theme}<span>${item.territory}</span></td>
        <td>${statusLabel(item)}<span>${statusDetail(item)}</span></td>
        <td>${gridActions(item)}</td>
      </tr>`).join("") : `<tr><td colspan="7" class="grid-empty">${emptyMessage}</td></tr>`;
    grid.innerHTML = `
      <table>
        <thead><tr>
          <th aria-sort="${sortAria("title")}"><button data-grid-sort="title">Convocatoria ${sortMark("title")}</button></th>
          <th aria-sort="${sortAria("source")}"><button data-grid-sort="source">Fuente ${sortMark("source")}</button></th>
          <th aria-sort="${sortAria("score")}"><button data-grid-sort="score">Prioridad ${sortMark("score")}</button></th>
          <th aria-sort="${sortAria("deadline")}"><button data-grid-sort="deadline">Plazo ${sortMark("deadline")}</button></th>
          <th aria-sort="${sortAria("theme")}"><button data-grid-sort="theme">Ambito ${sortMark("theme")}</button></th>
          <th aria-sort="${sortAria("status")}"><button data-grid-sort="status">Estado ${sortMark("status")}</button></th><th>Acciones</th>
        </tr>${renderFilterHeaders(baseRows)}</thead>
        <tbody>${body}</tbody>
      </table>`;
    renderGridStatus(filteredRows.length, Math.min(rows.length, filteredRows.length));
    syncGridTopScroll();
    window.lucide?.createIcons();
  }

  function renderEntityFitDashboard() {
    const panel = document.querySelector("#entity-fit-note");
    const fit = window.RADAR?.quality;
    if (!panel || !fit) return;
    const counts = radarCounts();
    const total = Math.max(1, counts.active + counts.discarded + counts.archived);
    let offset = 0;
    const segment = (scope) => {
      const percent = counts[scope] ? (counts[scope] / total) * 100 : 0;
      const html = `<circle class="fit-segment is-${scope}${gridState.scope === scope ? " is-current" : ""}" cx="22" cy="22" r="15.9" pathLength="100" stroke-dasharray="${percent} ${100 - percent}" stroke-dashoffset="${-offset}"></circle>`;
      offset += percent;
      return html;
    };
    const isPlatform = document.body.dataset.role === "superadmin";
    panel.classList.toggle("is-platform-corpus", isPlatform);
    if (isPlatform) {
      const privateOpen = privateOpenRows().length;
      const publicTotal = publicRows().length;
      const platformTotal = publicTotal + privateOpen;
      const publicPotential = Number(window.RADAR?.totalElements || 0);
      const coverage = window.PLATFORM_COVERAGE;
      panel.innerHTML = `
        <div class="fit-copy">
          <strong>Estado funcional de agentes</strong>
          <span>BDNS esta refrescado hoy. Privado abierto se mide por fuentes monitorizadas; no hay contador universal privado sin ampliar catalogo y scraping.</span>
        </div>
        <div class="fit-legend">
          <span class="is-current"><span class="dot active"></span><b>${publicTotal}/${publicPotential}</b> Publicas BDNS</span>
          <span><span class="dot discarded"></span><b>${coverage?.privateOpen?.sourcesReviewed || "?"}</b><span>Fuentes privadas<small>${coverage?.privateOpen?.activeOrOpen || "?"} activas/open</small></span></span>
          <span><span class="dot archived"></span><b>${platformTotal}</b> Filas cargadas</span>
        </div>`;
      return;
    }
    panel.innerHTML = `
      <div class="fit-copy">
        <strong>Radar de entidad</strong>
        <span>${window.RADAR_ENTITY_CONTEXT?.name || "Entidad actual"}: viendo ${scopeRows().length} ${scopeLabel()}.</span>
      </div>
      <div class="fit-chart" data-fit-chart title="Pincha un segmento para ver ese grupo" aria-label="Distribucion de oportunidades del radar">
        <svg viewBox="0 0 44 44">
          <circle class="fit-ring" cx="22" cy="22" r="15.9"></circle>
          ${segment("active")}
          ${segment("discarded")}
          ${segment("archived")}
        </svg>
      </div>
      <div class="fit-legend">
        <button class="${gridState.scope === "active" ? "is-current" : ""}" data-entity-scope="active" type="button"><span class="dot active"></span><b>${counts.active}</b> Vivas</button>
        <button class="${gridState.scope === "discarded" ? "is-current" : ""}" data-entity-scope="discarded" type="button"><span class="dot discarded"></span><b>${counts.discarded}</b> Descartadas</button>
        <button class="${gridState.scope === "archived" ? "is-current" : ""}" data-entity-scope="archived" type="button"><span class="dot archived"></span><b>${counts.archived}</b> Archivadas</button>
      </div>`;
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
          <strong>Radar de entidad</strong>
          <span>Corpus plataforma: ${radarCounts().active} oportunidades vivas o revisables. ${fit.entityDiscardedCount} descartadas por territorio y ${fit.entityArchivedClosedCount || 0} archivadas por plazo cerrado.</span>
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
        <div class="grid-pagination" id="opportunity-pagination" aria-live="polite"></div>
        <div id="opportunity-grid-x-scroll" class="opportunity-grid-x-scroll" aria-label="Desplazamiento horizontal del grid"><span></span></div>
        <button class="ghost-action radar-chat-button" data-open-opportunity-chat type="button"><i data-lucide="message-square-text"></i> Conversar con radar</button>
      </div>`);
    list.insertAdjacentHTML("afterend", `<div id="opportunity-grid" class="opportunity-grid" hidden></div>`);
    const topScroll = document.querySelector("#opportunity-grid-x-scroll");
    topScroll?.addEventListener("scroll", () => {
      const grid = document.querySelector("#opportunity-grid");
      if (grid) grid.scrollLeft = topScroll.scrollLeft;
    });
    document.querySelector("#opportunity-grid")?.addEventListener("scroll", (event) => {
      const grid = event.currentTarget;
      const scroller = document.querySelector("#opportunity-grid-x-scroll");
      if (scroller) scroller.scrollLeft = grid.scrollLeft;
      const isNearBottom = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 120;
      if (isNearBottom && gridState.visibleRows < lastFilteredRowCount) {
        gridState.visibleRows = Math.min(lastFilteredRowCount, gridState.visibleRows + gridState.loadStep);
        renderOpportunityGrid();
      }
    });
    document.addEventListener("click", (event) => {
      const sort = event.target.closest("[data-grid-sort]");
      const rowAction = event.target.closest("[data-grid-opportunity], [data-grid-text]");
      const candidateAction = event.target.closest("[data-candidate-action]");
      const entityScope = event.target.closest("[data-entity-scope]");
      const fitChart = event.target.closest("[data-fit-chart]");
      const clearFilters = event.target.closest("[data-grid-clear-filters]");
      if (clearFilters) {
        gridState.filters = {};
        gridState.visibleRows = gridState.loadStep;
        renderOpportunityGrid();
      }
      if (entityScope) {
        setEntityScope(entityScope.dataset.entityScope);
      }
      if (fitChart && !entityScope) {
        const scope = scopeFromChartClick(event, fitChart);
        if (scope) setEntityScope(scope);
      }
      if (sort) {
        gridState.dir = gridState.sort === sort.dataset.gridSort && gridState.dir === "desc" ? "asc" : "desc";
        gridState.sort = sort.dataset.gridSort;
        gridState.visibleRows = gridState.loadStep;
        renderOpportunityGrid();
      }
      if (rowAction?.dataset.gridOpportunity) {
        selectGridOpportunity(rowAction.dataset.gridOpportunity);
        const selection = candidateSelection();
        if (selection.activeId === rowAction.dataset.gridOpportunity) window.openActiveCandidateModal?.(rowAction.dataset.gridOpportunity);
        else window.openOpportunityModal?.(rowAction.dataset.gridOpportunity, "analysis");
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
        if (candidateAction.dataset.candidateAction === "activate" && window.openWorkspaceAnalysis?.(id)) return;
        if (candidateAction.dataset.candidateAction === "open") window.openActiveCandidateModal?.(id);
      }
    });
    document.addEventListener("input", (event) => {
      const filter = event.target.closest("[data-grid-filter]");
      if (!filter) return;
      gridState.filters[filter.dataset.gridFilter] = filter.value;
      gridState.visibleRows = gridState.loadStep;
      renderOpportunityGrid();
      document.querySelector(`[data-grid-filter="${filter.dataset.gridFilter}"]`)?.focus();
    });
    document.addEventListener("keydown", (event) => {
      const entityScope = event.target.closest?.("[data-entity-scope]");
      if (!entityScope || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      entityScope.click();
    });
    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { gridState.visibleRows = gridState.loadStep; setTimeout(renderOpportunityGrid, 0); }));
    window.addEventListener("workspace-candidates-changed", () => { applyOpportunityCandidateState(); renderOpportunityGrid(); });
    window.addEventListener("role-session-applied", () => { renderEntityFitDashboard(); renderOpportunityGrid(); });
    renderEntityFitDashboard();
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
