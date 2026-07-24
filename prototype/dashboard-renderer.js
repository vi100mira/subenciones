(() => {
let opportunities, badge, renderStackItem;

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
    const count = Number(window.TENANT_DOCUMENT_SUMMARY?.documentCount || 0);
    note = count
      ? `${count} documentos privados inventariados para esta entidad. Solo se usan en candidaturas tras selección y revisión humana.`
      : "No se contabilizan documentos hasta que la entidad autorice y conecte un repositorio privado.";
  } else if (source.name === "Casos personales") {
    note = "Fuente bloqueada: los casos personales no forman parte del radar.";
  }
  return { rows, note };
}
function renderSourceNode(source) {
  const status = source.health === "blocked" ? " blocked" : source.health === "degraded" ? " warning" : source.health === "unknown" ? " pending" : " active";
  const coverage = sourceCoverage(source);
  const count = source.name === "Documentos de la entidad"
    ? Number(window.TENANT_DOCUMENT_SUMMARY?.documentCount || 0)
    : coverage.rows.length;
  const items = coverage.rows.map((item) => `<button class="source-preview-item" data-grid-opportunity="${item.id}" type="button"><strong>${item.title}</strong><span>${item.source || source.name} · ${item.deadline || item.deadlineStatus || "Estado por revisar"}</span></button>`).join("");
  return `<details class="source-node${status}">
    <summary><span class="source-node-copy"><strong>${source.name}</strong><span>${source.status}</span></span><b class="source-node-number" aria-label="${count} elementos">${count}</b><i data-lucide="chevron-down"></i></summary>
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
  ` + window.MOCK.sources
    .filter((source) => !isPlatform || !source.scope.toLowerCase().includes("tenant"))
    .map((source) => source.name === "Documentos de la entidad" && window.TENANT_DOCUMENT_SUMMARY?.documentCount
      ? { ...source, status: `${window.TENANT_DOCUMENT_SUMMARY.documentCount} inventariados`, health: "healthy" }
      : source)
    .map(renderSourceNode).join("");
  window.lucide?.createIcons();
}

window.DashboardRenderer = {
  render(dependencies) {
    ({ opportunities, badge, renderStackItem } = dependencies);
    renderDashboard();
  }
};
window.addEventListener("tenant-agent-governance-loaded", (event) => {
  window.TENANT_DOCUMENT_SUMMARY = event.detail?.tenantDocumentSummary || null;
  if (opportunities) renderDashboard();
});
})();
