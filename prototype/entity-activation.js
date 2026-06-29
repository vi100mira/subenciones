(function () {
  const agents = [
    { name: "Explorer Agent", role: "Plataforma", contract: "Contratado", state: "Solo superadmin", tone: "review", detail: "Ingesta publica y novedades diarias. En demo usa snapshot; falta job real programado." },
    { name: "Match Agent", role: "Entidad", contract: "Contratado", state: "Operativo prototipo", tone: "safe", detail: "Radar conversacional local con oportunidades filtradas para Novaterra." },
    { name: "Governance Agent", role: "Transversal", contract: "Incluido", state: "Normas", tone: "review", detail: "Politicas visibles en footer; falta motor backend de bloqueo automatico." },
    { name: "Documentary Agent", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Debe leer bases/PDF y preparar checklist con evidencias." },
    { name: "Draft Agent", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Hoy exporta borrador demo; falta redaccion RAG con hechos aprobados." },
    { name: "Monitor Agent", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Pendiente de conectar email, Teams o WhatsApp." }
  ];

  const badge = (text, tone) => `<span class="badge ${tone}">${text}</span>`;

  function renderActivation() {
    const screen = document.querySelector("#entity");
    if (!screen || screen.dataset.activationApplied) return;
    screen.dataset.activationApplied = "true";
    screen.innerHTML = `
      <article class="panel entity-hero">
        <div class="panel-heading">
          <div><p class="eyebrow">Tenant activo</p><h2>Novaterra</h2></div>
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
        <div class="panel-heading"><div><p class="eyebrow">Contratacion agentica</p><h2>Agentes incluidos y estado real</h2></div></div>
        <div class="entity-agent-grid">
          ${agents.map((agent) => `
            <article class="entity-agent-card ${agent.tone === "warning" ? "is-disabled" : ""}">
              <div class="opportunity-topline"><strong>${agent.name}</strong>${badge(agent.state, agent.tone)}</div>
              <p>${agent.detail}</p>
              <span>${agent.contract} | ${agent.role}</span>
            </article>`).join("")}
        </div>
      </article>

      <div class="two-column">
        <article class="panel">
          <div class="panel-heading"><div><p class="eyebrow">Contexto para IA</p><h2>Que pueden usar los agentes</h2></div></div>
          <div class="context-list">
            <div>${badge("Permitido", "safe")}<strong>Perfil publico verificado</strong><span>Forma juridica, territorio, colectivos y programas.</span></div>
            <div>${badge("Aprobar", "warning")}<strong>Hechos internos sugeridos</strong><span>Actuacion CV, empleo, acompanamiento. Requieren validacion humana.</span></div>
            <div>${badge("Bloqueado", "danger")}<strong>Datos personales o sensibles</strong><span>No se usan para matching ni borradores en el MVP.</span></div>
          </div>
        </article>
        <article class="panel">
          <div class="panel-heading"><div><p class="eyebrow">Mejora continua</p><h2>Siguientes pasos</h2></div></div>
          <div class="activation-steps">
            <button class="ghost-action" type="button" data-entity-go="opportunities">Abrir radar de oportunidades</button>
            <button class="ghost-action" type="button" disabled>Conectar Drive autorizado</button>
            <button class="ghost-action" type="button" disabled>Aprobar hechos internos</button>
            <button class="ghost-action" type="button" disabled>Activar canales de aviso</button>
          </div>
        </article>
      </div>`;
    screen.querySelector("[data-entity-go]")?.addEventListener("click", () => window.showScreen?.("opportunities"));
  }

  renderActivation();
  document.addEventListener("DOMContentLoaded", renderActivation);
})();
