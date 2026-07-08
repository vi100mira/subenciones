(function () {
  const flows = {
    opportunities: {
      eyebrow: "Decidir con evidencia",
      title: "Como leer una oportunidad",
      steps: [
        ["list-filter", "Vivas", "Convocatorias abiertas o revisables para la entidad."],
        ["file-search", "Bases", "Abrir PDF, API o URL de verificacion."],
        ["scale", "Encaje", "Comparar prioridad, riesgos y hechos internos aprobados."],
        ["folder-plus", "Preseleccionar", "Crear expediente sin enviar nada fuera."]
      ]
    },
    workspace: {
      eyebrow: "Expediente de candidatura",
      title: "Avance sin perder control",
      modalOnly: true,
      steps: [
        ["inbox", "Preseleccion", "Varias candidaturas pueden estar en seguimiento."],
        ["file-pen-line", "Documentos", "Memoria, anexos y checklist se preparan en Word."],
        ["eye", "Revisar", "Una persona valida requisitos, importes y evidencias."],
        ["send-horizontal", "Presentar", "La plataforma no presenta ni envia automaticamente."]
      ]
    },
    operations: {
      eyebrow: "Salud operativa",
      title: "Del conector al coste",
      steps: [
        ["activity", "Lecturas", "Fuentes, colas y errores visibles."],
        ["server-cog", "Workers", "Procesos separados de la experiencia tenant."],
        ["gauge", "Latencia", "Rendimiento y cargas observables."],
        ["coins", "Coste", "Uso IA medido antes de escalar."]
      ]
    }
  };

  function installStyles() {
    if (document.querySelector("#visual-flows-styles")) return;
    document.head.insertAdjacentHTML("beforeend", `<style id="visual-flows-styles">
      .visual-flow-panel { margin:0 0 14px; padding:12px 14px; border:1px solid var(--line); border-radius:8px; background:#fbfdfc; }
      .visual-flow-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
      .visual-flow-head h2 { margin:2px 0 0; font-size:18px; line-height:1.2; }
      .visual-flow-steps { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
      .visual-flow-step { position:relative; display:grid; grid-template-columns:32px 1fr 24px; gap:8px; align-items:center; min-height:64px; padding:10px; border:1px solid #d4e2dd; border-radius:8px; background:#fff; }
      .visual-flow-step svg { width:22px; height:22px; color:var(--teal-dark); }
      .visual-flow-step strong { display:block; font-size:13px; }
      .visual-flow-step span { display:block; margin-top:3px; color:var(--muted); font-size:12px; line-height:1.3; }
      .visual-flow-step .info-dot { width:24px; height:24px; justify-self:end; }
      .visual-flow-launch { display:flex; justify-content:flex-end; margin:0 0 10px; }
      .visual-flow-modal .visual-flow-head { display:none; }
      .visual-flow-modal .visual-flow-panel { margin:0; border:0; padding:0; background:transparent; }
      .visual-flow-modal .visual-flow-steps { margin-top:12px; }
      @media (max-width:1180px) { .visual-flow-steps { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:560px) { .visual-flow-head { flex-direction:column; } .visual-flow-steps { grid-template-columns:1fr; } }
    </style>`);
  }

  function flowHtml(screenId, flow) {
    return `
      <article class="visual-flow-panel" data-visual-flow="${screenId}">
        <div class="visual-flow-head">
          <div><p class="eyebrow">${flow.eyebrow}</p><h2>${flow.title}</h2></div>
          <span class="badge review">Guia visual</span>
        </div>
        <div class="visual-flow-steps">
          ${flow.steps.map(([icon, title, tip]) => `
            <div class="visual-flow-step" title="${tip}">
              <i data-lucide="${icon}"></i>
              <div><strong>${title}</strong><span>${tip}</span></div>
              <button class="info-dot" title="${tip}" type="button">i</button>
            </div>`).join("")}
        </div>
      </article>`;
  }

  function mountFlow(screenId) {
    const flow = flows[screenId];
    const screen = document.querySelector(`#${screenId}`);
    if (!flow || !screen || screen.querySelector(`[data-visual-flow="${screenId}"]`)) return;
    if (flow.modalOnly) {
      if (!screen.querySelector(`[data-open-visual-flow="${screenId}"]`)) {
        screen.insertAdjacentHTML("afterbegin", `<div class="visual-flow-launch" data-visual-flow="${screenId}"><button class="ghost-action" data-open-visual-flow="${screenId}" type="button"><i data-lucide="info"></i> Guia visual</button></div>`);
      }
      return;
    }
    screen.insertAdjacentHTML("afterbegin", flowHtml(screenId, flow));
  }

  function openFlowModal(screenId) {
    const flow = flows[screenId];
    if (!flow) return;
    document.querySelector("[data-visual-flow-modal]")?.remove();
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" data-close-visual-flow data-visual-flow-modal>
        <article class="modal visual-flow-modal" role="dialog" aria-modal="true">
          <div class="panel-heading">
            <div><p class="eyebrow">${flow.eyebrow}</p><h2>${flow.title}</h2></div>
            <button class="icon-button" data-close-visual-flow type="button"><i data-lucide="x"></i></button>
          </div>
          ${flowHtml(`${screenId}-modal`, flow)}
        </article>
      </div>`);
    window.lucide?.createIcons();
  }

  function closeFlowModal() {
    document.querySelector("[data-close-visual-flow]")?.remove();
  }

  function renderFlows() {
    installStyles();
    Object.keys(flows).forEach(mountFlow);
    window.lucide?.createIcons();
  }

  function wrapShowScreen() {
    if (window.__visualFlowsWrapped || typeof window.showScreen !== "function") return;
    const original = window.showScreen;
    window.showScreen = function (...args) {
      const result = original.apply(this, args);
      setTimeout(renderFlows, 0);
      return result;
    };
    window.__visualFlowsWrapped = true;
  }

  setTimeout(() => { wrapShowScreen(); renderFlows(); }, 0);
  window.addEventListener("hashchange", () => setTimeout(renderFlows, 0));
  window.addEventListener("workspace-candidates-changed", () => setTimeout(renderFlows, 0));
  window.addEventListener("tenant-watch-changed", () => setTimeout(renderFlows, 0));
  document.addEventListener("click", (event) => {
    const open = event.target.closest?.("[data-open-visual-flow]");
    const close = event.target.closest?.("[data-close-visual-flow]");
    if (open) openFlowModal(open.dataset.openVisualFlow);
    if (close) {
      if (close.classList.contains("modal-backdrop") && event.target !== close) return;
      closeFlowModal();
    }
  });
})();
