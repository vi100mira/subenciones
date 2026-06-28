(function () {
  const readiness = {
    "Explorer Agent": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "El radar usa datos de prototipo. Falta invocacion real de ingestion y refresco auditado."
    },
    "Match Agent": {
      status: "Operativo en prototipo",
      tone: "safe",
      disabled: false,
      note: "Disponible como radar conversacional local sobre oportunidades filtradas. Sin LLM externo."
    },
    "Governance Agent": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Hay reglas visuales de clasificacion, pero no bloqueo automatico backend."
    },
    "Documentary Agent": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Checklist y evidencias son demo. Falta extraccion real de bases/PDF y trazas."
    },
    "Draft Agent": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Puede exportar borrador Word demo, pero no redacta desde RAG ni aprobaciones reales."
    },
    "Monitor Agent": {
      status: "En desarrollo",
      tone: "warning",
      disabled: true,
      note: "Canales y recordatorios no estan conectados."
    }
  };

  function badge(text, tone) {
    return `<span class="badge ${tone}">${text}</span>`;
  }

  function enhanceAgentCards() {
    document.querySelectorAll("#agent-grid .agent-card").forEach((card) => {
      const name = card.querySelector("strong")?.textContent.trim();
      const meta = readiness[name];
      if (!meta || card.dataset.readinessApplied) return;
      card.dataset.readinessApplied = "true";
      card.classList.toggle("is-disabled", meta.disabled);
      card.classList.toggle("is-active-prototype", !meta.disabled);
      card.setAttribute("aria-disabled", String(meta.disabled));
      const oldBadge = card.querySelector(".badge");
      if (oldBadge) oldBadge.outerHTML = badge(meta.status, meta.tone);
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
    runs.insertAdjacentHTML("beforebegin", `<p class="agent-panel-note">Eventos simulados para mostrar auditoria futura. No son ejecuciones reales de agentes backend.</p>`);
    runs.querySelectorAll(".stack-item").forEach((item) => item.classList.add("is-demo-run"));
  }

  function addReadinessNote() {
    const screen = document.querySelector("#agents");
    if (!screen || document.querySelector("#agents-readiness-note")) return;
    screen.insertAdjacentHTML("afterbegin", `
      <div class="plain-note agent-readiness-note" id="agents-readiness-note">
        <strong>Estado real del prototipo</strong>
        <span>Solo el Match Agent esta operativo como asistente local de radar. El resto queda visible como direccion de producto, pero deshabilitado hasta tener backend, permisos, auditoria y pruebas.</span>
      </div>`);
  }

  function applyAgentReadiness() {
    addReadinessNote();
    enhanceAgentCards();
    enhanceChannels();
    enhanceRuns();
  }

  applyAgentReadiness();
  document.addEventListener("DOMContentLoaded", applyAgentReadiness);
})();
