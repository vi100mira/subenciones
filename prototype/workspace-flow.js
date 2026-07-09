(function () {
  const candidateKey = "workspace-candidates-v1";
  const watchKey = "tenant-watch-demo-v1";
  const documentBlobKey = "tenant-document-blob-demo-v1";
  const guideCollapsedKey = "candidate-guide-collapsed-v1";

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
    const action = entry.active
      ? `<button class="ghost-action" data-candidate-detail="${entry.item.id}" type="button">Ver detalle</button>`
      : `<button class="ghost-action" data-workspace-open="${entry.item.id}" type="button">Abrir expediente</button>`;
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
          ${action}
        </div>
        <p>${entry.note} ${entry.watched ? "Se avisara si cambian plazo, bases o criterios." : ""}</p>
      </article>`;
  }

  function candidateProgressStep(activeState) {
    if (activeState === "Proyecto activo") return 4;
    if (activeState === "Documentacion preparada") return 3;
    return 2;
  }

  function isGuideCollapsed() {
    try {
      return localStorage.getItem(guideCollapsedKey) === "true";
    } catch {
      return false;
    }
  }

  function setGuideCollapsed(collapsed) {
    try {
      localStorage.setItem(guideCollapsedKey, collapsed ? "true" : "false");
    } catch {
      // Non-critical prototype preference.
    }
  }

  function candidateGuide(selected, activeState) {
    const currentStep = candidateProgressStep(activeState);
    const collapsed = isGuideCollapsed();
    const steps = [
      ["Radar", "Detecta y propone oportunidades de forma automatica, antes de que exista ningun expediente."],
      ["Preseleccion", "Una persona revisa las propuestas y abre uno o varios expedientes para avanzar."],
      ["Documentacion Word", "Cada expediente se redacta y estructura como documento de trabajo."],
      ["Proyecto activo", "Solo se activa como proyecto tras una revision humana del expediente."],
      ["Presentacion revisada", "Control final del expediente antes de enviarlo a presentacion."]
    ];
    return `
      <section class="candidate-guide ${collapsed ? "is-collapsed" : ""}" aria-label="Como avanza una candidatura">
        <div class="candidate-guide-heading">
          <div class="candidate-guide-copy">
            <p class="eyebrow">Bandeja de candidaturas</p>
            <h2>Como avanza una candidatura, paso a paso</h2>
            <p>Desde que el radar detecta una oportunidad hasta que se presenta, cada expediente atraviesa cinco etapas de control.</p>
            <button class="ghost-action candidate-guide-toggle" data-toggle-candidate-guide="${collapsed ? "open" : "close"}" type="button">
              <i data-lucide="${collapsed ? "chevron-down" : "chevron-up"}"></i>${collapsed ? "Desplegar guia" : "Plegar guia"}
            </button>
          </div>
          <div class="candidate-guide-actions">
            <span class="candidate-guide-count">${selected.length} en seguimiento</span>
          </div>
        </div>
        <div class="candidate-guide-timeline">
          ${steps.map(([title, text], index) => {
            const number = index + 1;
            return `
              <article class="candidate-guide-step ${number === currentStep ? "is-current" : ""}">
                <span class="candidate-guide-number">${number}</span>
                <div>
                  <h3>${title}${number === currentStep ? ' <span class="badge safe">En curso</span>' : ""}</h3>
                  <p>${text}</p>
                </div>
              </article>`;
          }).join("")}
        </div>
        <div class="candidate-guide-notes">
          <div>
            <strong>Como se avanza</strong>
            <span>El radar propone oportunidades; una persona abre uno o varios expedientes. Cada expediente pasa a documentacion Word y solo se activa como proyecto tras revision humana.</span>
          </div>
          <div class="is-watch">
            <strong>Seguimiento de cambios</strong>
            <span>Las candidaturas activas quedan vigiladas contra cambios de plazo, bases, criterios y canal de presentacion.</span>
          </div>
        </div>
      </section>`;
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
          ${candidateGuide(selected, selected[0]?.state || "")}
          <div class="panel-heading candidate-list-heading">
            <div>
              <p class="eyebrow">Expedientes abiertos</p>
              <h2>Candidaturas en seguimiento</h2>
            </div>
            <span class="badge review">Revision humana</span>
          </div>
          <div class="candidate-list">${selected.map(card).join("")}</div>
        </article>
        <div id="workspace-detail-anchor" class="workspace-detail-anchor" aria-live="polite"></div>
      </div>`;
    window.lucide?.createIcons();
  }

  function checklistTone(state) {
    if (state === "done") return ["Hecho", "safe"];
    if (state === "review") return ["Revisar", "warning"];
    return ["Pendiente", "review"];
  }

  function activeCandidateModal(id) {
    const selected = selectedOpportunities();
    const entry = selected.find((candidate) => candidate.item.id === id) || selected[0];
    if (!entry?.item) return "";
    const items = window.MOCK?.checklist || [];
    return `
      <div class="modal-backdrop" data-close-candidate-detail>
        <article class="modal candidate-detail-modal" role="dialog" aria-modal="true" aria-label="Candidatura activa">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Candidatura activa</p>
              <h2>${entry.item.title}</h2>
            </div>
            <span class="badge review">Revision humana</span>
            <button class="icon-button" data-close-candidate-detail type="button" aria-label="Cerrar detalle"><i data-lucide="x"></i></button>
          </div>
          <div class="candidate-detail-checklist">
            ${items.map((item) => {
              const [label, tone] = checklistTone(item.state);
              return `
                <div class="candidate-detail-task">
                  <strong>${item.item}</strong>
                  <span class="badge ${tone}">${label}</span>
                  <button class="ghost-action" type="button">${item.action}</button>
                </div>`;
            }).join("")}
          </div>
        </article>
      </div>`;
  }

  function openActiveCandidateModal(id) {
    document.querySelector("[data-close-candidate-detail]")?.remove();
    document.body.insertAdjacentHTML("beforeend", activeCandidateModal(id));
    window.lucide?.createIcons();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-workspace-open]");
    if (!trigger) return;
    if (window.openWorkspaceAnalysis?.(trigger.dataset.workspaceOpen)) return;
    window.openOpportunityModal?.(trigger.dataset.workspaceOpen, "analysis");
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-candidate-detail]");
    if (!trigger) return;
    openActiveCandidateModal(trigger.dataset.candidateDetail);
  });

  document.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-candidate-detail]");
    if (!close) return;
    if (close.classList.contains("modal-backdrop") && event.target !== close) return;
    document.querySelector("[data-close-candidate-detail]")?.remove();
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-toggle-candidate-guide]");
    if (!trigger) return;
    setGuideCollapsed(trigger.dataset.toggleCandidateGuide === "close");
    renderWorkspaceFlow();
  });

  setTimeout(renderWorkspaceFlow, 0);
  window.addEventListener("hashchange", renderWorkspaceFlow);
  window.addEventListener("workspace-candidates-changed", renderWorkspaceFlow);
  window.addEventListener("tenant-watch-changed", renderWorkspaceFlow);
  window.openActiveCandidateModal = openActiveCandidateModal;
})();
