(function () {
  const state = { data: null, bases: [], basesError: "", candidates: [], candidatesError: "", opportunities: [], opportunitiesMeta: null, opportunitiesError: "", loading: false, error: "" };
  const activeRunStates = new Set(["queued", "preparing_context", "awaiting_provider", "generating", "running"]);

  function session() {
    const value = window.CredentialsAuth?.getSession?.();
    return value?.role === "superadmin" && value?.accessToken ? value : null;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function badge(text, tone = "review") { return `<span class="badge ${tone}">${escapeHtml(text)}</span>`; }
  function tone(status) {
    if (["active", "ready", "completed", "healthy"].includes(status)) return "safe";
    if (["failed", "error", "blocked", "degraded"].includes(status)) return "warning";
    return "review";
  }
  function date(value) { return value ? new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Sin ejecución"; }
  function safeLink(value) { try { const url = new URL(String(value || "")); return url.protocol === "https:" ? url.href : "#"; } catch { return "#"; } }
  function organizationMap(data) { return new Map(data.organizations.map((item) => [item.id, item])); }
  async function request(path, options = {}) {
    const current = session(); if (!current) throw new Error("Sesión superadmin no disponible");
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...window.CredentialsAuth.authHeaders(current), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data;
  }
  function renderDashboard(data) {
    const map = data.nationalOpportunityMap;
    if (map) {
      const rows = map.territories || [];
      const total = (field) => rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0) + (Number(map.nationalScope?.[field]) || 0);
      const values = [
        ["Presencias territoriales BDNS", total("indexed"), "Una convocatoria multi-territorio aparece en cada comunidad declarada"],
        ["Abiertas verificadas por ámbito", total("openVerified"), "Plazo vigente, confianza alta/media y URL HTTPS"],
        ["Pendientes de revisión", total("pendingReview"), "Eventos persistidos de revisión humana"],
        ["Actualización del mapa", date(map.generatedAt), "Ámbito estatal separado; no se duplica por comunidad"]
      ];
      document.querySelectorAll("#dashboard .metric").forEach((metric, index) => {
        metric.querySelector("span").textContent = values[index][0]; metric.querySelector("strong").textContent = values[index][1]; metric.querySelector("small").textContent = values[index][2];
      });
      document.querySelector("#alerts-list").innerHTML = [
        { title: "Índice canónico", detail: map.rules?.canonicalSource || "Sin lectura persistida de oportunidades." },
        { title: "Regla territorial", detail: map.rules?.territory || "Sin datos territoriales para clasificar." },
        { title: "Evidencia y revisión", detail: map.rules?.openVerified || "No se verifican oportunidades sin evidencia persistida." }
      ].map((item) => `<div class="stack-item"><strong>${item.title}</strong><span>${item.detail}</span></div>`).join("");
      renderSourceMap(map); renderPrivateCoverage();
      return;
    }
    const unavailableValues = [
      ["Presencias territoriales BDNS", "—", "Lectura persistida no disponible"],
      ["Abiertas verificadas por ámbito", "—", "No se infieren datos desde el catálogo de fuentes"],
      ["Pendientes de revisión", "—", "Sin estado persistido de revisión humana"],
      ["Actualización del mapa", "Sin datos", "La API de plataforma no ha respondido"]
    ];
    document.querySelectorAll("#dashboard .metric").forEach((metric, index) => {
      metric.querySelector("span").textContent = unavailableValues[index][0]; metric.querySelector("strong").textContent = unavailableValues[index][1]; metric.querySelector("small").textContent = unavailableValues[index][2];
    });
    document.querySelector("#alerts-list").innerHTML = '<div class="stack-item"><strong>Mapa nacional sin datos</strong><span>No se muestran conteos de catálogo ni oportunidades de ejemplo mientras la lectura persistida no esté disponible.</span></div>';
    renderSourceMap(null, "Lectura persistida no disponible"); renderPrivateCoverage();
  }
  function renderSourceMap(readModel, error = "") {
    const target = document.querySelector("#source-map"); if (!target) return;
    if (error) { target.innerHTML = `<div class="plain-note"><strong>Estado de fuentes no disponible</strong><span>${escapeHtml(error)}. No se muestran cifras de ejemplo.</span></div>`; return; }
    if (window.NationalSourceCatalogUI) { window.NationalSourceCatalogUI.renderSourceMap(target, readModel || {}); return; }
    target.innerHTML = '<div class="empty-state">No hay lectura nacional persistida.</div>';
  }
  function renderPrivateCoverage() {
    const target = document.querySelector("#private-coverage"); if (!target) return;
    if (state.loading && !state.opportunitiesMeta) { target.innerHTML = '<div class="empty-state">Cargando inventario privado persistido.</div>'; return; }
    if (state.opportunitiesError) { target.innerHTML = `<div class="empty-state"><strong>Sin datos privados disponibles</strong><span>${escapeHtml(state.opportunitiesError)}. La lectura no usa cifras de ejemplo.</span></div>`; return; }
    if (!state.opportunitiesMeta) { target.innerHTML = '<div class="empty-state"><strong>Sin datos privados disponibles</strong><span>La lectura global todavía no ha respondido.</span></div>'; return; }
    if (state.opportunitiesMeta.privateCandidatesState !== "available") { target.innerHTML = '<div class="empty-state"><strong>Sin datos privados disponibles</strong><span>La tabla de candidatas privadas no está activa en este entorno.</span></div>'; return; }
    const candidates = state.opportunities.filter((item) => item.recordKind === "private_source_candidate");
    const privateOpportunities = state.opportunities.filter((item) => item.recordKind === "opportunity" && String(item.sourceScope || "").startsWith("Privada"));
    const groups = [
      ["Entidades privadas detectadas", privateOpportunities, "Posibles financiadores localizados. No son todavía convocatorias ni recomendaciones."],
      ["Fuentes privadas verificadas", candidates.filter((item) => item.sourceScope === "Privada verificada / no publicable"), "Fuente comprobada técnicamente; todavía no implica una convocatoria."],
      ["Convocatorias privadas verificadas", candidates.filter((item) => String(item.sourceScope).includes("publicable")), "Bases y vigencia suficientes para entrar en inventario; el encaje lo decide el especialista del tenant."],
      ["Excepciones técnicas pendientes", candidates.filter((item) => String(item.sourceScope).includes("tracked")), "Falta evidencia objetiva de bases, vigencia o procedencia. No requieren aprobación de contenido por superadmin."]
    ];
    const preview = (items) => items.slice(0, 3).map((item) => `<li>${escapeHtml(item.title)}<small>${escapeHtml(item.evidenceQuality || "Evidencia pendiente")} · ${escapeHtml(item.provenance?.updatedAt ? date(item.provenance.updatedAt) : "Sin fecha")}</small></li>`).join("") || "<li>Sin registros persistidos.</li>";
    const detected = privateOpportunities.length;
    const verified = groups[2][1].length;
    target.innerHTML = `<details class="source-map-info"><summary><i data-lucide="info"></i><span>Cómo leer la financiación privada</span></summary><div><p>${detected} entidades detectadas · ${verified} convocatorias privadas verificadas.</p><p>El radar comprueba fuentes, bases y vigencia. El superadministrador supervisa excepciones técnicas; los especialistas de cada entidad deciden el encaje.</p></div></details><div class="source-map private-coverage-map">${groups.map(([title, items, note]) => `<details class="source-node ${items.length ? "active" : "pending"}"><summary><span class="source-node-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></span><b aria-label="Registros">${items.length}</b><i data-lucide="chevron-down"></i></summary><div class="source-node-preview"><ul>${preview(items)}</ul></div></details>`).join("")}</div>`;
    window.lucide?.createIcons();
  }
  function renderAgents(data) {
    const orgs = organizationMap(data);
    document.querySelector("#agents-readiness-note span").textContent = "Estado persistido del catálogo común y de la activación aislada de cada tenant. La plataforma no abre documentos ni contexto privado.";
    document.querySelector("#agents-status-legend")?.remove();
    document.querySelector("#agent-grid").innerHTML = data.agentDefinitions.map((definition) => {
      const configs = data.tenantAgents.filter((item) => item.agent_key === definition.agent_key);
      const ready = configs.filter((item) => item.enabled && item.status === "ready").length;
      const blocked = configs.filter((item) => item.status === "blocked").length;
      const status = definition.scope === "platform" ? "Activo en plataforma" : `${ready}/${data.organizations.length} tenants operativos`;
      return `<article class="agent-card"><div class="agent-icon"><i data-lucide="bot"></i></div><div class="opportunity-topline"><strong>${escapeHtml(definition.display_name)}</strong>${badge(status, ready || definition.scope === "platform" ? "safe" : "review")}</div><p>${definition.execution_mode === "scheduled" ? "Ejecución programada" : definition.execution_mode === "both" ? "Programado y bajo demanda" : "Ejecución bajo demanda"}</p><span>${definition.requires_human_review ? "Salida con revisión humana" : "Salida operativa sin decisión automática"}${blocked ? ` · ${blocked} bloqueados` : ""}</span></article>`;
    }).join("");
    const recent = data.agentRuns.slice(0, 20);
    const runs = document.querySelector("#agent-runs");
    runs.closest(".panel").querySelector("h2").textContent = "Últimas ejecuciones reales";
    runs.closest(".panel").querySelector(".agent-panel-note")?.remove();
    runs.innerHTML = recent.length ? recent.map((run) => `<div class="stack-item"><div class="opportunity-topline"><strong>${escapeHtml(run.agent_key)}</strong>${badge(run.status, tone(run.status))}</div><span>${escapeHtml(orgs.get(run.tenant_id)?.name || "Tenant no disponible")} · ${date(run.created_at)}</span></div>`).join("") : '<div class="empty-state">Todavía no hay ejecuciones persistidas.</div>';
    const channelPanel = document.querySelector("#agents .channel-list")?.closest(".panel");
    if (channelPanel) { channelPanel.querySelector("h2").textContent = "Límite administrativo"; channelPanel.querySelector(".channel-list").innerHTML = '<div><i data-lucide="shield-check"></i><strong>Metadatos operativos</strong><span>Estados, colas, errores y costes; sin documentos, hechos internos ni borradores tenant.</span></div>'; }
  }
  function renderAudit(data) {
    const orgs = organizationMap(data); const target = document.querySelector("#audit-timeline");
    document.querySelector("#audit .panel-heading h2").textContent = "Auditoría global por tenant";
    const exportButton = document.querySelector("[data-audit-export]"); if (exportButton) { exportButton.removeAttribute("data-audit-export"); exportButton.dataset.platformAuditExport = ""; exportButton.textContent = "Exportar metadatos (.csv)"; }
    target.innerHTML = `<div class="plain-note"><strong>${data.auditEvents.length} eventos operativos</strong><span>Vista transversal sin detalle privado del evento. Cada registro conserva tenant, actor, acción, recurso y fecha.</span></div><div class="audit-table" role="table"><div class="audit-grid-row audit-grid-header" role="row"><span>Fecha</span><span>Tenant</span><span>Actor</span><span>Acción</span><span>Recurso</span></div>${data.auditEvents.map((item) => `<div class="audit-grid-row" role="row"><time>${date(item.created_at)}</time><strong>${escapeHtml(orgs.get(item.tenant_id)?.name || item.tenant_id)}</strong><span>${escapeHtml(item.actor_label)}</span><span>${escapeHtml(item.action)}</span><span>${escapeHtml(item.target_type)}</span></div>`).join("") || '<div class="empty-state">No hay eventos persistidos.</div>'}</div>`;
  }
  function latestCampaign(data, sourceId) { return data.ingestionCampaigns.find((item) => item.platform_source_id === sourceId); }
  function runnableSource(source) {
    return ["https://www.infosubvenciones.es/bdnstrans/api#municipal-social", "https://www.infosubvenciones.es/bdnstrans/api#general-social", "https://subvenciones-rag.vercel.app/sources#private-open-funders"].includes(source.url);
  }
  function renderReviews(data) {
    document.querySelector("[data-platform-pane='reviews'] .panel-heading h2").textContent = "Estado operativo del radar";
    document.querySelector("#platform-campaigns").innerHTML = data.platformSources.filter(runnableSource).map((source) => {
      const campaign = latestCampaign(data, source.id);
      const status = campaign?.status || "sin cola técnica";
      const cause = campaign?.error ? `Causa operativa: ${campaign.error}` : campaign ? "Causa operativa: revisión técnica persistida de esta fuente" : "No hay excepción ni revisión técnica en cola para esta fuente.";
      const nextOwner = campaign && activeRunStates.has(campaign.status) ? "Siguiente responsable: worker técnico del radar." : campaign?.status === "failed" ? "Siguiente responsable: operación técnica del radar." : "Siguiente responsable: monitorización automática.";
      return `<div class="stack-item"><div class="opportunity-topline"><div><strong>${escapeHtml(source.label)}</strong><span>Origen: ${escapeHtml(source.kind)} · última sincronización: ${date(source.last_synced_at)}</span></div>${badge(campaign && activeRunStates.has(campaign.status) ? "Excepción técnica en curso" : source.health_status, tone(campaign?.status || source.health_status))}</div><div class="source-state-line"><span>Estado: ${escapeHtml(status)} · Fecha: ${campaign ? date(campaign.created_at) : "sin registro"} · ${escapeHtml(cause)} · ${nextOwner}</span></div></div>`;
    }).join("") || '<div class="empty-state">No hay fuentes de plataforma registradas.</div>';
    renderPrivateCandidates();
  }
  function evidenceSummary(candidate) {
    const fields = Object.values(candidate.convocation_evidence_json || {});
    const evidenced = fields.filter((item) => item?.state === "evidenced").length;
    const uncertain = fields.filter((item) => item?.state === "uncertain").length;
    return `${evidenced} campos con evidencia${uncertain ? ` · ${uncertain} inciertos` : ""}`;
  }
  function candidateActions(candidate) {
    return "";
  }
  function renderPrivateCandidates() {
    const target = document.querySelector("#platform-private-source-candidates"); if (!target) return;
    if (state.candidatesError) { target.innerHTML = `<div class="plain-note"><strong>Cola no disponible</strong><span>${escapeHtml(state.candidatesError)}. No se habilita rastreo ni publicación.</span></div>`; return; }
    target.innerHTML = state.candidates.length ? state.candidates.map((candidate) => {
      const reasons = candidate.auto_validation_json?.reasons || [];
      const cause = reasons.length ? reasons.join(", ") : candidate.review_note || "validación automática incompleta";
      const origin = candidate.provenance_json?.source_url || candidate.official_url;
      return `<article class="stack-item"><div class="opportunity-topline"><div><strong>${escapeHtml(candidate.organization_name)}</strong><span>Origen: ${escapeHtml(origin)} · ${escapeHtml(candidate.funder_type)} · ${escapeHtml(candidate.territory || "Territorio pendiente")}</span></div>${badge("Excepción técnica", "warning")}</div><span>Estado: pendiente de comprobación objetiva · Fecha: ${date(candidate.updated_at)} · Causa operativa: ${escapeHtml(cause)}</span><span><a href="${escapeHtml(safeLink(candidate.official_url))}" target="_blank" rel="noopener">Web oficial</a> · ${escapeHtml(evidenceSummary(candidate))} · Siguiente responsable: operación técnica del radar.</span><span>Sin publicación, alertas, recomendación a clientes ni decisión sobre elegibilidad.</span></article>`;
    }).join("") : '<div class="empty-state">Sin excepciones técnicas persistidas de fuentes privadas. No se muestra una cola simulada.</div>';
  }
  const basisLabels = { beneficiaries: "Quien puede solicitar", eligibilityRequirements: "Requisitos", eligibleActivities: "Actuaciones financiables", requiredDocuments: "Documentos obligatorios", evaluationCriteria: "Criterios", budgetRules: "Presupuesto", submission: "Presentacion", obligations: "Obligaciones", exclusions: "Exclusiones" };
  const essentialBasisKeys = ["beneficiaries", "eligibleActivities", "requiredDocuments", "submission"];
  function renderBasesReviews() {
    const target = document.querySelector("#platform-bases-reviews"); if (!target) return;
    if (state.basesError) { target.innerHTML = `<div class="plain-note"><strong>Revision de bases no disponible</strong><span>${escapeHtml(state.basesError)}</span></div>`; return; }
    const exceptions = state.bases.filter((item) => !item.citations_verified || item.error);
    target.innerHTML = exceptions.map((item) => {
      const version = Array.isArray(item.platform_opportunity_versions) ? item.platform_opportunity_versions[0] : item.platform_opportunity_versions;
      const opportunity = Array.isArray(version?.platform_opportunities) ? version.platform_opportunities[0] : version?.platform_opportunities;
      const artifact = Array.isArray(item.platform_source_artifacts) ? item.platform_source_artifacts[0] : item.platform_source_artifacts;
      const sections = item.contract_json?.sections || {};
      const covered = Object.entries(sections).filter(([, clauses]) => clauses?.length);
      const essentialCovered = essentialBasisKeys.filter((key) => (sections[key] || []).some((clause) => clause.coreEvidence));
      const constraints = item.contract_json?.proposalConstraints || { limits: [], formatRules: [] };
      const requirementEvidence = covered.flatMap(([key, clauses]) => clauses.slice(0, 1).map((clause) => `<li><strong>${escapeHtml(basisLabels[key] || key)}</strong><span>${escapeHtml(clause.text || clause.evidenceExcerpt || "Sin fragmento")}</span><small>Pagina ${escapeHtml(clause.sourcePage ?? "HTML")} · ${clause.coreEvidence ? "clausula nuclear" : "mencion contextual"} · confianza ${escapeHtml(clause.confidence || "pendiente")}</small></li>`));
      const constraintEvidence = [...(constraints.limits || []), ...(constraints.formatRules || [])].map((clause) => `<li><strong>Limite o formato</strong><span>${escapeHtml(clause.documentType ? `${clause.documentType}: ${clause.value} ${clause.unit}` : `${clause.kind}: ${clause.value}`)}</span><small>Pagina ${escapeHtml(clause.sourcePage ?? "HTML")} · ${escapeHtml(clause.evidenceExcerpt || "Cita pendiente")}</small></li>`);
      const evidence = [...requirementEvidence, ...constraintEvidence].slice(0, 12).join("");
      return `<article class="stack-item bases-review-card"><div class="opportunity-topline"><div><strong>${escapeHtml(opportunity?.title || "Convocatoria sin titulo")}</strong><span>${escapeHtml(opportunity?.funder_name || "Organismo pendiente")} · ${essentialCovered.length}/4 esenciales · ${covered.length}/9 apartados · ${(constraints.limits || []).length} limites de redaccion</span></div>${badge(item.citations_verified ? "Citas verificadas" : "Citas pendientes", item.citations_verified ? "safe" : "warning")}</div><ul class="basis-evidence-list">${evidence || "<li>Sin requisitos extraidos.</li>"}</ul><div class="source-state-line"><a href="${escapeHtml(safeLink(artifact?.source_url || version?.bases_url || version?.source_url))}" target="_blank" rel="noopener">Abrir bases oficiales</a><div class="button-row"><button class="ghost-action" data-bases-review-action="reject" data-bases-interpretation="${item.id}" type="button">Descartar lectura</button><button class="primary-action" data-bases-review-action="approve" data-bases-interpretation="${item.id}" type="button" ${item.citations_verified ? "" : "disabled"}>Aprobar interpretacion</button></div></div></article>`;
    }).join("") || '<div class="empty-state">No hay excepciones de evidencia pendientes. Las extracciones con citas completas se conservan para el flujo de revisión de aplicabilidad del tenant.</div>';
  }
  function renderOperations(data) {
    const queued = [...data.agentRuns, ...data.ingestionCampaigns].filter((item) => activeRunStates.has(item.status)).length;
    const failures = data.agentRuns.filter((item) => item.status === "failed").length + data.ingestionCampaigns.filter((item) => item.status === "failed").length;
    const values = [["Tenants activos", data.tenantConfigs.filter((item) => item.status === "active").length, "Configuración persistida"], ["Trabajos en cola", queued, "Agentes tenant y campañas públicas"], ["Errores recientes", failures, "Últimas 200 ejecuciones tenant y 100 campañas"], ["Fuentes degradadas", data.platformSources.filter((item) => ["degraded", "error"].includes(item.health_status)).length, "Estado declarado por conectores"]];
    document.querySelectorAll("#operations .metric").forEach((metric, index) => { metric.querySelector("span").textContent = values[index][0]; metric.querySelector("strong").textContent = values[index][1]; metric.querySelector("small").textContent = values[index][2]; });
    document.querySelector("#operations-jobs").innerHTML = data.ingestionCampaigns.slice(0, 15).map((item) => `<div class="stack-item"><div class="opportunity-topline"><strong>Campaña ${escapeHtml(item.campaign_key || item.id)}</strong>${badge(item.status, tone(item.status))}</div><span>${date(item.created_at)} · leídas ${item.scanned} · cambiadas ${item.changed} · fallidas ${item.failed}</span></div>`).join("") || '<div class="empty-state">No hay campañas persistidas.</div>';
    document.querySelector("#operations-health").innerHTML = data.platformSources.map((item) => `<div class="stack-item"><div class="opportunity-topline"><strong>${escapeHtml(item.label)}</strong>${badge(item.health_status, tone(item.health_status))}</div><span>${escapeHtml(item.status)} · ${date(item.last_synced_at)}</span></div>`).join("");
    const capacity = document.querySelector("#operations .capacity-grid"); if (capacity) capacity.innerHTML = `<div><span>Fuentes registradas</span><strong>${data.platformSources.length}</strong></div><div><span>Ejecuciones tenant</span><strong>${data.agentRuns.length}</strong></div><div><span>Campañas públicas</span><strong>${data.ingestionCampaigns.length}</strong></div><div><span>Eventos auditados</span><strong>${data.auditEvents.length}</strong></div>`;
  }
  function renderTenants(data) {
    const configs = new Map(data.tenantConfigs.map((item) => [item.tenant_id, item]));
    window.TenantGrid?.render(data.organizations.map((organization) => ({
      title: organization.name, slug: organization.slug, createdAt: organization.created_at,
      status: configs.get(organization.id)?.status || "unconfigured"
    })));
  }
  function render() {
    if (!state.data) return; renderDashboard(state.data); renderAgents(state.data); renderAudit(state.data); renderReviews(state.data); renderOperations(state.data); renderTenants(state.data);
    const globalAction = document.querySelector(".top-actions .primary-action"); if (globalAction) globalAction.style.display = "none";
    const refreshButton = document.querySelector("#refresh-button"); if (refreshButton) refreshButton.title = "Actualizar estado real";
    window.lucide?.createIcons();
  }
  async function refresh() {
    if (!session() || state.loading) return; state.loading = true; renderSourceMap(null, "Cargando estado persistido");
    try {
      state.data = await request("/api/admin-platform-overview"); state.error = "";
      window.dispatchEvent(new Event("platform-overview-loaded"));
      try {
        const result = await request("/api/admin-platform-opportunities");
        state.opportunities = result.items || []; state.opportunitiesMeta = result; state.opportunitiesError = "";
        window.PLATFORM_GLOBAL_OPPORTUNITIES = state.opportunities;
      } catch (error) {
        state.opportunities = []; state.opportunitiesMeta = null; state.opportunitiesError = error.message;
        window.PLATFORM_GLOBAL_OPPORTUNITIES = [];
      }
      window.dispatchEvent(new Event("platform-global-opportunities-loaded"));
      try { const result = await request("/api/admin-private-source-candidates?status=pending_review"); state.candidates = result.candidates || []; state.candidatesError = ""; }
      catch (error) { state.candidates = []; state.candidatesError = error.message; }
      render();
    }
    catch (error) {
      state.error = error.message; state.candidates = []; state.candidatesError = error.message; state.opportunitiesMeta = null; state.opportunitiesError = error.message; window.PLATFORM_GLOBAL_OPPORTUNITIES = [];
      window.dispatchEvent(new Event("platform-global-opportunities-loaded"));
      renderDashboard({});
      renderSourceMap(null, error.message); renderPrivateCandidates();
      const campaigns = document.querySelector("#platform-campaigns");
      if (campaigns) campaigns.innerHTML = '<div class="empty-state">Revisiones no disponibles: no se muestran campañas de ejemplo.</div>';
      window.showToast?.(`Estado global no disponible: ${error.message}`);
    }
    state.loading = false;
  }
  async function runSource(button) {
    button.disabled = true;
    try { await request("/api/admin-platform-campaigns", { method: "POST", body: JSON.stringify({ platformSourceId: button.dataset.platformSourceRun }) }); window.showToast?.("Revisión encolada; el worker diario la recogerá y conserva el superadmin solicitante."); await refresh(); }
    catch (error) { window.showToast?.(error.message); button.disabled = false; }
  }
  async function reviewBases(button) {
    button.disabled = true;
    try {
      const result = await request("/api/admin-bases-interpretations", { method: "PATCH", body: JSON.stringify({ interpretationId: button.dataset.basesInterpretation, action: button.dataset.basesReviewAction }) });
      window.showToast?.(result.message); await refresh();
    } catch (error) { window.showToast?.(error.message); button.disabled = false; }
  }
  async function reviewPrivateCandidate(button) {
    button.disabled = true;
    try { const result = await request("/api/admin-private-source-candidates", { method: "PATCH", body: JSON.stringify({ candidateId: button.dataset.privateSourceId, action: button.dataset.privateSourceAction }) }); window.showToast?.(result.message); await refresh(); }
    catch (error) { window.showToast?.(error.message); button.disabled = false; }
  }
  function exportAudit() {
    if (!state.data?.auditEvents.length) return;
    const orgs = organizationMap(state.data); const rows = [["Fecha", "Tenant", "Actor", "Acción", "Recurso"], ...state.data.auditEvents.map((item) => [item.created_at, orgs.get(item.tenant_id)?.name || item.tenant_id, item.actor_label, item.action, item.target_type])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")).join("\r\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = `auditoria-plataforma-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
  document.addEventListener("click", (event) => { const run = event.target.closest?.("[data-platform-source-run]"); if (run) runSource(run); const candidate = event.target.closest?.("[data-private-source-action]"); if (candidate) reviewPrivateCandidate(candidate); if (event.target.closest?.("[data-platform-audit-export]")) exportAudit(); });
  window.PlatformRuntime = { refresh };
  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0)); window.addEventListener("hashchange", () => { if (session()) setTimeout(render, 0); }); setTimeout(refresh, 0);
})();
