const state = {
  selectedOpportunityId: (window.RADAR?.opportunities || window.MOCK.opportunities)[0].id
};

function opportunities() {
  return window.RADAR?.opportunities?.length ? window.RADAR.opportunities : window.MOCK.opportunities;
}

const titles = {
  dashboard: "Panel de oportunidades",
  opportunities: "Oportunidades vivas",
  entity: "Perfil de entidad",
  governance: "Gobernanza del dato",
  agents: "Agentes invocables",
  workspace: "Candidatura",
  audit: "Auditoria",
  platform: "Consola plataforma",
  operations: "Operaciones"
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
  const radarCount = opportunities().length;
  const openCount = opportunities().filter((item) => item.deadlineStatus === "open").length;
  const metrics = document.querySelectorAll(".metric");
  metrics[0].querySelector("strong").textContent = radarCount;
  metrics[0].querySelector("small").textContent = `${openCount} abiertas segun radar`;
  if (window.RADAR?.quality) {
    metrics[1].querySelector("span").textContent = "Plazos inciertos";
    metrics[1].querySelector("strong").textContent = window.RADAR.quality.uncertainDeadline;
    metrics[1].querySelector("small").textContent = "Plazos inciertos a revisar";
    metrics[2].querySelector("span").textContent = "Errores BDNS";
    metrics[2].querySelector("strong").textContent = window.RADAR.quality.detailErrorCount;
    metrics[2].querySelector("small").textContent = "Errores de detalle BDNS";
    metrics[3].querySelector("span").textContent = "Corpus estatal";
    metrics[3].querySelector("strong").textContent = window.RADAR.totalElements || radarCount;
    metrics[3].querySelector("small").textContent = "Resultados potenciales BDNS";
  }
  document.querySelector("#alerts-list").innerHTML = window.MOCK.alerts.map(renderStackItem).join("");
  document.querySelector("#agent-runs-small").innerHTML = window.MOCK.runs.slice(0, 3).map(renderStackItem).join("");
  document.querySelector("#source-map").innerHTML = `
    <div class="source-legend">
      <span><i class="legend-dot active"></i>Activa</span>
      <span><i class="legend-dot warning"></i>Con avisos</span>
      <span><i class="legend-dot pending"></i>Pendiente</span>
      <span><i class="legend-dot blocked"></i>Bloqueada</span>
    </div>
  ` + window.MOCK.sources.slice(0, 6).map((source) => {
    const status = source.health === "blocked" ? " blocked" : source.health === "degraded" ? " warning" : source.status === "Pendiente" ? " pending" : source.status.includes("Activa") ? " active" : "";
    const cls = `${source.scope.includes("privado") || source.kind === "Privativa" ? " private" : ""}${status}`;
    return `<div class="source-node${cls}"><strong>${source.name}</strong><span>${source.status}</span></div>`;
  }).join("");
  document.querySelector("#source-map").insertAdjacentHTML("afterend", `<div class="plain-note"><strong>Que muestra este panel:</strong><br><span>No son oportunidades. Son fuentes que alimentan el radar y su estado de uso.</span></div>`);
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
          ${badge(item.theme, "review")}
        </div>
        <div class="button-row">
          <button class="ghost-action" data-opportunity="${item.id}">Ver analisis</button>
          ${item.basesUrl ? `<a class="ghost-action" href="${item.basesUrl}" target="_blank" rel="noreferrer">Bases</a>` : ""}
          ${item.extractedText ? `<button class="text-action" data-text-opportunity="${item.id}">Ver texto original usado</button>` : ""}
          ${item.officialUrl ? `<a class="text-action" href="${item.officialUrl}" target="_blank" rel="noreferrer">API oficial</a>` : ""}
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
    item.officialUrl ? `<a href="${item.officialUrl}" target="_blank" rel="noreferrer">Abrir API oficial BDNS (vista tecnica)</a>` : "",
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
      <div><span>Importe</span><strong>${item.amount}</strong></div>
      <div><span>Plazo</span><strong>${item.deadline}</strong></div>
      <div><span>Confianza plazo</span><strong>${item.deadlineConfidence}</strong></div>
      <div><span>Nota</span><strong>No es elegibilidad</strong></div>
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
      <h2>Evidencia publica</h2>
      <ul>${item.evidence.map((evidence) => `<li>${evidence}</li>`).join("")}</ul>
    </div>
    ${documentSection}
    <div class="detail-section">
      <h2>Hechos internos usados</h2>
      <div class="evidence-row">${item.internalFacts.map((fact) => badge(fact, "review")).join("")}</div>
    </div>
    <div class="button-row">
      <button class="primary-action" data-jump="workspace">Crear candidatura</button>
      <button class="ghost-action" data-jump="governance">Ver uso de datos</button>
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
  document.querySelector("#agent-grid").innerHTML = window.MOCK.agents.map((agent) => `
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

  document.querySelector("#agent-runs").innerHTML = window.MOCK.runs.map(renderStackItem).join("");
}

function renderWorkspace() {
  document.querySelector("#checklist").innerHTML = window.MOCK.checklist.map((entry) => {
    const tone = entry.state === "done" ? "safe" : entry.state === "review" ? "warning" : "review";
    const label = entry.state === "done" ? "Hecho" : entry.state === "review" ? "Revisar" : "Pendiente";
    return `<div class="check-item"><strong>${entry.item}</strong><span class="check-actions">${badge(label, tone)}<button class="ghost-action" data-workspace-action="${entry.action}">${entry.action}</button></span></div>`;
  }).join("");

  document.querySelector("#proposal-outline").innerHTML = window.MOCK.outline.map((section) => `
    <article class="outline-item">
      <strong>${section.title}</strong>
      <p>${section.text}</p>
    </article>
  `).join("");
}

function renderAudit() {
  document.querySelector("#audit-timeline").innerHTML = window.MOCK.audit.map((item) => `
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
      <div class="stack-item">
        <div class="opportunity-topline">
          <strong>${item.title}</strong>
          ${badge(item.state, tone)}
        </div>
        <span>${item.detail}</span>
      </div>
    `;
  };
  document.querySelector("#tenant-list").innerHTML = `
    <div class="inline-form">
      <label><span>Nombre</span><input value="Entidad social demo" /></label>
      <label><span>Slug</span><input value="entidad-social-demo" /></label>
      <label><span>Color</span><input value="#24515a" /></label>
      <button class="primary-action" type="button">Crear entidad</button>
    </div>
    ${window.MOCK.tenants.map(row).join("")}
  `;
  document.querySelector("#platform-campaigns").innerHTML = window.MOCK.platformCampaigns.map(row).join("");
  document.querySelector("#platform-campaigns").insertAdjacentHTML("afterbegin", `<div class="plain-note"><strong>Que es una campana</strong><span>Una campana es una ejecucion controlada por superadmin para buscar cambios en fuentes publicas, guardar evidencias y preparar textos. Cuando activemos embeddings, tambien regenerara vectores solo de lo que haya cambiado.</span></div>`);
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
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-visible", screen.id === screenId);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.screen === screenId);
  });
  document.querySelector("#screen-title").textContent = titles[screenId];
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
  bindNavigation();
  bindJumps();

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
