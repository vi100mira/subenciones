(function () {
  const candidateKey = "workspace-candidates-v1";
  const watchKey = "tenant-watch-demo-v1";
  const documentBlobKey = "tenant-document-blob-demo-v1";

  function opportunities() {
    if (typeof window.currentOpportunities === "function") return window.currentOpportunities();
    return window.RADAR?.opportunities || [];
  }

  function defaultSelection() {
    const rows = opportunities();
    const activeId = rows.find((item) => item.id === "bdns-908014")?.id || rows[0]?.id || "";
    return { activeId, selectedIds: rows.slice(0, 4).map((item) => item.id) };
  }

  function candidateSelection() {
    try {
      return { ...defaultSelection(), ...JSON.parse(localStorage.getItem(candidateKey) || "{}") };
    } catch {
      return defaultSelection();
    }
  }

  function watchedIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem(watchKey) || "[]").filter((watch) => watch.status === "active").map((watch) => watch.id));
    } catch {
      return new Set();
    }
  }

  function documentState(id) {
    try {
      return JSON.parse(localStorage.getItem(documentBlobKey) || "{}")[id] || null;
    } catch {
      return null;
    }
  }

  function selectedOpportunities() {
    const rows = opportunities();
    const selection = candidateSelection();
    const active = rows.find((item) => item.id === selection.activeId) || rows[0];
    const alternatives = selection.selectedIds
      .filter((id) => id !== active?.id)
      .map((id) => rows.find((item) => item.id === id))
      .filter(Boolean);
    const fallback = rows.filter((item) => item.id !== active?.id && !selection.selectedIds.includes(item.id)).slice(0, Math.max(0, 3 - alternatives.length));
    const watched = watchedIds();
    const activeDocs = documentState(active?.id);
    const activeState = activeDocs?.projectState === "active" ? "Proyecto activo" : activeDocs ? "Documentacion preparada" : "Documentacion pendiente";
    return [
      { item: active, active: true, state: activeState, tone: activeDocs?.projectState === "active" ? "safe" : "warning", note: activeDocs ? "Paquete Word preparado; falta revision humana antes de uso externo." : "Debe preparar documentacion Word antes de activar como proyecto." },
      ...[...alternatives, ...fallback].slice(0, 3).map((item, index) => ({
        item,
        active: false,
        state: index === 0 ? "En evaluacion" : "Preseleccionada",
        tone: index === 0 ? "warning" : "review",
        note: index === 0 ? "Requiere confirmar plazo y requisitos." : "Guardada para comparar antes de decidir."
      }))
    ].filter((entry) => entry.item).map((entry) => ({ ...entry, watched: watched.has(entry.item.id) || entry.state === "Proyecto activo" || entry.state === "Documentacion preparada" }));
  }

  function card(entry) {
    return `
      <article class="candidate-card ${entry.active ? "is-current" : ""} ${entry.state === "Proyecto activo" || entry.state === "Documentacion preparada" ? "is-active" : ""}">
        <div>
          <strong>${entry.item.title}</strong>
          <span>${entry.item.source} - ${entry.item.deadline} - ${entry.item.deadlineConfidence}</span>
        </div>
        <div>
          ${entry.active ? '<span class="badge safe">Expediente abierto</span>' : ""}
          <span class="badge ${entry.tone}">${entry.state}</span>
          ${entry.watched ? '<span class="badge safe">Avisos activos</span>' : ""}
          <button class="ghost-action" data-workspace-open="${entry.item.id}" type="button">${entry.active ? "Ver detalle" : "Abrir expediente"}</button>
        </div>
        <p>${entry.note} ${entry.watched ? "Se avisara si cambian plazo, bases o criterios." : ""}</p>
      </article>`;
  }

  function stateFlow() {
    return `
      <div class="candidate-state-flow" aria-label="Flujo de una candidatura">
        <span><strong>1</strong> Radar</span>
        <span class="is-current"><strong>2</strong> Preseleccion</span>
        <span><strong>3</strong> Documentacion Word</span>
        <span><strong>4</strong> Proyecto activo</span>
        <span><strong>5</strong> Presentacion revisada</span>
      </div>`;
  }

  function renderWorkspaceFlow() {
    const screen = document.querySelector("#workspace");
    if (!screen) return;
    const selected = selectedOpportunities();
    const active = selected[0]?.item;
    screen.dataset.flowReady = "true";
    screen.innerHTML = `
      <div class="workspace-flow">
        <article class="panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Bandeja de candidaturas</p>
              <h2>Candidaturas en seguimiento</h2>
            </div>
            <span class="badge review">${selected.length} en seguimiento</span>
          </div>
          ${stateFlow()}
          <div class="plain-note">
            <strong>Como se avanza</strong>
              <span>El radar propone oportunidades; una persona abre uno o varios expedientes. Cada expediente pasa a documentacion Word y solo se activa como proyecto tras revision humana.</span>
          </div>
          <div class="watch-note"><strong>Seguimiento de cambios</strong><span>Las candidaturas activas quedan vigiladas contra cambios de plazo, bases, criterios y canal de presentacion.</span></div>
          <div class="candidate-list">${selected.map(card).join("")}</div>
        </article>
        <div id="workspace-detail-anchor" class="workspace-detail-anchor" aria-live="polite"></div>
        <div class="workbench">
          <article class="panel">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">Candidatura activa</p>
                <h2>${active?.title || "Sin candidatura activa"}</h2>
              </div>
              <span class="badge review">Revision humana</span>
            </div>
            <div id="checklist" class="checklist"></div>
          </article>
          <article class="panel">
            <div class="panel-heading">
              <h2>Borrador de propuesta</h2>
              <button class="ghost-action">Exportar borrador Word</button>
            </div>
            <div id="proposal-outline" class="proposal-outline"></div>
          </article>
        </div>
      </div>`;
    if (typeof renderWorkspace === "function") renderWorkspace();
    window.lucide?.createIcons();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-workspace-open]");
    if (!trigger) return;
    if (window.openWorkspaceAnalysis?.(trigger.dataset.workspaceOpen)) return;
    window.openOpportunityModal?.(trigger.dataset.workspaceOpen, "analysis");
  });

  setTimeout(renderWorkspaceFlow, 0);
  window.addEventListener("hashchange", renderWorkspaceFlow);
  window.addEventListener("workspace-candidates-changed", renderWorkspaceFlow);
  window.addEventListener("tenant-watch-changed", renderWorkspaceFlow);
})();
