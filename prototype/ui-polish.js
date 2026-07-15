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
    "Fuente oficial": "external-link"
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
    const municipal = window.TENANT_RECOMMENDATIONS_APPLIED ? [] : window.MUNICIPAL_RADAR?.opportunities || [];
    return [...new Map([...baseRows, ...municipal].map((item) => [item.id, item])).values()];
  }

  function radarOpportunities() {
    return window.OpportunityScope?.rows() || [];
  }

  function notCurrentRows() {
    const currentIds = new Set(radarOpportunities().map((item) => String(item.id)));
    return (window.RADAR?.opportunities || []).filter((item) => !currentIds.has(String(item.id)));
  }

  function scopeRows() {
    if (gridState.scope === "discarded") return window.RADAR_ENTITY_DISCARDED || [];
    if (gridState.scope === "archived") return [...new Map([...notCurrentRows(), ...(window.RADAR_DEADLINE_ARCHIVED || []), ...privateArchivedRows()].map((item) => [String(item.id), item])).values()];
    if (gridState.scope === "sync") return window.RADAR_SYNC_PENDING || [];
    return radarOpportunities();
  }

  function scopeLabel() {
    const counts = radarCounts();
    return {
      active: "vivas o revisables",
      discarded: counts.humanDismissed ? "fuera de seguimiento" : "de bajo encaje",
      archived: "fuera de vigencia y conservadas para trazabilidad",
      sync: "con incidencia de sincronizacion"
    }[gridState.scope] || "vivas o revisables";
  }

  function radarCounts() {
    const fit = window.RADAR?.quality || {};
    return {
      active: radarOpportunities().length,
      discarded: Number(fit.entityDiscardedCount || 0),
      lowFit: Number(fit.entityLowFitCount || 0),
      humanDismissed: Number(fit.entityHumanDismissedCount || 0),
      archived: notCurrentRows().length + Number(fit.entityArchivedClosedCount || 0) + privateArchivedRows().length,
      sync: Number(fit.entityUnmappedMatchCount || 0)
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
    const total = Math.max(1, counts.active + counts.discarded + counts.archived + counts.sync);
    const activeEnd = counts.active / total * 100;
    const discardedEnd = activeEnd + counts.discarded / total * 100;
    const archivedEnd = discardedEnd + counts.archived / total * 100;
    return percent < activeEnd ? "active" : percent < discardedEnd ? "discarded" : percent < archivedEnd ? "archived" : "sync";
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
    return { activeId: "", selectedIds: [] };
  }

  function candidateSelection() {
    if (document.body.dataset.role === "entity" && !window.TENANT_RECOMMENDATIONS_APPLIED) return defaultCandidateSelection();
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
    if (gridState.scope === "archived") return "6-fuera de vigencia";
    if (gridState.scope === "sync") return "7-incidencia";
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
    if (gridState.scope === "discarded") return item.matchRecommendation?.decision_status === "dismissed" ? "Descartada" : "Bajo encaje";
    if (gridState.scope === "archived") return "Fuera de vigencia";
    if (gridState.scope === "sync") return "Conciliar datos";
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
    if (!isPlatform && gridState.scope === "archived") return item.deadlineStatus === "closed" ? "Cerrada (archivo)" : "Fuera de vigencia";
    if (!isPlatform && item.entityFit?.status === "discarded") return item.matchRecommendation?.decision_status === "dismissed" ? "Descartada" : "Bajo encaje";
    if (!isPlatform && item.entityFit?.status === "archived") return "Cerrada (archivo)";
    if (!isPlatform && item.entityFit?.status === "sync_pending") return "Incidencia de datos";
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
      "Bajo encaje": "3",
      "Descartada": "4",
      "Cerrada (archivo)": "5",
      "Incidencia de datos": "6"
    };
    const label = statusLabel(item);
    return `${order[label] || "9"}-${compactText(statusDetail(item)).toLowerCase()}`;
  }

  function candidateCell(item) {
    if (document.body.dataset.role === "superadmin") return `<span class="badge review">No aplica</span>`;
    if (item.syncIssue) return `<div class="candidate-state"><span class="badge warning">Conciliar</span><button class="icon-action" data-sync-issue="${escapeAttr(item.id)}" type="button" title="Revisar incidencia de sincronizacion" aria-label="Revisar incidencia de sincronizacion"><i data-lucide="git-compare-arrows"></i><span class="sr-only">Revisar incidencia de sincronizacion</span></button></div>`;
    if (gridState.scope === "archived") return `<span class="badge review">No vigente</span>`;
    const persisted = window.TenantMatchReview?.candidateCell(item);
    if (persisted) return persisted;
    if (document.body.dataset.role) {
      return `<div class="candidate-state"><button class="icon-action" data-action-info="unavailable" data-opportunity-id="${escapeAttr(item.id)}" type="button" title="Preseleccion no disponible" aria-label="Preseleccion no disponible"><i data-lucide="bookmark-x"></i><span class="sr-only">Preseleccion no disponible</span></button></div>`;
    }
    if (gridState.scope === "discarded") return `<span class="badge danger">No candidata</span>`;
    const selection = candidateSelection();
    const selected = selection.selectedIds.includes(item.id);
    const active = selection.activeId === item.id;
    if (active) {
      const docs = documentState(item.id);
      const label = docs?.projectState === "active" ? "Proyecto" : docs ? "Docs listas" : "Docs pendientes";
      const tone = docs?.projectState === "active" ? "safe" : "warning";
      return `<div class="candidate-state"><span class="badge ${tone}">${label}</span><button class="icon-action" data-candidate-detail="${item.id}" type="button" title="Ver candidatura" aria-label="Ver candidatura"><i data-lucide="folder-open"></i><span class="sr-only">Ver candidatura</span></button></div>`;
    }
    if (selected) return `<div class="candidate-state"><span class="badge review">Preseleccionada</span><button class="icon-action" data-candidate-action="activate" data-candidate-id="${item.id}" type="button" title="Preparar candidatura" aria-label="Preparar candidatura"><i data-lucide="folder-plus"></i><span class="sr-only">Preparar candidatura</span></button></div>`;
    return `<div class="candidate-state"><button class="icon-action" data-candidate-action="select" data-candidate-id="${item.id}" type="button" title="Preseleccionar" aria-label="Preseleccionar"><i data-lucide="bookmark-plus"></i><span class="sr-only">Preseleccionar</span></button></div>`;
  }

  function renderFilterHeaders(optionRows) {
    const cells = filterColumns.map(([key, label]) => {
      const listId = `grid-filter-options-${key}`;
      const value = gridState.filters[key] || "";
      const options = filterOptions(optionRows, key).slice(0, 80).map((option) => `<option value="${escapeAttr(option)}"></option>`).join("");
      return `<th><label class="grid-filter"><input data-grid-filter="${key}" aria-label="Filtrar por ${escapeAttr(label)}" list="${listId}" value="${escapeAttr(value)}" placeholder="Filtrar..." autocomplete="off" /><datalist id="${listId}">${options}</datalist></label></th>`;
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
    const officialLabel = isPublicOfficial ? "Ficha oficial de la convocatoria" : "Fuente de la convocatoria";
    if (item.syncIssue) return `<div class="opportunity-toolbar grid-actions">
      ${candidateCell(item)}
      ${item.officialUrl ? `<button class="icon-action" data-action-info="source" data-opportunity-id="${escapeAttr(item.id)}" type="button" title="${officialLabel}" aria-label="${officialLabel}"><i data-lucide="external-link"></i><span class="sr-only">${officialLabel}</span></button>` : ""}
    </div>`;
    return `
      <div class="opportunity-toolbar grid-actions">
        ${candidateCell(item)}
        <button class="icon-action" data-grid-opportunity="${item.id}" type="button" title="Ver analisis de encaje" aria-label="Ver analisis de encaje"><i data-lucide="eye"></i><span class="sr-only">Ver analisis de encaje</span></button>
        ${item.basesUrl ? `<button class="icon-action" data-action-info="bases" data-opportunity-id="${escapeAttr(item.id)}" type="button" title="${basesLabel}" aria-label="${basesLabel}"><i data-lucide="scale"></i><span class="sr-only">${basesLabel}</span></button>` : ""}
        ${item.extractedText ? `<button class="icon-action" data-grid-text="${item.id}" type="button" title="${textLabel}" aria-label="${textLabel}"><i data-lucide="file-text"></i><span class="sr-only">${textLabel}</span></button>` : ""}
        ${item.officialUrl ? `<button class="icon-action" data-action-info="source" data-opportunity-id="${escapeAttr(item.id)}" type="button" title="${officialLabel}" aria-label="${officialLabel}"><i data-lucide="external-link"></i><span class="sr-only">${officialLabel}</span></button>` : ""}
      </div>`;
    const reviewHtml = window.TenantMatchReview?.summaryHtml();
    if (reviewHtml) {
      const defaultCopy = panel.querySelector(".fit-copy");
      defaultCopy?.insertAdjacentHTML("beforebegin", reviewHtml);
      defaultCopy?.remove();
    }
  }

  function actionOpportunity(id) {
    return [...new Map([
      ...scopeRows(),
      ...publicRows(),
      ...privateOpenRows(),
      ...(window.RADAR_ENTITY_DISCARDED || []),
      ...(window.RADAR_DEADLINE_ARCHIVED || []),
      ...(window.RADAR_SYNC_PENDING || [])
    ].map((item) => [String(item.id), item])).values()].find((item) => String(item.id) === String(id));
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function officialDocuments(item) {
    const entries = (item?.documents || []).map((documentItem) => ({
      url: documentItem.downloadUrl,
      label: documentItem.description || documentItem.filename || "Documento de la convocatoria",
      fileName: documentItem.filename || "documento-oficial.pdf",
      detail: documentItem.publishedAt ? `Publicado ${documentItem.publishedAt}` : "Documento oficial"
    }));
    if (item?.basesUrl && !entries.some((entry) => entry.url === item.basesUrl)) entries.unshift({ url: item.basesUrl, label: "Documento principal de bases", fileName: "bases-oficiales.pdf", detail: "Documento principal" });
    (item?.supplementaryBasesUrls || []).forEach((url, index) => entries.push({ url, label: `Base reguladora complementaria ${index + 1}`, fileName: `base-reguladora-${index + 1}.pdf`, detail: "Fuente oficial complementaria" }));
    return [...new Map(entries.filter((entry) => safeExternalUrl(entry.url)).map((entry) => [safeExternalUrl(entry.url), { ...entry, url: safeExternalUrl(entry.url) }])).values()];
  }

  function viewerUrl(entry, download = false) {
    const params = new URLSearchParams({ url: entry.url, name: entry.fileName });
    if (download) params.set("download", "1");
    return `/api/public-document-viewer?${params.toString()}`;
  }

  function basesViewer(item) {
    const entries = officialDocuments(item);
    if (!entries.length) return `<div class="plain-note"><strong>Documento no disponible</strong><span>La fuente no ha proporcionado un PDF visualizable.</span></div>`;
    const first = entries[0];
    const selectors = entries.map((entry, index) => `<button class="document-viewer-choice ${index === 0 ? "is-selected" : ""}" data-document-viewer-url="${escapeAttr(viewerUrl(entry))}" data-document-download-url="${escapeAttr(viewerUrl(entry, true))}" data-document-source-url="${escapeAttr(entry.url)}" data-document-label="${escapeAttr(entry.label)}" type="button"><strong>${escapeAttr(entry.label)}</strong><span>${escapeAttr(entry.detail)}</span></button>`).join("");
    return `<div class="document-viewer-layout">
      <aside class="document-viewer-list" aria-label="Documentos disponibles">${selectors}</aside>
      <section class="document-viewer-panel">
        <div class="document-viewer-heading"><strong data-document-viewer-title>${escapeAttr(first.label)}</strong><div class="button-row"><a class="ghost-action" data-document-viewer-download href="${escapeAttr(viewerUrl(first, true))}"><i data-lucide="download"></i> Descargar</a></div></div>
        <iframe class="document-viewer-frame" data-document-viewer-frame src="${escapeAttr(viewerUrl(first))}" title="Visor de ${escapeAttr(first.label)}"></iframe>
        <div class="plain-note document-viewer-fallback"><span>Si el portal impide visualizar el PDF, puedes abrir la fuente oficial o descargar una copia.</span><a data-document-viewer-source href="${escapeAttr(first.url)}" target="_blank" rel="noreferrer">Abrir fuente oficial</a></div>
      </section>
    </div>`;
  }

  function openActionInfo(item, mode) {
    document.querySelector("[data-opportunity-action-modal]")?.remove();
    const isUnavailable = mode === "unavailable";
    const isBases = mode === "bases";
    const sourceUrl = safeExternalUrl(item?.officialUrl);
    const eyebrow = isUnavailable ? "ESTADO DEL ENCAJE" : isBases ? "DOCUMENTACION OFICIAL" : "PROCEDENCIA Y TRAZABILIDAD";
    const title = isUnavailable ? "Preseleccion no disponible" : isBases ? "Bases y documentos de la convocatoria" : "Fuente oficial de la convocatoria";
    const body = isUnavailable
      ? `<div class="plain-note"><strong>No se ha creado ninguna candidatura</strong><span>${escapeAttr(window.TENANT_MATCH_LOAD_ERROR || "Esta oportunidad pertenece al corpus general y aun no dispone de una recomendacion persistida para la entidad.")}</span></div><p>Recupera el encaje de la entidad y vuelve a revisar la oportunidad. Solo entonces la preseleccion se guardara y quedara auditada.</p>`
      : isBases
        ? `<div class="plain-note"><strong>${item?.basesStatus === "extracted" ? "Texto de bases extraido" : "Bases localizadas"}</strong><span>Consulta el documento oficial antes de decidir. La extraccion ayuda a revisar requisitos, pero no sustituye la validacion humana.</span></div>${basesViewer(item)}`
        : `<div class="plain-note"><strong>${escapeAttr(item?.source || "Fuente publica")}</strong><span>${escapeAttr([item?.sourceAuthority === "official_registry" ? "Registro oficial" : "Fuente identificada", item?.sourceId || item?.id].filter(Boolean).join(" · "))}</span></div><p>Esta es la procedencia registrada para contrastar la convocatoria y sus posibles cambios.</p>${sourceUrl ? `<div class="button-row"><a class="ghost-action" href="${escapeAttr(sourceUrl)}" target="_blank" rel="noreferrer">Abrir ficha oficial</a></div>` : ""}`;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" data-opportunity-action-modal data-close-action-info>
        <article class="modal ${isBases ? "document-viewer-modal" : ""}" role="dialog" aria-modal="true" aria-labelledby="opportunity-action-title">
          <div class="panel-heading"><div><p class="eyebrow">${eyebrow}</p><h2 id="opportunity-action-title">${title}</h2></div><button class="icon-button" data-close-action-info type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
          ${item?.title ? `<strong>${escapeAttr(item.title)}</strong>` : ""}
          ${body}
        </article>
      </div>`);
    window.lucide?.createIcons();
  }

  function openSyncIssue(item) {
    if (!item?.syncIssue) return;
    document.querySelector("[data-sync-issue-modal]")?.remove();
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" data-sync-issue-modal data-close-sync-issue>
        <article class="modal" role="dialog" aria-modal="true" aria-labelledby="sync-issue-title">
          <div class="panel-heading"><div><p class="eyebrow">CONCILIACION DE DATOS</p><h2 id="sync-issue-title">Revisar correspondencia</h2></div><button class="icon-button" data-close-sync-issue type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
          <strong>${escapeAttr(item.title)}</strong>
          <div class="plain-note"><strong>No se encontro una correspondencia unica</strong><span>La conciliacion automatica ya comprobo el identificador y la URL oficial. Esta excepcion no se presenta como oportunidad accionable hasta resolverla.</span></div>
          <dl class="sync-issue-data"><div><dt>Referencia persistida</dt><dd>${escapeAttr(item.syncIssue.canonicalKey || "No disponible")}</dd></div><div><dt>Fuente</dt><dd>${escapeAttr(item.source)}</dd></div><div><dt>Plazo registrado</dt><dd>${escapeAttr(item.deadline)}</dd></div></dl>
          <div class="button-row">
            <button class="ghost-action" data-sync-retry type="button"><i data-lucide="refresh-cw"></i> Reintentar conciliacion</button>
            ${item.officialUrl ? `<a class="ghost-action" href="${escapeAttr(item.officialUrl)}" target="_blank" rel="noreferrer"><i data-lucide="external-link"></i> Abrir fuente oficial</a>` : ""}
            <button class="ghost-action" data-sync-dismiss data-match-decision="dismissed" data-recommendation-id="${escapeAttr(item.syncIssue.recommendationId)}" type="button"><i data-lucide="archive-x"></i> Descartar como obsoleta</button>
          </div>
        </article>
      </div>`);
    window.lucide?.createIcons();
  }

  function programFeatures(item) {
    if (!item.programFeatures?.length || item.sourceScope === "Publica oficial") return "";
    return `<small class="grid-program-features">${item.programFeatures.slice(0, 3).join(" · ")}</small>`;
  }

  function renderGridStatus(totalRows, visibleRows) {
    const holder = document.querySelector("#opportunity-pagination");
    if (!holder) return;
    holder.textContent = `${visibleRows} de ${totalRows} resultados visibles`;
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
    window.lucide?.createIcons();
  }

  function renderEntityFitDashboard() {
    const panel = document.querySelector("#entity-fit-note");
    const fit = window.RADAR?.quality;
    if (!panel || !fit) return;
    const counts = radarCounts();
    const total = Math.max(1, counts.active + counts.discarded + counts.archived + counts.sync);
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
      const coverage = window.PLATFORM_COVERAGE;
      const privateSources = Math.max(0, Number(coverage?.privateOpen?.sourcesReviewed || 1) - 1);
      const privateOpen = Number(coverage?.privateOpen?.activeOrOpen || 0);
      panel.innerHTML = `
        <div class="fit-copy">
          <strong>Oportunidades disponibles hoy</strong>
          <span>La Base Nacional de Subvenciones y los financiadores privados se revisan de forma periódica. Solo se muestran oportunidades con vigencia suficiente.</span>
        </div>
        <div class="fit-legend">
          <span class="is-current"><span class="dot active"></span><b>${counts.active}</b> En seguimiento</span>
          <span><span class="dot discarded"></span><b>${privateSources}</b> Financiadores privados</span>
          <span><span class="dot archived"></span><b>${privateOpen}</b> Convocatorias privadas abiertas</span>
        </div>`;
      return;
    }
    if (!window.TENANT_RECOMMENDATIONS_APPLIED || !fit.entityFitRule) {
      const loadState = window.TENANT_MATCH_LOAD_STATE || "loading";
      const title = loadState === "error" ? "Encaje guardado no disponible" : "Cargando encaje de la entidad";
      const detail = loadState === "error"
        ? `${window.TENANT_MATCH_LOAD_ERROR || "No se pudo recuperar el estado de la entidad."} El listado inferior es el corpus general y no representa candidaturas.`
        : "Recuperando el resultado y las decisiones guardadas. El listado general no se considera una seleccion de la entidad.";
      panel.innerHTML = `
        <div class="fit-copy">
          <strong>${title}</strong>
          <span>${detail}</span>
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
          ${segment("sync")}
        </svg>
      </div>
      <div class="fit-legend">
        <button class="${gridState.scope === "active" ? "is-current" : ""}" data-entity-scope="active" type="button"><span class="dot active"></span><b>${counts.active}</b> En seguimiento</button>
        <button class="${gridState.scope === "discarded" ? "is-current" : ""}" data-entity-scope="discarded" type="button" title="${counts.lowFit} de bajo encaje · ${counts.humanDismissed} descartadas por decision humana"><span class="dot discarded"></span><b>${counts.discarded}</b> ${counts.humanDismissed ? "Fuera de seguimiento" : "Bajo encaje"}</button>
        <button class="${gridState.scope === "archived" ? "is-current" : ""}" data-entity-scope="archived" type="button" title="Plazo cerrado, fecha superada o vigencia no acreditada; se conservan para trazabilidad"><span class="dot archived"></span><b>${counts.archived}</b> Fuera de vigencia</button>
        <button class="${gridState.scope === "sync" ? "is-current" : ""}" data-entity-scope="sync" type="button" title="Excepciones que no pudo resolver la conciliacion automatica"><span class="dot sync"></span><b>${counts.sync}</b> Conciliar datos</button>
      </div>`;
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
    if (!list || document.querySelector("#opportunity-grid")) return;
    const fit = window.RADAR?.quality || {};
    if (!document.querySelector("#entity-fit-note")) {
      list.insertAdjacentHTML("beforebegin", `
        <div class="plain-note entity-fit-note" id="entity-fit-note">
          <strong>${fit.entityFitRule ? "Radar de entidad" : "Corpus disponible · encaje pendiente"}</strong>
          <span>${fit.entityFitRule ? `${radarCounts().active} oportunidades en seguimiento. ${fit.entityDiscardedCount || 0} no encajan y ${fit.entityArchivedClosedCount || 0} están archivadas.` : `${radarCounts().active} oportunidades del radar general; todavía no están filtradas para la entidad.`}</span>
        </div>`);
    }
    list.insertAdjacentHTML("beforebegin", `
      <div class="opportunity-grid-tools">
        <div class="sr-only" id="opportunity-pagination" aria-live="polite"></div>
        <button class="icon-button radar-chat-button" data-open-opportunity-chat type="button" title="Conversar con el radar" aria-label="Conversar con el radar"><i data-lucide="message-square-text"></i></button>
      </div>`);
    list.insertAdjacentHTML("afterend", `<div id="opportunity-grid" class="opportunity-grid" hidden></div>`);
    document.querySelector("#opportunity-grid")?.addEventListener("scroll", (event) => {
      const grid = event.currentTarget;
      const isNearBottom = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 120;
      if (isNearBottom && gridState.visibleRows < lastFilteredRowCount) {
        gridState.visibleRows = Math.min(lastFilteredRowCount, gridState.visibleRows + gridState.loadStep);
        renderOpportunityGrid();
      }
    });
    document.addEventListener("click", (event) => {
      const closeActionInfo = event.target.closest?.("[data-close-action-info]");
      if (closeActionInfo && (closeActionInfo.matches("button") || closeActionInfo === event.target)) {
        closeActionInfo.closest("[data-opportunity-action-modal]")?.remove();
        return;
      }
      const closeSyncIssue = event.target.closest?.("[data-close-sync-issue]");
      if (closeSyncIssue && (closeSyncIssue.matches("button") || closeSyncIssue === event.target)) {
        closeSyncIssue.closest("[data-sync-issue-modal]")?.remove();
        return;
      }
      const sort = event.target.closest("[data-grid-sort]");
      const rowAction = event.target.closest("[data-grid-opportunity], [data-grid-text]");
      const candidateAction = event.target.closest("[data-candidate-action]");
      const actionInfo = event.target.closest("[data-action-info]");
      const viewerChoice = event.target.closest("[data-document-viewer-url]");
      const entityScope = event.target.closest("[data-entity-scope]");
      const fitChart = event.target.closest("[data-fit-chart]");
      const clearFilters = event.target.closest("[data-grid-clear-filters]");
      const syncIssue = event.target.closest("[data-sync-issue]");
      const syncRetry = event.target.closest("[data-sync-retry]");
      const syncDismiss = event.target.closest("[data-sync-dismiss]");
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
      if (actionInfo) {
        openActionInfo(actionOpportunity(actionInfo.dataset.opportunityId), actionInfo.dataset.actionInfo);
      }
      if (syncIssue) openSyncIssue(actionOpportunity(syncIssue.dataset.syncIssue));
      if (syncRetry) {
        syncRetry.disabled = true;
        Promise.resolve(window.refreshTenantMatchState?.()).then(() => {
          syncRetry.closest("[data-sync-issue-modal]")?.remove();
          if (typeof showToast === "function") showToast("Conciliacion actualizada.");
        }).catch((error) => {
          syncRetry.disabled = false;
          if (typeof showToast === "function") showToast(error.message || "No se pudo actualizar la conciliacion.");
        });
      }
      if (syncDismiss) syncDismiss.closest("[data-sync-issue-modal]")?.remove();
      if (viewerChoice) {
        const modal = viewerChoice.closest("[data-opportunity-action-modal]");
        modal.querySelectorAll("[data-document-viewer-url]").forEach((button) => button.classList.toggle("is-selected", button === viewerChoice));
        const frame = modal.querySelector("[data-document-viewer-frame]");
        frame.src = viewerChoice.dataset.documentViewerUrl;
        frame.title = `Visor de ${viewerChoice.dataset.documentLabel}`;
        modal.querySelector("[data-document-viewer-title]").textContent = viewerChoice.dataset.documentLabel;
        modal.querySelector("[data-document-viewer-download]").href = viewerChoice.dataset.documentDownloadUrl;
        modal.querySelector("[data-document-viewer-source]").href = viewerChoice.dataset.documentSourceUrl;
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
        if (candidateAction.dataset.candidateAction === "select" && typeof showToast === "function") showToast("Oportunidad preseleccionada.");
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
    window.addEventListener("tenant-recommendations-applied", () => { renderEntityFitDashboard(); renderOpportunityGrid(); });
    window.addEventListener("tenant-match-load-state", () => { renderEntityFitDashboard(); renderOpportunityGrid(); });
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
