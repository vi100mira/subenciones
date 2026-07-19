(function () {
  const candidateKey = "workspace-candidates-v1";
  const watchKey = "tenant-watch-demo-v1";
  const documentBlobKey = "tenant-document-blob-demo-v1";

  function opportunities() {
    if (typeof window.currentOpportunities === "function") return window.currentOpportunities();
    return window.RADAR?.opportunities || [];
  }

  function defaultSelection() {
    return { activeId: "", selectedIds: [] };
  }

  function candidateSelection() {
    if (document.body.dataset.role === "entity" && !window.TENANT_RECOMMENDATIONS_APPLIED) return defaultSelection();
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
    const selectedIds = [...new Set(selection.selectedIds || [])];
    const active = rows.find((item) => item.id === selection.activeId && selectedIds.includes(item.id));
    const selected = selectedIds
      .map((id) => rows.find((item) => item.id === id))
      .filter(Boolean);
    const watched = watchedIds();
    return selected.map((item) => {
      const persistedStage = item.matchRecommendation?.candidacy_stage || "none";
      const localDocs = documentState(item.id);
      const stage = persistedStage !== "none" ? persistedStage : localDocs?.projectState === "active" ? "active" : localDocs ? "documents_ready" : "none";
      const state = stage === "active" ? "Proyecto activo" : stage === "documents_ready" ? "Documentacion preparada" : stage === "documents_pending" ? "Documentacion pendiente" : "Preseleccionada";
      const note = stage === "active"
        ? "Proyecto activado tras revision humana."
        : stage === "documents_ready"
          ? "Paquete Word preparado; falta revision humana antes de uso externo."
          : stage === "documents_pending"
            ? "Debe preparar documentacion Word antes de activar como proyecto."
            : "Seleccionada por el validador humano; todavia no se ha abierto expediente.";
      return {
        item,
        active: item.id === active?.id,
        state,
        tone: stage === "active" ? "safe" : stage === "none" ? "review" : "warning",
        note,
        watched: watched.has(item.id) || ["active", "documents_ready"].includes(stage)
      };
    });
  }

  function card(entry) {
    const action = entry.active
      ? `<button class="ghost-action" data-candidate-detail="${entry.item.id}" type="button">Ver tareas</button>`
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

  function candidateGuide(selected, activeState) {
    const currentStep = candidateProgressStep(activeState);
    const steps = [
      ["Radar", "Detecta y propone oportunidades de forma automatica, antes de que exista ningun expediente."],
      ["Preseleccion", "Una persona revisa las propuestas y abre uno o varios expedientes para avanzar."],
      ["Documentacion Word", "Cada expediente se redacta y estructura como documento de trabajo."],
      ["Proyecto activo", "Solo se activa como proyecto tras una revision humana del expediente."],
      ["Presentacion revisada", "Control final del expediente antes de enviarlo a presentacion."]
    ];
    return `
      <div class="modal-backdrop" data-close-candidate-guide>
        <article class="modal candidate-guide-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-guide-title">
          <section class="candidate-guide" aria-label="Como avanza una candidatura">
            <div class="candidate-guide-heading">
              <div class="candidate-guide-copy">
                <p class="eyebrow">Guía de candidatura</p>
                <h2 id="candidate-guide-title">Como avanza una candidatura, paso a paso</h2>
                <p>Desde que el radar detecta una oportunidad hasta que se presenta, cada expediente atraviesa cinco etapas de control.</p>
              </div>
              <div class="candidate-guide-actions">
                <span class="candidate-guide-count">${selected.length} en seguimiento</span>
                <button class="icon-button" data-close-candidate-guide type="button" aria-label="Cerrar guía"><i data-lucide="x"></i></button>
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
              <div><strong>Como se avanza</strong><span>El radar propone oportunidades; una persona abre expedientes, prepara la documentación y activa el proyecto solo tras revisión humana.</span></div>
              <div class="is-watch"><strong>Seguimiento de cambios</strong><span>Las candidaturas activas quedan vigiladas contra cambios de plazo, bases, criterios y canal de presentación.</span></div>
            </div>
          </section>
        </article>
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
        <article class="panel candidate-list-panel">
          <div class="panel-heading candidate-list-heading">
            <div>
              <p class="eyebrow">Expedientes abiertos</p>
              <h2>Candidaturas en seguimiento</h2>
              <p class="candidate-list-intro">Consulta las tareas pendientes o abre un expediente para trabajar en su documentacion.</p>
            </div>
            <div class="candidate-guide-actions">
              <span class="badge review">Revision humana</span>
              <button class="icon-button" data-open-candidate-guide type="button" title="Guía de candidatura" aria-label="Abrir guía de candidatura"><i data-lucide="circle-help"></i></button>
            </div>
          </div>
          <div class="candidate-list">${selected.length ? selected.map(card).join("") : `
            <div class="plain-note candidate-empty-state">
              <strong>${window.TENANT_MATCH_LOAD_STATE === "error" ? "No se ha podido recuperar el encaje" : window.TENANT_MATCH_LOAD_STATE === "loading" ? "Cargando decisiones del encaje" : "Todavia no hay candidaturas"}</strong>
              <span>${window.TENANT_MATCH_LOAD_STATE === "error" ? `${window.TENANT_MATCH_LOAD_ERROR || "La conexion con el estado de la entidad ha fallado."} No se muestran expedientes locales para evitar informacion contradictoria.` : window.TENANT_MATCH_LOAD_STATE === "loading" ? "Estamos recuperando las decisiones guardadas para esta entidad." : "Las candidaturas apareceran aqui solo cuando el validador humano preseleccione una oportunidad."}</span>
            </div>`}</div>
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

  function candidateTaskTab(action) {
    if (action === "Ver evidencia") return "analysis";
    if (action === "Preparar Word") return "draft";
    if (action === "Añadir documentos") return "documents";
    return "checklist";
  }

  function candidateTaskInformation(item, label, tone) {
    return `
      <div class="modal-backdrop" data-close-candidate-task-info>
        <article class="modal candidate-task-info-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-task-info-title">
          <div class="panel-heading">
            <div><p class="eyebrow">Tarea de preparación</p><h2 id="candidate-task-info-title">${item.item}</h2></div>
            <span class="badge ${tone}">${label}</span>
            <button class="icon-button" data-close-candidate-task-info type="button" aria-label="Cerrar información"><i data-lucide="x"></i></button>
          </div>
          <p class="candidate-task-purpose">${item.purpose}</p>
          <div class="candidate-task-info-grid">
            <section><i data-lucide="list-checks"></i><div><strong>Qué se comprueba</strong><span>${item.checks}</span></div></section>
            <section><i data-lucide="file-search"></i><div><strong>Evidencia necesaria</strong><span>${item.evidence}</span></div></section>
            <section><i data-lucide="user-check"></i><div><strong>Cuándo se considera completada</strong><span>${item.doneWhen}</span></div></section>
          </div>
          <div class="plain-note"><strong>Control humano</strong><span>El estado orienta el trabajo. Insertia no confirma por sí sola la elegibilidad ni da por válido un documento.</span></div>
          <div class="button-row"><button class="ghost-action" data-close-candidate-task-info type="button">Cerrar</button></div>
        </article>
      </div>`;
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
          <div class="plain-note candidate-task-summary"><strong>Plan para dejar la candidatura preparada</strong><span>Estas tareas reúnen comprobaciones, borradores y anexos. Completar la lista no presenta la solicitud: todavía requiere revisión, firma y envío humano.</span></div>
          <div class="candidate-detail-checklist">
            ${items.map((item, index) => {
              const [label, tone] = checklistTone(item.state);
              return `
                <div class="candidate-detail-task">
                  <strong>${item.item}</strong>
                  <button class="icon-button candidate-task-info-button" data-candidate-task-info="${index}" type="button" title="Información sobre la tarea" aria-label="Información sobre ${item.item}"><i data-lucide="info"></i></button>
                  <span class="badge ${tone}">${label}</span>
                  <button class="ghost-action" data-candidate-task="${candidateTaskTab(item.action)}" data-candidate-id="${entry.item.id}" type="button">${item.action}</button>
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
    const trigger = event.target.closest("[data-candidate-task-info]");
    if (!trigger) return;
    const item = (window.MOCK?.checklist || [])[Number(trigger.dataset.candidateTaskInfo)];
    if (!item) return;
    const [label, tone] = checklistTone(item.state);
    document.querySelector("[data-close-candidate-task-info]")?.remove();
    document.body.insertAdjacentHTML("beforeend", candidateTaskInformation(item, label, tone));
    window.lucide?.createIcons();
  });

  document.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-candidate-task-info]");
    if (!close) return;
    if (close.classList.contains("modal-backdrop") && event.target !== close) return;
    document.querySelector("[data-close-candidate-task-info]")?.remove();
  });

  document.addEventListener("click", (event) => {
    const task = event.target.closest("[data-candidate-task]");
    if (!task) return;
    document.querySelector("[data-close-candidate-detail]")?.remove();
    if (!window.openWorkspaceAnalysis?.(task.dataset.candidateId, task.dataset.candidateTask)) {
      window.showToast?.("No se ha podido abrir el area de trabajo de esta candidatura.");
    }
  });

  document.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-candidate-detail]");
    if (!close) return;
    if (close.classList.contains("modal-backdrop") && event.target !== close) return;
    document.querySelector("[data-close-candidate-detail]")?.remove();
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-candidate-guide]");
    if (!trigger) return;
    document.querySelector("[data-close-candidate-guide]")?.remove();
    const selected = selectedOpportunities();
    document.body.insertAdjacentHTML("beforeend", candidateGuide(selected, selected[0]?.state || ""));
    window.lucide?.createIcons();
  });

  document.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-candidate-guide]");
    if (!close) return;
    if (close.classList.contains("modal-backdrop") && event.target !== close) return;
    document.querySelector("[data-close-candidate-guide]")?.remove();
  });

  setTimeout(renderWorkspaceFlow, 0);
  window.addEventListener("hashchange", renderWorkspaceFlow);
  window.addEventListener("workspace-candidates-changed", renderWorkspaceFlow);
  window.addEventListener("tenant-watch-changed", renderWorkspaceFlow);
  window.addEventListener("role-session-applied", renderWorkspaceFlow);
  window.addEventListener("tenant-match-load-state", renderWorkspaceFlow);
  window.addEventListener("tenant-recommendations-applied", renderWorkspaceFlow);
  window.openActiveCandidateModal = openActiveCandidateModal;
})();
