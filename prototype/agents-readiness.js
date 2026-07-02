(function () {
  const readiness = {
    "Busqueda de convocatorias": {
      status: "Operativo plataforma",
      tone: "safe",
      disabled: false,
      platformOnly: true,
      note: "Servicio de plataforma para traer novedades publicas y refrescos programados. En esta demo los datos son una copia de trabajo, no una ejecucion diaria real."
    },
    "Investigador de entidad": {
      status: "Operativo plataforma",
      tone: "safe",
      disabled: false,
      platformOnly: true,
      note: "Servicio de superadmin para crear tenant minimo desde web publica consentida. Propone logo y hechos; no aprueba contexto por si solo."
    },
    "Asistente de encaje": {
      status: "Operativo en prototipo",
      tone: "safe",
      disabled: false,
      note: "Disponible como radar conversacional local sobre oportunidades filtradas. Sin IA externa."
    },
    "Politicas de datos": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Hay reglas visibles, pero no bloqueo automatico en servidor."
    },
    "Revision documental": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Checklist y evidencias son demo. Falta extraccion real de bases/PDF y trazas."
    },
    "Borrador de memoria": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Puede exportar borrador Word demo, pero no redacta aun desde informacion validada real."
    },
    "Avisos y recordatorios": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Canales y recordatorios no estan conectados."
    }
  };

  function badge(text, tone) {
    return `<span class="badge ${tone}">${text}</span>`;
  }

  function statusDot(meta) {
    return `
      <span class="agent-status-dot ${meta.tone}" title="${meta.status}: ${meta.note}">
        <span class="sr-only">${meta.status}</span>
      </span>`;
  }

  function addStatusLegend() {
    const grid = document.querySelector("#agent-grid");
    if (!grid || document.querySelector("#agents-status-legend")) return;
    grid.insertAdjacentHTML("beforebegin", `
      <div class="agent-status-legend" id="agents-status-legend" aria-label="Leyenda de estado de asistentes">
        <span><i class="legend-dot safe"></i>Operativo</span>
        <span><i class="legend-dot review"></i>Requiere revision</span>
        <span><i class="legend-dot warning"></i>En desarrollo</span>
      </div>`);
  }

  function enhanceAgentCards() {
    document.querySelectorAll("#agent-grid .agent-card").forEach((card) => {
      const name = card.querySelector("strong")?.textContent.trim();
      const meta = readiness[name];
      if (!meta || card.dataset.readinessApplied) return;
      card.dataset.readinessApplied = "true";
      card.classList.toggle("is-disabled", meta.disabled);
      card.classList.toggle("is-platform-only", Boolean(meta.platformOnly));
      card.classList.toggle("is-active-prototype", !meta.disabled);
      card.setAttribute("aria-disabled", String(meta.disabled));
      card.querySelector(".opportunity-topline")?.classList.add("agent-card-topline");
      const oldBadge = card.querySelector(".badge");
      if (oldBadge) oldBadge.outerHTML = statusDot(meta);
      card.insertAdjacentHTML("beforeend", `<p class="agent-readiness">${meta.note}</p>`);
    });
  }

  function enhanceChannels() {
    document.querySelectorAll("#agents .channel-list > div").forEach((channel) => {
      if (channel.dataset.readinessApplied) return;
      channel.dataset.readinessApplied = "true";
      channel.classList.add("is-disabled");
      channel.setAttribute("aria-disabled", "true");
      channel.insertAdjacentHTML("beforeend", badge("En desarrollo", "warning"));
    });
  }

  function enhanceRuns() {
    const runs = document.querySelector("#agent-runs");
    const panel = runs?.closest(".panel");
    if (!runs || !panel || panel.dataset.readinessApplied) return;
    panel.dataset.readinessApplied = "true";
    panel.querySelector("h2").textContent = "Trazas demo";
    runs.insertAdjacentHTML("beforebegin", `<p class="agent-panel-note">Eventos simulados para mostrar auditoria futura. No son ejecuciones reales de servicios en servidor.</p>`);
    runs.querySelectorAll(".stack-item").forEach((item) => item.classList.add("is-demo-run"));
  }

  function addReadinessNote() {
    const screen = document.querySelector("#agents");
    if (!screen || document.querySelector("#agents-readiness-note")) return;
    screen.insertAdjacentHTML("afterbegin", `
      <div class="plain-note agent-readiness-note" id="agents-readiness-note">
        <strong>Estado real del prototipo</strong>
        <span>Busqueda de convocatorias e Investigador de entidad son servicios troncales de superadmin. Funcionan como capacidades programadas o bajo demanda; sus salidas requieren evidencia y revision humana antes de afectar al tenant.</span>
      </div>`);
  }

  function applyAgentReadiness() {
    addReadinessNote();
    addStatusLegend();
    enhanceAgentCards();
    enhanceChannels();
    enhanceRuns();
  }

  applyAgentReadiness();
  document.addEventListener("DOMContentLoaded", applyAgentReadiness);
})();
