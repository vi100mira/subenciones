const state = { selectedOpportunityId: (window.OpportunityScope?.rows() || window.RADAR?.opportunities || window.MOCK.opportunities)[0].id };
function opportunities() {
  return window.OpportunityScope?.rows() || [];
}
const titles = {
  dashboard: "Panel de oportunidades",
  opportunities: "Gesti\u00f3n de oportunidades",
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
function sourceCoverage(source) {
  const publicRows = document.body.dataset.role === "superadmin" && window.RADAR_PLATFORM_OPPORTUNITIES?.length
    ? window.RADAR_PLATFORM_OPPORTUNITIES
    : window.RADAR?.opportunities || [];
  const privateRows = window.PRIVATE_OPEN_OPPORTUNITIES || [];
  const tenantPrivateRows = (window.MOCK.opportunities || []).filter((item) => item.sourceScope?.toLowerCase().includes("tenant"));
  let rows = [];
  let note = "Esta fuente no tiene oportunidades cargadas de forma independiente.";
  if (source.kind === "Publica oficial") {
    rows = publicRows;
    const visibleIds = new Set(opportunities().map((item) => String(item.id)));
    const visible = rows.filter((item) => visibleIds.has(String(item.id))).length;
    note = `${rows.length} registros vinculados a esta fuente; ${visible} cumplen el criterio vigente y aparecen ahora en Oportunidades.`;
  } else if (source.name === "DOGV/BOP") {
    rows = publicRows.filter((item) => (item.announcements || []).length || [...(item.supplementaryBasesUrls || []), item.officialUrl || ""].some((url) => /dogv|bop|bolet/i.test(url)));
    note = `${rows.length} oportunidades tienen evidencia complementaria localizada en diarios o boletines oficiales.`;
  } else if (source.kind === "Privada abierta") {
    rows = privateRows;
    const uncertain = rows.filter((item) => item.deadlineStatus === "uncertain").length;
    const closed = rows.filter((item) => item.deadlineStatus === "closed").length;
    note = `${rows.length} iniciativas monitorizadas: ${uncertain} pendientes de verificar y ${closed} cerradas. Ninguna se presenta como viva sin bases y vigencia confirmadas.`;
  } else if (source.kind === "Privada tenant") {
    rows = tenantPrivateRows;
    note = rows.length ? `${rows.length} avisos privados disponibles solo para esta entidad.` : "No hay alertas privadas conectadas para esta entidad.";
  } else if (source.name === "GVA" || source.name === "LABORA") {
    note = "Conector disponible para consulta, sin carga propia diferenciada; los resultados actuales llegan a traves de BDNS.";
  } else if (source.name === "Documentos de la entidad") {
    note = "No se contabilizan documentos hasta que la entidad autorice y conecte un repositorio privado.";
  } else if (source.name === "Casos personales") {
    note = "Fuente bloqueada: los casos personales no forman parte del radar.";
  }
  return { rows, note };
}
function renderSourceNode(source) {
  const status = source.health === "blocked" ? " blocked" : source.health === "degraded" ? " warning" : source.health === "unknown" ? " pending" : " active";
  const coverage = sourceCoverage(source);
  const items = coverage.rows.map((item) => `<button class="source-preview-item" data-grid-opportunity="${item.id}" type="button"><strong>${item.title}</strong><span>${item.source || source.name} · ${item.deadline || item.deadlineStatus || "Estado por revisar"}</span></button>`).join("");
  return `<details class="source-node${status}">
    <summary><span class="source-node-copy"><strong>${source.name}</strong><span>${source.status}</span></span><b class="source-node-number" aria-label="${coverage.rows.length} elementos">${coverage.rows.length}</b><i data-lucide="chevron-down"></i></summary>
    <div class="source-node-preview"><p>${coverage.note}</p>${items ? `<div class="source-preview-list">${items}</div>` : `<div class="plain-note"><strong>Sin elementos para mostrar</strong><span>${coverage.note}</span></div>`}</div>
  </details>`;
}
function uniqueRows(rows) {
  return [...new Map(rows.filter(Boolean).map((item) => [String(item.id), item])).values()];
}
function reconcileMatchAccounting(input = {}) {
  if (window.MatchAccounting?.reconcile) return window.MatchAccounting.reconcile(input);
  const count = (value) => Math.max(0, Number(value || 0));
  const total = count(input.total);
  const following = count(input.following);
  const outside = count(input.outside);
  const archived = count(input.archived);
  const notCurrent = Math.max(0, count(input.mappedActive) - following);
  const unmapped = count(input.unmapped);
  const classified = following + outside + archived + notCurrent + unmapped;
  return {
    total, following, outside, archived, notCurrent, unmapped,
    pendingClassification: Math.max(0, total - classified),
    overcount: Math.max(0, classified - total)
  };
}
function matchDashboardState(hasTenantMatch, accounting) {
  const loadState = window.TENANT_MATCH_LOAD_STATE || "loading";
  const runStatus = window.TENANT_MATCH_STATE?.status || "";
  const review = window.TENANT_MATCH_REVIEW_SUMMARY;
  if (hasTenantMatch) {
    const total = Number(accounting.total || review?.total || window.TENANT_MATCH_STATE?.usage_json?.opportunities || accounting.visibleRows.length);
    const reviewLabel = review?.state === "completed" ? "Revision completada" : review?.state === "in_progress" ? "Revision humana en curso" : "Resultado disponible para revisar";
    const outsideLabel = accounting.humanDismissed ? `${accounting.lowFit} bajo encaje y ${accounting.humanDismissed} descartadas` : `${accounting.lowFit} bajo encaje`;
    return {
      value: total,
      detail: `${accounting.following} en seguimiento · ${accounting.outside} fuera · ${accounting.notCurrent} no vigentes · ${accounting.unmapped} incidencias`,
      note: `${total} analizadas = ${accounting.following} en seguimiento + ${accounting.outside} fuera de seguimiento (${outsideLabel}) + ${accounting.archived} con plazo cerrado + ${accounting.notCurrent} fuera del criterio de vigencia actual + ${accounting.unmapped} que requieren conciliacion tecnica${accounting.pendingClassification ? ` + ${accounting.pendingClassification} pendientes de clasificar` : ""}${accounting.overcount ? `. Aviso: existe un solapamiento de ${accounting.overcount} resultados` : ""}. ${reviewLabel}.`
    };
  }
  if (["queued", "running"].includes(runStatus)) return { value: "—", detail: "Calculo de encaje en curso", note: "El agente esta trabajando. El panel se actualizara al finalizar." };
  if (loadState === "error") return { value: "—", detail: "Encaje temporalmente no disponible", note: window.TENANT_MATCH_LOAD_ERROR || "No se ha podido recuperar el resultado persistido." };
  if (runStatus === "review_required") return { value: "—", detail: "Resultado calculado · recuperando detalle", note: "Existe un encaje terminado; se estan sincronizando sus recomendaciones." };
  if (loadState === "loading") return { value: "—", detail: "Cargando encaje guardado", note: "Comprobando el ultimo resultado de la entidad." };
  return { value: 0, detail: "Encaje aun no calculado", note: "Aprueba el perfil y ejecuta el encaje para obtener recomendaciones." };
}
function metricPreview(metric) {
  const rows = metric.rows || [];
  const items = rows.map((item) => `<button class="metric-preview-item" data-grid-opportunity="${item.id}" type="button"><strong>${item.title}</strong><span>${item.source || "Oportunidad"} · ${item.deadline || item.entityFit?.reason || item.deadlineStatus || "Estado por revisar"}</span></button>`).join("");
  return `<p>${metric.note || metric.detail}</p>${items ? `<div class="metric-preview-list">${items}</div>` : `<div class="plain-note"><strong>Sin elementos para mostrar</strong><span>${metric.note || metric.detail}</span></div>`}`;
}
function renderDashboard() {
  const isPlatform = document.body.dataset.role === "superadmin";
  const hasTenantMatch = Boolean(window.TENANT_RECOMMENDATIONS_APPLIED && window.RADAR?.quality?.entityFitRule);
  const summary = window.OpportunityScope?.summary() || { total: 0, open: 0, highPriority: 0, uncertain: 0 };
  const currentRows = opportunities();
  const openRows = currentRows.filter((item) => item.deadlineStatus === "open");
  const uncertainRows = currentRows.filter((item) => item.deadlineStatus === "uncertain");
  const fit = window.RADAR?.quality || {};
  const discardedRows = window.RADAR_ENTITY_DISCARDED || [];
  const archivedRows = window.RADAR_DEADLINE_ARCHIVED || [];
  const matchRows = hasTenantMatch ? uniqueRows([...currentRows, ...discardedRows, ...archivedRows]) : [];
  const accounting = reconcileMatchAccounting({
    total: Number(window.TENANT_MATCH_REVIEW_SUMMARY?.total || window.TENANT_MATCH_STATE?.usage_json?.opportunities || matchRows.length),
    visibleRows: matchRows,
    following: currentRows.length,
    outside: discardedRows.length,
    archived: archivedRows.length,
    mappedActive: Number(fit.entityCandidateCount || 0),
    unmapped: Number(fit.entityUnmappedMatchCount || 0)
  });
  accounting.visibleRows = matchRows;
  accounting.lowFit = Number(fit.entityLowFitCount || 0);
  accounting.humanDismissed = Number(fit.entityHumanDismissedCount || 0);
  const matchState = matchDashboardState(hasTenantMatch, accounting);
  const metrics = document.querySelectorAll("#dashboard .metric");
  const values = isPlatform
    ? [
        { label: "Oportunidades publicas", value: "—", detail: "Cargando corpus comun de plataforma", rows: [], note: "El recuento global se obtiene del estado de plataforma." },
        { label: "Tenants activos", value: "—", detail: "Cargando entidades registradas", rows: [], note: "El detalle se mantiene aislado por tenant." },
        { label: "Asistentes operativos", value: "—", detail: "Cargando activaciones por tenant", rows: [], note: "Estado agregado sin exponer datos privados." },
        { label: "Revisiones pendientes", value: "—", detail: "Cargando decisiones humanas pendientes", rows: [], note: "Solo se contabilizan revisiones persistidas." }
      ]
    : [
        { label: hasTenantMatch ? "Oportunidades en seguimiento" : "Oportunidades disponibles", value: summary.total, detail: hasTenantMatch ? "Coincide con la vista Oportunidades" : "Corpus general mientras se recupera el encaje", rows: currentRows, note: `${summary.total} oportunidades visibles en el estado actual.` },
        { label: "Con plazo abierto", value: summary.open, detail: "Solicitud abierta confirmada", rows: openRows, note: `${openRows.length} oportunidades con plazo abierto confirmado.` },
        { label: "Ultimo calculo de encaje", value: matchState.value, detail: matchState.detail, rows: matchRows, note: matchState.note },
        { label: "Plazo por confirmar", value: summary.uncertain, detail: "Requiere revision antes de decidir", rows: uncertainRows, note: `${uncertainRows.length} oportunidades conservan incertidumbre de plazo.` }
      ];
  metrics.forEach((metric, index) => {
    metric.querySelector("summary > span").textContent = values[index].label;
    metric.querySelector("summary > strong").textContent = values[index].value;
    metric.querySelector("summary > small").textContent = values[index].detail;
    metric.querySelector(".metric-preview").innerHTML = metricPreview(values[index]);
  });
  document.querySelector("#alerts-list").innerHTML = (isPlatform ? window.MOCK.platformAlerts : window.MOCK.alerts).map(renderStackItem).join("");
  document.querySelector("#dashboard .source-map-panel h2").textContent = isPlatform ? "Cobertura global de fuentes" : "Cobertura del radar";
  const sourceAction = document.querySelector("#dashboard .source-map-panel [data-jump]");
  sourceAction.textContent = isPlatform ? "Ver estado de fuentes" : "Gestionar"; sourceAction.dataset.jump = isPlatform ? "operations" : "governance";
  if (isPlatform) sourceAction.dataset.focusTarget = "operations-source-health"; else delete sourceAction.dataset.focusTarget;
  document.querySelector("#source-map").innerHTML = `
    <div class="source-legend">
      <span><i class="legend-dot active"></i>Operativa</span>
      <span><i class="legend-dot warning"></i>Con avisos</span>
      <span><i class="legend-dot pending"></i>No conectada</span>
      <span><i class="legend-dot blocked"></i>Bloqueada</span>
    </div>
  ` + window.MOCK.sources.filter((source) => !isPlatform || !source.scope.toLowerCase().includes("tenant")).map(renderSourceNode).join("");
  window.lucide?.createIcons();
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
  document.querySelector("#audit .panel-heading h2").textContent = isPlatform ? "Auditoría de plataforma" : "Eventos reales de la entidad";
  document.querySelector("#audit-timeline").innerHTML = '<div class="plain-note"><strong>Cargando trazabilidad</strong><span>Consultando el registro persistido autorizado para esta sesión.</span></div>';
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
  document.querySelector("#tenant-list").innerHTML = `
    <div class="source-control-row"><div><strong>Tenant minimo</strong><span>Nombre, web publica, email admin y consentimiento.</span></div><div><strong>Agente investigador</strong><span>12 paginas, profundidad 2, 90s, 3 MB.</span></div><div><strong>Revision humana</strong><span>Tipo, territorio, temas y logo quedan pendientes.</span></div></div>
    <div class="inline-form">
      <label><span>Nombre</span><input data-tenant-create="name" value="Nueva entidad social" /></label>
      <label><span>Web pública</span><input data-tenant-create="website" value="https://entidad.org" /></label><label><span>Email propietario existente</span><input data-tenant-create="owner-email" value="admin@entidad.org" /></label><label><span>Consentimientos</span><input value="Se solicitan después del alta" disabled /></label>
      <button class="primary-action" data-tenant-provision type="button">Crear estructura tenant</button>
    </div>
    <div class="plain-note" data-tenant-admin-status><strong>Alta gobernada</strong><span>Crea estructura y agentes bloqueados por sus puertas; no concede consentimientos ni investiga automáticamente.</span></div>
    <div data-tenant-grid-host></div>
  `;
  window.TenantGrid?.render(window.MOCK.tenants);
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
  const primaryAction = document.querySelector(".top-actions .primary-action");
  const refreshAction = document.querySelector("#refresh-button");
  const isPlatformAdmin = document.body.dataset.role === "superadmin";
  const refreshScreens = ["opportunities", "agents", "audit", "operations"];
  primaryAction.style.display = !isPlatformAdmin && screenId === "opportunities" ? "" : "none";
  refreshAction.style.display = refreshScreens.includes(screenId) ? "" : "none";
  if (screenId === "dashboard") {
    renderDashboard();
    window.refreshTenantMatchState?.();
  }
  primaryAction.innerHTML = '<i data-lucide="plus"></i>Nueva busqueda'; window.lucide?.createIcons();
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
    button.addEventListener("click", () => {
      showScreen(button.dataset.jump);
      const target = document.getElementById(button.dataset.focusTarget || "");
      if (target) requestAnimationFrame(() => { target.scrollIntoView({ block: "start" }); target.focus({ preventScroll: true }); });
    });
  });
  document.querySelectorAll("[data-platform-tab]").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll("[data-platform-tab]").forEach((tab) => tab.classList.toggle("is-selected", tab === button)); document.querySelectorAll("[data-platform-pane]").forEach((pane) => { pane.hidden = pane.dataset.platformPane !== button.dataset.platformTab; }); }));
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
  window.addEventListener("tenant-recommendations-applied", () => { renderDashboard(); renderOpportunities(); });
  ["tenant-match-load-state", "tenant-match-state", "role-session-applied"].forEach((eventName) => window.addEventListener(eventName, renderDashboard));
  bindNavigation();
  bindJumps(); window.showScreen = showScreen; window.addEventListener("hashchange", () => { const id = location.hash.replace("#view-", "").replace("#", ""); if (titles[id]) showScreen(id); });

  document.querySelector("#refresh-button").addEventListener("click", () => {
    if (document.body.dataset.role === "superadmin" && window.PlatformRuntime?.refresh) return window.PlatformRuntime.refresh();
    showToast("Fuentes actualizadas. No se ha enviado ningún dato privado.");
  });

  const hash = window.location.hash.replace("#", "");
  const initialScreen = hash.startsWith("view-") ? hash.replace("view-", "") : hash || "dashboard";
  showScreen(titles[initialScreen] ? initialScreen : "dashboard");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

init();
