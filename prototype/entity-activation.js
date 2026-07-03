(function () {
  const agents = [
    { name: "Busqueda de convocatorias", role: "Plataforma", contract: "Contratado", state: "Solo plataforma", tone: "review", detail: "Lectura de fuentes publicas y novedades diarias. En demo usa una copia de trabajo; falta ejecucion real programada." },
    { name: "Asistente de encaje", role: "Entidad", contract: "Contratado", state: "Operativo prototipo", tone: "safe", detail: "Conversacion local con oportunidades filtradas para Novaterra." },
    { name: "Politicas de datos", role: "Transversal", contract: "Incluido", state: "Normas", tone: "review", detail: "Politicas visibles en footer; falta bloqueo automatico en servidor." },
    { name: "Revision documental", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Debe leer bases/PDF y preparar listas de comprobacion con evidencias." },
    { name: "Borrador de memoria", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Hoy exporta borrador demo; falta redaccion con informacion validada real." },
    { name: "Avisos y recordatorios", role: "Entidad", contract: "Contratado", state: "En desarrollo", tone: "warning", detail: "Pendiente de conectar email, Teams o WhatsApp." }
  ];
  const toolGroups = [
    { agent: "Busqueda de convocatorias", tools: [["leer_web_publica_entidad", "Pendiente permiso"], ["detectar_novedades_subvenciones", "Solo plataforma"]] },
    { agent: "Asistente de encaje", tools: [["consultar_radar_publico", "Activo"], ["comparar_con_contexto_aprobado", "Activo prototipo"]] },
    { agent: "Revision documental", tools: [["leer_documento_autorizado", "Drive pendiente"], ["extraer_requisitos", "En desarrollo"]] },
    { agent: "Borrador de memoria", tools: [["generar_borrador_word", "Demo"], ["rellenar_memoria_con_evidencias", "En desarrollo"]] }
  ];
  const contextPermissions = [
    { context: "Perfil publico de Novaterra", source: "Web publica autorizada", status: "Usable", use: "Radar y encaje", action: "Ver fuente", tone: "safe" },
    { context: "Respuestas internas de la entidad", source: "Entrevista guiada", status: "Pendiente", use: "No usar aun", action: "Aprobar respuestas", tone: "warning" },
    { context: "Documentos privados", source: "Drive/SharePoint no conectado", status: "No conectado", use: "No usar", action: "Conectar fuente", tone: "review" },
    { context: "Datos personales o sensibles", source: "Politica de privacidad", status: "Bloqueado", use: "No usar", action: "Ver politica", tone: "danger" }
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
  const contextStatus = (icon, label, tone, help) => `
    <span class="context-status ${tone}" title="${help}">
      <i data-lucide="${icon}"></i><span class="sr-only">${label}</span>
    </span>`;

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

      <article class="panel">
        <div class="panel-heading"><div><p class="eyebrow">Tools por asistente</p><h2>Como se consigue el contexto</h2></div></div>
        <div class="tool-map">
          ${toolGroups.map((group) => `
            <article>
              <strong>${group.agent}</strong>
              <div>${group.tools.map(([tool, state]) => `<span title="${state}"><code>${tool}</code><small>${state}</small></span>`).join("")}</div>
            </article>`).join("")}
        </div>
      </article>

      <div class="two-column">
        <article class="panel">
          <div class="panel-heading"><div><p class="eyebrow">Informacion para la IA</p><h2>Que informacion pueden usar</h2></div></div>
          <p class="section-note">No son funcionalidades pendientes: son permisos sobre que datos puede usar cada asistente.</p>
          <div class="context-list">
            <div>
              <header>${contextStatus("check-circle-2", "Usable ahora", "safe", "La IA puede usar este contexto desde el prototipo.")}<strong>Perfil publico verificado</strong><span title="Usable ahora"><i data-lucide="info"></i></span></header>
              <span>Forma juridica, territorio, colectivos y programas.</span>
            </div>
            <div>
              <header>${contextStatus("clock-3", "Pendiente de validar", "warning", "No se usa hasta que una persona autorizada lo apruebe.")}<strong>Contexto interno pendiente</strong><span title="Pendiente de validacion humana"><i data-lucide="info"></i></span></header>
              <span>Respuestas internas, documentos y datos privados no se usan hasta que la entidad los apruebe expresamente.</span>
            </div>
            <div>
              <header>${contextStatus("lock-keyhole", "Bloqueado", "danger", "Queda fuera del analisis y de los borradores.")}<strong>Datos personales o sensibles</strong><span title="Bloqueado para IA"><i data-lucide="info"></i></span></header>
              <span>No se usan para analisis de encaje ni borradores en el prototipo.</span>
            </div>
          </div>
        </article>
        <article class="panel">
          <div class="panel-heading"><div><p class="eyebrow">Permisos de contexto</p><h2>Que puede usar la IA ahora</h2></div></div>
          <p class="section-note">Esta tabla no contiene casos reales ni datos personales. Resume el estado de autorizacion de cada tipo de contexto.</p>
          <div class="fact-review-table">
            <div class="fact-review-head"><span>Contexto</span><span>Origen</span><span>Estado</span><span>Uso permitido</span><span>Siguiente accion</span></div>
            ${contextPermissions.map((row) => `
              <div class="fact-review-row">
                <strong>${row.context}</strong>
                <span>${row.source}</span>
                ${badge(row.status, row.tone)}
                <span>${row.use}</span>
                <div class="mini-actions"><button type="button" title="${row.action}"><i data-lucide="${row.tone === "safe" ? "file-search" : row.tone === "danger" ? "shield-alert" : "clipboard-check"}"></i><span class="sr-only">${row.action}</span></button></div>
              </div>`).join("")}
          </div>
        </article>
      </div>

      <div class="two-column">
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
    window.lucide?.createIcons();
  }

  renderActivation();
  document.addEventListener("DOMContentLoaded", renderActivation);
})();
