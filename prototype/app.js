const state = { selectedOpportunityId: (window.OpportunityScope?.rows() || window.RADAR?.opportunities || window.MOCK.opportunities)[0].id };
function opportunities() {
  return window.OpportunityScope?.rows() || [];
}
const titles = {
  dashboard: "Panel de oportunidades",
  opportunities: "Oportunidades vivas",
  entity: "Perfil de entidad",
  governance: "Gobernanza del dato",
  agents: "Asistentes y servicios",
  workspace: "Candidatura",
  audit: "Auditoria",
  platform: "Consola plataforma",
  operations: "Operaciones", plan: "Plan y monetizacion"
};
function badge(text, tone = "review") {
  return `<span class="badge ${tone}">${text}</span>`;
}
function renderStackItem(item) {
  return `<div class="stack-item"><strong>${item.title || item.agent}</strong><span>${item.detail}</span></div>`;
}
function scoreLabel(score) {
  return score >= 75 ? "Prioridad alta" : score >= 55 ? "Prioridad media" : "Prioridad baja";
}
function renderDashboard() {
  const isPlatform = document.body.dataset.role === "superadmin";
  const summary = window.OpportunityScope?.summary() || { total: 0, open: 0, highPriority: 0, uncertain: 0 };
  const metrics = document.querySelectorAll("#dashboard .metric");
  const values = [
    ["Oportunidades en seguimiento", summary.total, "Coincide con la vista Oportunidades"],
    ["Con plazo abierto", summary.open, "Solicitud abierta confirmada"],
    ["Prioridad alta", summary.highPriority, "Segun el perfil de la entidad"],
    ["Plazo por confirmar", summary.uncertain, "Requiere revision antes de decidir"]
  ];
  metrics.forEach((metric, index) => {
    metric.querySelector("span").textContent = values[index][0];
    metric.querySelector("strong").textContent = values[index][1];
    metric.querySelector("small").textContent = values[index][2];
  });
  document.querySelector("#alerts-list").innerHTML = (isPlatform ? window.MOCK.platformAlerts : window.MOCK.alerts).map(renderStackItem).join("");
  document.querySelector("#agent-runs-small").innerHTML = (isPlatform ? window.MOCK.platformRuns : window.MOCK.runs).slice(0, 3).map(renderStackItem).join("");
  document.querySelector("#dashboard .source-map-panel h2").textContent = isPlatform ? "Cobertura global de fuentes" : "Cobertura del radar";
  document.querySelector("#source-map").innerHTML = `
    <div class="source-legend">
      <span><i class="legend-dot active"></i>Operativa</span>
      <span><i class="legend-dot warning"></i>Con avisos</span>
      <span><i class="legend-dot pending"></i>No conectada</span>
      <span><i class="legend-dot blocked"></i>Bloqueada</span>
    </div>
  ` + window.MOCK.sources.filter((source) => !isPlatform || !source.scope.toLowerCase().includes("tenant")).map((source) => {
    const status = source.health === "blocked" ? " blocked" : source.health === "degraded" ? " warning" : source.health === "unknown" ? " pending" : " active";
    const cls = `${source.scope.includes("privado") || source.scope.includes("curada") || source.kind === "Privativa" ? " private" : ""}${status}`;
    return `<div class="source-node${cls}"><strong>${source.name}</strong><span>${source.status}</span></div>`;
  }).join("");
}
function renderOpportunities() {
  const list = document.querySelector("#opportunity-list");
  list.innerHTML = opportunities().map((item) => {
    const selected = item.id === state.selectedOpportunityId ? " is-selected" : "";
    const tone = item.deadlineStatus === "closed" ? "danger" : item.deadlineStatus === "uncertain" ? "warning" : "safe";
    return `
      <div class="opportunity-item${selected}">
        <div class="opportunity-topline">
          <div>
            <strong>${item.title}</strong>
            <span>${item.source} · ${item.territory}</span>
          </div>
          <div class="score"><strong>${scoreLabel(item.score)}</strong><span>(${item.score}/100 estimado)</span></div>
        </div>
        <div class="evidence-row">
          ${badge(item.deadline, tone)}
          ${badge(item.theme, "review")}${item.sourceScope ? badge(item.sourceScope, item.sourceScope.includes("tenant") ? "warning" : "review") : ""}
        </div>
        <div class="button-row">
          <button class="ghost-action" data-opportunity="${item.id}">Ver analisis</button>
          ${item.basesUrl ? `<a class="ghost-action" href="${item.basesUrl}" target="_blank" rel="noreferrer">Bases</a>` : ""}
          ${item.extractedText ? `<button class="text-action" data-text-opportunity="${item.id}">Ver texto original usado</button>` : ""}
          ${item.officialUrl ? `<a class="text-action" href="${item.officialUrl}" target="_blank" rel="noreferrer">Fuente oficial</a>` : ""}
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-opportunity]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOpportunityId = button.dataset.opportunity; renderOpportunities();
    });
  });
  list.querySelectorAll("[data-text-opportunity]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOpportunityId = button.dataset.textOpportunity; renderOpportunities();
      document.querySelector("#opportunity-detail details")?.setAttribute("open", "");
    });
  });

  const item = opportunities().find((opportunity) => opportunity.id === state.selectedOpportunityId) || opportunities()[0];
  const documents = [...(item.documents || []), ...(item.announcements || [])].slice(0, 4);
  const sourceLinks = [
    item.officialUrl ? `<a href="${item.officialUrl}" target="_blank" rel="noreferrer">Abrir ficha oficial de la convocatoria</a>` : "",
    item.basesUrl ? `<a href="${item.basesUrl}" target="_blank" rel="noreferrer">Abrir bases reguladoras</a>` : ""
  ].filter(Boolean).join("");
  const documentSection = documents.length ? `
    <div class="detail-section">
      <h2>Documentos y anuncios oficiales</h2>
      <div class="evidence-row">${sourceLinks}</div>
      <ul>${documents.map((doc) => `<li>${doc.url ? `<a href="${doc.url}" target="_blank" rel="noreferrer">${doc.title || doc.description}</a>` : doc.filename || doc.title || doc.description} ${doc.publishedAt ? `(${doc.publishedAt})` : ""}</li>`).join("")}</ul>
      ${item.extractedText ? `<details><summary>Ver texto original usado para el analisis</summary><p>${item.extractedText.slice(0, 1600)}</p></details>` : ""}
    </div>
  ` : "";

  document.querySelector("#opportunity-detail").innerHTML = `
    <div class="detail-topline">
      <div>
        <p class="eyebrow">Analisis de encaje</p>
        <h2>${item.title}</h2>
      </div>
      <div class="score"><strong>${scoreLabel(item.score)}</strong><span>(${item.score}/100 estimado)</span></div>
    </div>
    <p class="lead">${item.source} · ${item.territory}</p>
    <div class="detail-grid">
      <div><span>Importe</span><strong>${item.amount}</strong></div><div><span>Plazo</span><strong>${item.deadline}</strong></div>
      <div><span>Confianza plazo</span><strong>${item.deadlineConfidence}</strong></div><div><span>Origen</span><strong>${item.sourceScope || "Publica oficial"}</strong></div>
      <div><span>Financiador</span><strong>${item.funderType || "Administracion publica"}</strong></div><div><span>Evidencia</span><strong>${item.evidenceQuality || "Fuente oficial"}</strong></div>
    </div>
    <div class="detail-section">
      <h2>Por que puede encajar</h2>
      <ul>${item.fit.map((reason) => `<li>${reason}</li>`).join("")}</ul>
    </div>
    <div class="detail-section">
      <h2>Riesgos a revisar</h2>
      <ul>${item.risks.map((risk) => `<li>${risk}</li>`).join("")}</ul>
    </div>
    <div class="detail-section">
      <h2>Evidencia de fuente</h2>
      <ul>${item.evidence.map((evidence) => `<li>${evidence}</li>`).join("")}</ul>
    </div>
    ${documentSection}
    <div class="detail-section">
      <h2>Hechos internos usados</h2>
      <div class="evidence-row">${item.internalFacts.map((fact) => badge(fact, "review")).join("")}</div>
    </div>
    <div class="button-row">
      <button class="primary-action" data-jump="workspace" data-watch-opportunity="${item.id}" data-watch-reason="candidate_workspace">Crear candidatura</button>
      <button class="ghost-action" data-policy-modal>Ver politicas de datos</button>
    </div>
  `;
  bindJumps();
}

function renderEntity() {
  document.querySelector("#facts-list").innerHTML = window.MOCK.facts.map((fact) => {
    const tone = fact.class === "Bloqueado" ? "danger" : fact.class === "Publico" ? "safe" : "review";
    return `
      <article class="fact-card">
        ${badge(fact.class, tone)}
        <strong>${fact.label}</strong>
        <p>${fact.text}</p>
      </article>
    `;
  }).join("");
}

function renderGovernance() {
  document.querySelector("#source-control-list").innerHTML = window.MOCK.sources.map((source) => {
    const tone = source.status === "Bloqueada" ? "danger" : source.status === "Pendiente" ? "warning" : source.health === "degraded" ? "warning" : "safe";
    return `
      <div class="source-control-row">
        <div>
          <strong>${source.name}</strong>
          <span>${source.kind} · ${source.scope}</span>
        </div>
        <div><span>Prioridad</span><strong>${source.priority}</strong></div>
        ${badge(source.status, tone)}
        <span>${source.control}</span>
        <div class="row-actions"><button class="ghost-action" data-source-action="${source.name}">Gestionar</button></div>
      </div>
    `;
  }).join("");

  document.querySelector("#governance-table").innerHTML = window.MOCK.governance.map((row) => `
    <div class="governance-row">
      <strong>${row.class}</strong>
      <span>${row.use}</span>
      ${badge(row.policy, row.tone)}
    </div>
  `).join("");

  document.querySelector("#review-queue").innerHTML = window.MOCK.reviewQueue.map((item) => `
    <div class="stack-item">
      <div class="opportunity-topline">
        <strong>${item.title}</strong>
        ${badge(item.state, item.state === "Pendiente" ? "warning" : "review")}
      </div>
      <span>${item.detail}</span>
    </div>
  `).join("");
}

function renderAgents() {
  const isPlatform = document.body.dataset.role === "superadmin";
  document.querySelector("#agent-grid").innerHTML = (isPlatform ? window.MOCK.platformAgents : window.MOCK.agents).map((agent) => `
    <article class="agent-card">
      <div class="agent-icon"><i data-lucide="${agent.icon}"></i></div>
      <div class="opportunity-topline">
        <strong>${agent.name}</strong>
        ${badge(agent.status, agent.status === "Revision" ? "warning" : "review")}
      </div>
      <p>${agent.purpose}</p>
      <span>Acceso: ${agent.access}</span>
    </article>
  `).join("");

  document.querySelector("#agent-runs").innerHTML = (isPlatform ? window.MOCK.platformRuns : window.MOCK.runs).map(renderStackItem).join("");
}

function renderWorkspace() {
  document.querySelector("#checklist").innerHTML = window.MOCK.checklist.map((entry) => {
    const tone = entry.state === "done" ? "safe" : entry.state === "review" ? "warning" : "review";
    const label = entry.state === "done" ? "Hecho" : entry.state === "review" ? "Revisar" : "Pendiente";
    return `<div class="check-item"><strong>${entry.item}</strong><span class="check-actions">${badge(label, tone)}<button class="ghost-action" data-workspace-action="${entry.action}">${entry.action}</button></span></div>`;
  }).join("");

  const proposal = document.querySelector("#proposal-outline"); if (proposal) proposal.innerHTML = window.MOCK.outline.map((section) => `
      <article class="outline-item">
        <strong>${section.title}</strong>
        <p>${section.text}</p>
      </article>
    `).join("");
}

function renderAudit() {
  const isPlatform = document.body.dataset.role === "superadmin";
  document.querySelector("#audit .panel-heading h2").textContent = isPlatform ? "Eventos globales de plataforma" : "Eventos del piloto";
  document.querySelector("#audit-timeline").innerHTML = (isPlatform ? window.MOCK.platformAudit : window.MOCK.audit).map((item) => `
    <div class="timeline-item">
      <time>${item.time}</time>
      <div>
        <strong>${item.event}</strong>
        <span>${item.actor} · ${item.detail}</span>
      </div>
      <button class="info-dot" title="${item.info}" aria-label="Informacion de auditoria">i</button>
    </div>
  `).join("");
}

function renderPlatform() {
  const row = (item) => {
    const tone = item.state === "Activa" ? "safe" : item.state === "Atencion" ? "warning" : "review";
    return `
      <details class="stack-item">
        <summary class="opportunity-topline"><strong>${item.title}</strong><span class="collapse-hint">Abrir configuracion</span>${badge(item.state, tone)}</summary>
        <span>${item.detail}</span>
        ${item.cron ? `<div class="source-control-row"><div><strong>Cron</strong><span>${item.cron}</span></div><div><strong>IA</strong><span>${item.costPolicy}</span></div><div><strong>Manual</strong><span>${item.trigger}</span></div></div><div class="plain-note"><strong>Ayuda cron</strong><span>Formato: minuto hora dia-mes mes dia-semana. Diario 06:00: 0 6 * * *. Semanal lunes 07:00: 0 7 * * 1.</span></div><div class="inline-form"><label><span>Expresion cron</span><input data-cron-input value="${item.cron}" /></label><label><span>Presupuesto diario IA</span><input value="${item.budget}" /></label><button class="ghost-action" data-review-action="save" type="button">Guardar cron</button><button class="primary-action" data-review-action="run" type="button">Ejecutar ahora</button></div>` : ""}
      </details>
    `;
  };
  const tenantRow = (item) => `<div class="tenant-grid-row"><div><strong>${item.title}</strong><span>${item.detail}</span></div><div>${badge(item.state, item.state === "Activa" ? "safe" : "review")}</div><div><span>Gobierno</span><strong>Admin validado + terminos</strong></div><div class="tenant-actions"><button class="ghost-action" data-tenant-action="edit" type="button">Editar</button><button class="ghost-action" data-tenant-action="terms" type="button">Terminos</button><button class="ghost-action" data-tenant-action="suspend" type="button">Suspender</button><button class="danger-action" data-tenant-action="delete" type="button">Eliminar</button></div></div>`;
  document.querySelector("#tenant-list").innerHTML = `
    <div class="source-control-row"><div><strong>Tenant minimo</strong><span>Nombre, web publica, email admin y consentimiento.</span></div><div><strong>Agente investigador</strong><span>12 paginas, profundidad 2, 90s, 3 MB.</span></div><div><strong>Revision humana</strong><span>Tipo, territorio, temas y logo quedan pendientes.</span></div></div>
    <div class="inline-form">
      <label><span>Nombre</span><input value="Nueva entidad social" /></label>
      <label><span>Web publica</span><input value="https://entidad.org" /></label><label><span>Email admin</span><input value="admin@entidad.org" /></label><label><span>Logo opcional</span><span class="logo-picker"><input id="tenant-logo-upload" type="file" accept="image/*" /><span class="ghost-action">Subir logo</span><small data-logo-file>Sin archivo</small></span></label><label><span>Consentimiento</span><input value="Autoriza analisis web publica" /></label>
      <button class="primary-action" type="button">Crear tenant e investigar web</button>
    </div>
    <div class="plain-note"><strong>Salida esperada del agente</strong><span>Logo candidato, tipo juridico, territorio, programas, colectivos y temas. Todo queda como sugerido hasta que el admin lo apruebe.</span></div>
    <div class="tenant-grid"><div class="tenant-grid-head"><span>Entidad</span><span>Estado</span><span>Control</span><span>Operaciones</span></div>${window.MOCK.tenants.map(tenantRow).join("")}</div>
  `;
  document.querySelector("#platform-campaigns").innerHTML = `<div class="source-control-row"><div><strong>Detectar cambios</strong><span>Hash/etag sin IA antes de modelos.</span></div><div><strong>Programar cron</strong><span>Cadencia y presupuesto por campana.</span></div><div><strong>Ejecutar ahora</strong><span>Manual con motivo y auditoria.</span></div></div><div class="plain-note"><strong>Flujo del agente</strong><span>Abre cada revision para editar cron, presupuesto y ejecucion manual.</span></div>${window.MOCK.platformCampaigns.map(row).join("")}`;
}

function renderOperations() {
  const row = (item) => {
    const tone = item.state === "Atencion" ? "warning" : item.state === "Pendiente" ? "review" : item.state === "OK" || item.state === "Completado" ? "safe" : "review";
    return `
      <div class="stack-item">
        <div class="opportunity-topline">
          <strong>${item.title}</strong>
          ${badge(item.state, tone)}
        </div>
        <span>${item.detail}</span>
      </div>
    `;
  };
  document.querySelector("#operations-jobs").innerHTML = `<div class="plain-note"><strong>Lectura para gestor</strong><span>Esta pantalla dice si las fuentes, documentos y revisiones van bien. No exige interpretar logs tecnicos.</span></div>${window.MOCK.operationsJobs.map(row).join("")}`;
  document.querySelector("#operations-health").innerHTML = window.MOCK.operationsHealth.map(row).join("");
}

function showScreen(screenId) {
  if (screenId === "governance") screenId = "entity";
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-visible", screen.id === screenId);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.screen === screenId);
  });
  const platformTitles = { dashboard: "Panel de plataforma", opportunities: "Oportunidades de la plataforma", agents: "Asistentes de la plataforma", audit: "Auditoria global" };
  document.querySelector("#screen-title").textContent = document.body.dataset.role === "superadmin" && platformTitles[screenId] ? platformTitles[screenId] : titles[screenId];
  document.querySelector(".top-actions .primary-action").innerHTML = (screenId === "platform" || screenId === "operations" || document.body.dataset.role === "superadmin") ? '<i data-lucide="play"></i>Ejecutar ahora' : '<i data-lucide="plus"></i>Nueva busqueda'; window.lucide?.createIcons();
  history.replaceState(null, "", `#view-${screenId}`);
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.screen));
  });
}

function bindJumps() {
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.jump));
  });
  document.querySelectorAll("[data-platform-tab]").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll("[data-platform-tab]").forEach((tab) => tab.classList.toggle("is-selected", tab === button)); document.querySelectorAll("[data-platform-pane]").forEach((pane) => { pane.hidden = pane.dataset.platformPane !== button.dataset.platformTab; }); }));
  document.querySelectorAll("#platform-campaigns details summary").forEach((summary) => summary.addEventListener("click", (event) => { event.preventDefault(); summary.parentElement.open = !summary.parentElement.open; }));
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => toast.classList.remove("is-visible"), 2300);
  setTimeout(() => toast.remove(), 2600);
}

function init() {
  renderDashboard();
  renderOpportunities();
  renderEntity();
  renderGovernance();
  renderAgents();
  renderWorkspace();
  renderAudit();
  renderPlatform();
  renderOperations();
  window.refreshRoleViews = () => { renderDashboard(); renderOpportunities(); renderAgents(); renderAudit(); renderOperations(); window.renderPlatformOperations?.(); };
  bindNavigation();
  bindJumps(); window.showScreen = showScreen; window.addEventListener("hashchange", () => { const id = location.hash.replace("#view-", "").replace("#", ""); if (titles[id]) showScreen(id); });

  document.querySelector("#refresh-button").addEventListener("click", () => {
    showToast("Fuentes refrescadas en modo prototipo. No se ha enviado ningun dato privado.");
  });

  const hash = window.location.hash.replace("#", "");
  const initialScreen = hash.startsWith("view-") ? hash.replace("view-", "") : hash || "dashboard";
  showScreen(titles[initialScreen] ? initialScreen : "dashboard");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

init();
