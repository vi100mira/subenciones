(function () {
  const agents = [
    { name: "Busqueda de convocatorias", role: "Plataforma", contract: "Contratado", state: "Solo plataforma", tone: "review", detail: "Lectura de fuentes publicas y novedades diarias. En demo usa una copia de trabajo; falta ejecucion real programada." },
    { name: "Asistente de encaje", role: "Entidad", contract: "Contratado", state: "Operativo prototipo", tone: "safe", detail: "Conversacion local con oportunidades filtradas para Novaterra." },
    { name: "Politicas de datos", role: "Transversal", contract: "Incluido", state: "Normas", tone: "review", detail: "Politicas visibles en footer; falta bloqueo automatico en servidor." },
    { name: "Revision documental", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Debe leer bases/PDF y preparar listas de comprobacion con evidencias." },
    { name: "Borrador de memoria", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Hoy exporta borrador demo; falta redaccion con informacion validada real." },
    { name: "Avisos y recordatorios", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Pendiente de conectar email, Teams o WhatsApp." }
  ];
  const badge = (text, tone) => `<span class="badge ${tone}">${text}</span>`;
  const agentStatusDot = (agent) => `
    <span class="agent-status-dot ${agent.tone}" title="${agent.state}: ${agent.detail}">
      <span class="sr-only">${agent.state}</span>
    </span>`;
  const agentStatusLegend = () => `
    <div class="agent-status-legend" aria-label="Leyenda de estado de asistentes">
      <span><i class="legend-dot review"></i>Solo plataforma o norma</span>
      <span><i class="legend-dot safe"></i>Operativo en prototipo</span>
      <span><i class="legend-dot warning"></i>En desarrollo</span>
    </div>`;
  function renderActivation() {
    const screen = document.querySelector("#entity");
    if (!screen || screen.dataset.activationApplied) return;
    screen.dataset.activationApplied = "true";
    screen.innerHTML = `
      <article class="panel entity-hero">
        <div class="panel-heading">
          <div><p class="eyebrow">Entidad activa</p><h2>Novaterra</h2></div>
          ${badge("Suite completa contratada", "safe")}
        </div>
        <div class="entity-contract-grid">
          <div><span>Alta institucional</span><strong>Verificada</strong><small>Email admin validado y condiciones aceptadas.</small></div>
          <div><span>Rol actual</span><strong>Docente/gestor</strong><small>Puede usar radar, candidaturas y contexto aprobado.</small></div>
          <div><span>Web publica</span><strong>Autorizada</strong><small>Solo lectura de informacion abierta de la entidad.</small></div>
          <div><span>Repositorio privado</span><strong>Pendiente</strong><small>Drive no conectado hasta consentimiento expreso.</small></div>
        </div>
        <div class="plain-note activation-note" id="onboarding-request-status">
          <strong>Alta segura completada</strong>
          <span>No crea usuarios, no conecta Drive y no aprueba datos automaticamente. El acceso de Novaterra queda activo solo tras validacion y aceptacion de condiciones.</span>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading"><div><p class="eyebrow">Servicios contratados</p><h2>Asistentes incluidos y estado real</h2></div></div>
        ${agentStatusLegend()}
        <div class="entity-agent-grid">
          ${agents.map((agent) => `
            <article class="entity-agent-card ${agent.tone === "warning" ? "is-disabled" : ""}">
              <div class="opportunity-topline agent-card-topline"><strong>${agent.name}</strong>${agentStatusDot(agent)}</div>
              <p>${agent.detail}</p>
              <span>${agent.contract} | ${agent.role}</span>
            </article>`).join("")}
        </div>
      </article>

      `;
    window.lucide?.createIcons();
  }

  renderActivation();
  document.addEventListener("DOMContentLoaded", renderActivation);
})();
