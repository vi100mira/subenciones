(function () {
  const readiness = {
    "Busqueda global": {
      status: "Operativo alojado",
      tone: "safe",
      disabled: false,
      platformOnly: true,
      note: "Consume las campañas BDNS y privadas desde GitHub Actions; no usa IA generativa para descubrir convocatorias."
    },
    "Normalizacion": {
      status: "Operativo determinista",
      tone: "safe",
      disabled: false,
      platformOnly: true,
      note: "Versiona, extrae PDF, aplica OCR y puertas de evidencia mediante código y hashes, sin modelo externo."
    },
    "Orquestador de tenants": {
      status: "Infraestructura parcial",
      tone: "review",
      disabled: false,
      platformOnly: true,
      note: "Autenticación, permisos y RLS existen; todavía no planifica cadenas de agentes ni consume la ingesta privada."
    },
    "Politicas de acceso": {
      status: "Controles parciales",
      tone: "review",
      disabled: false,
      platformOnly: true,
      note: "Las APIs y RLS aíslan tenants; no existe un agente autónomo de gobierno ni un índice privado operativo."
    },
    "Busqueda de convocatorias": {
      status: "Operativo alojado",
      tone: "safe",
      disabled: false,
      platformOnly: true,
      note: "Radar determinista alojado: Vercel encola y GitHub Actions consume BDNS y 15 financiadores. No usa un modelo generativo."
    },
    "Investigador de entidad": {
      status: "Diseñado, sin worker",
      tone: "warning",
      disabled: true,
      platformOnly: true,
      note: "La interfaz y el contrato de consentimiento existen, pero no hay rastreador alojado que investigue la web de la entidad."
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
      status: "Parcial con revision",
      tone: "review",
      disabled: false,
      note: "Extrae bases publicas y restricciones con reglas; el checklist semantico de agente y la lectura privada siguen pendientes."
    },
    "Borrador de memoria": {
      status: "Cola alojada; IA pendiente",
      tone: "review",
      disabled: false,
      note: "API y worker alojado preparan evidencia publica. Sin clave OpenAI quedan en espera y no simulan una redaccion."
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
        <span>La busqueda y el redactor ya tienen consumidores alojados. El investigador de entidad, el RAG privado y los canales externos aun no tienen consumidor productivo.</span>
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
