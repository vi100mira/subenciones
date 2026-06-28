(function () {
  const candidateKey = "workspace-candidates-v1";

  function opportunities() {
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

  function selectedOpportunities() {
    const rows = opportunities();
    const selection = candidateSelection();
    const active = rows.find((item) => item.id === selection.activeId) || rows[0];
    const alternatives = selection.selectedIds
      .filter((id) => id !== active?.id)
      .map((id) => rows.find((item) => item.id === id))
      .filter(Boolean);
    const fallback = rows.filter((item) => item.id !== active?.id && !selection.selectedIds.includes(item.id)).slice(0, Math.max(0, 3 - alternatives.length));
    return [
      { item: active, state: "Activa", tone: "safe", note: "Seleccionada para preparar checklist y borrador." },
      ...[...alternatives, ...fallback].slice(0, 3).map((item, index) => ({
        item,
        state: index === 0 ? "En evaluacion" : "Preseleccionada",
        tone: index === 0 ? "warning" : "review",
        note: index === 0 ? "Requiere confirmar plazo y requisitos." : "Guardada para comparar antes de decidir."
      }))
    ].filter((entry) => entry.item);
  }

  function card(entry) {
    return `
      <article class="candidate-card ${entry.state === "Activa" ? "is-active" : ""}">
        <div>
          <strong>${entry.item.title}</strong>
          <span>${entry.item.source} - ${entry.item.deadline} - ${entry.item.deadlineConfidence}</span>
        </div>
        <div>
          <span class="badge ${entry.tone}">${entry.state}</span>
          <button class="ghost-action" data-workspace-open="${entry.item.id}" type="button">Ver</button>
        </div>
        <p>${entry.note}</p>
      </article>`;
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
              <p class="eyebrow">Preseleccion humana</p>
              <h2>Candidaturas candidatas</h2>
            </div>
            <span class="badge review">${selected.length} en seguimiento</span>
          </div>
          <div class="plain-note">
            <strong>Como llega aqui</strong>
            <span>El radar propone oportunidades; una persona las preselecciona. Solo la marcada como activa genera checklist, memoria y anexos.</span>
          </div>
          <div class="candidate-list">${selected.map(card).join("")}</div>
        </article>
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
    if (trigger) window.openOpportunityModal?.(trigger.dataset.workspaceOpen, "analysis");
  });

  setTimeout(renderWorkspaceFlow, 0);
  window.addEventListener("hashchange", renderWorkspaceFlow);
  window.addEventListener("workspace-candidates-changed", renderWorkspaceFlow);
})();
