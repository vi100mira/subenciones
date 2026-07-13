(function () {
  const readiness = {
    "Busqueda global": {
      status: "Disponible",
      tone: "safe",
      disabled: false,
      platformOnly: true,
      note: "Revisa automáticamente las fuentes públicas y los financiadores privados, aunque el ordenador esté apagado."
    },
    "Revision de fuentes": {
      status: "Disponible",
      tone: "safe",
      disabled: false,
      platformOnly: true,
      note: "Lee las bases, conserva su versión y comprueba la procedencia antes de mostrar una oportunidad."
    },
    "Coordinacion de entidades": {
      status: "Disponible con límites",
      tone: "review",
      disabled: false,
      platformOnly: true,
      note: "Controla accesos y permisos por entidad. El análisis automático de documentos privados aún no está disponible."
    },
    "Politicas de acceso": {
      status: "Controles parciales",
      tone: "review",
      disabled: false,
      platformOnly: true,
      note: "Mantiene separada la información de cada entidad y registra las acciones relevantes."
    },
    "Busqueda de convocatorias": {
      status: "Disponible",
      tone: "safe",
      disabled: false,
      platformOnly: true,
      note: "Revisa cada día la Base Nacional de Subvenciones y 15 financiadores privados, aunque el ordenador esté apagado."
    },
    "Investigador de entidad": {
      status: "Pendiente de activación",
      tone: "warning",
      disabled: true,
      platformOnly: true,
      note: "El agente está desplegado. La entidad debe autorizar y aprobar su fuente web antes de ejecutarlo."
    },
    "Asistente de encaje": {
      status: "Disponible en esta versión",
      tone: "safe",
      disabled: false,
      note: "Ayuda a comparar oportunidades y explicar encaje, riesgos e información pendiente."
    },
    "Politicas de datos": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Hay normas visibles de protección, pero algunos bloqueos automáticos siguen en preparación."
    },
    "Revision documental": {
      status: "Parcial con revision",
      tone: "review",
      disabled: false,
      note: "Lee bases públicas y sus límites. La lista automática de requisitos y la documentación privada requieren revisión."
    },
    "Borrador de memoria": {
      status: "Preparado, pendiente de activación",
      tone: "review",
      disabled: false,
      note: "El servicio está preparado, pero todavía no genera textos porque la conexión con IA no está activada."
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
        <span><i class="legend-dot warning"></i>Bloqueado o requiere acción</span>
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
    panel.querySelector("h2").textContent = "Actividad de ejemplo";
    runs.insertAdjacentHTML("beforebegin", `<p class="agent-panel-note">Ejemplos de cómo se mostrará la actividad. No son acciones realizadas hoy.</p>`);
    runs.querySelectorAll(".stack-item").forEach((item) => item.classList.add("is-demo-run"));
  }

  function addReadinessNote() {
    const screen = document.querySelector("#agents");
    if (!screen || document.querySelector("#agents-readiness-note")) return;
    screen.insertAdjacentHTML("afterbegin", `
      <div class="plain-note agent-readiness-note" id="agents-readiness-note">
        <strong>Qué está disponible hoy</strong>
        <span>La búsqueda funciona automáticamente y el redactor está preparado. La investigación web de la entidad, el análisis de documentos privados y los avisos externos siguen en preparación.</span>
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
