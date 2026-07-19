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
      note: "Revisa BDNS y fuentes territoriales; vigila 15 financiadores privados curados. Una privada solo se incorpora con bases oficiales y vigencia verificable."
    },
    "Investigador de entidad": {
      status: "Comprobando estado",
      tone: "review",
      disabled: true,
      note: "Consulta el permiso web, la fuente aprobada y la última investigación de esta entidad."
    },
    "Asistente de encaje": {
      status: "Disponible en esta versión",
      tone: "safe",
      disabled: false,
      note: "Ayuda a comparar oportunidades y explicar encaje, riesgos e información pendiente."
    },
    "Control de datos": {
      status: "Control activo",
      tone: "safe",
      disabled: false,
      governanceControl: true,
      note: "No calcula encaje. Bloquea capacidades sin permiso, limita las clases autorizadas y registra los cambios; no detecta por sí solo cualquier dato sensible."
    },
    "Revision documental": {
      status: "Parcial con revision",
      tone: "review",
      disabled: false,
      note: "Lee bases públicas y sus límites. La lista automática de requisitos y la documentación privada requieren revisión."
    },
    "Preparación documental": {
      status: "Preparado, pendiente de activación",
      tone: "review",
      disabled: false,
      note: "Incluye un curador que propone conocimiento reutilizable y un redactor que prepara borradores. Solo usa hechos aprobados; nunca aprueba, firma ni presenta."
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
      card.classList.toggle("is-governance-control", Boolean(meta.governanceControl));
      if (meta.governanceControl) card.dataset.componentType = "control-transversal";
      card.setAttribute("aria-disabled", String(meta.disabled));
      card.querySelector(".opportunity-topline")?.classList.add("agent-card-topline");
      const oldBadge = card.querySelector(".badge");
      if (oldBadge) oldBadge.outerHTML = statusDot(meta);
      if (meta.governanceControl) {
        card.querySelector(".agent-icon")?.insertAdjacentHTML("afterend", '<span class="component-kicker">Control transversal · no es un agente</span>');
      }
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
        <strong>Ciclo de estudio y encaje</strong>
        <span>Las oportunidades visibles pertenecen al radar general. No demuestran que el encaje de la entidad esté calculado: primero se investiga la web autorizada, después se revisa el perfil y finalmente se calcula el encaje.</span>
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
