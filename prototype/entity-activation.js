(function () {
  const agents = [
    { name: "Busqueda de convocatorias", role: "Servicio general", contract: "Incluido", state: "Disponible", tone: "safe", detail: "Revisa cada día la Base Nacional de Subvenciones y 15 financiadores privados, aunque el ordenador esté apagado." },
    { name: "Asistente de encaje", role: "Entidad", contract: "Incluido", state: "Disponible", tone: "safe", detail: "Compara oportunidades y explica su posible encaje para Novaterra." },
    { name: "Politicas de datos", role: "Protección", contract: "Incluido", state: "Disponible con límites", tone: "review", detail: "Mantiene separada la información de la entidad; algunos bloqueos automáticos siguen en preparación." },
    { name: "Revision documental", role: "Entidad", contract: "Incluido", state: "Disponible con revisión", tone: "review", detail: "Lee las bases públicas. La documentación privada todavía no se analiza automáticamente." },
    { name: "Borrador de memoria", role: "Entidad", contract: "Incluido", state: "Pendiente de activación", tone: "review", detail: "Está preparado, pero aún no genera textos porque la conexión con IA no está activada." },
    { name: "Avisos y recordatorios", role: "Entidad", contract: "Incluido", state: "En preparación", tone: "warning", detail: "Los avisos por correo, Teams o WhatsApp todavía no están conectados." }
  ];
  const badge = (text, tone) => `<span class="badge ${tone}">${text}</span>`;
  const agentStatusDot = (agent) => `
    <span class="agent-status-dot ${agent.tone}" title="${agent.state}: ${agent.detail}">
      <span class="sr-only">${agent.state}</span>
    </span>`;
  const agentStatusLegend = () => `
    <div class="agent-status-legend" aria-label="Leyenda de estado de asistentes">
      <span><i class="legend-dot safe"></i>Disponible</span>
      <span><i class="legend-dot review"></i>Disponible con revisión</span>
      <span><i class="legend-dot warning"></i>En preparación</span>
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
          <div><span>Rol actual</span><strong>Gestor de subvenciones</strong><small>Puede usar oportunidades, candidaturas e información aprobada.</small></div>
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
