(function () {
  const names = {
    grant_search: "Busqueda de convocatorias", entity_research: "Investigador de entidad",
    match_agent: "Asistente de encaje", document_review: "Revision documental",
    draft_agent: "Gestor documental", alert_agent: "Avisos y recordatorios"
  };
  function session() { const value = window.CredentialsAuth?.getSession?.(); return value?.role === "entity" && value?.tenantId ? value : null; }
  function cleanText(value) { return String(value || "").replaceAll("\u00c3\u00b3", "\u00f3").replaceAll("\u00c3\u00a1", "\u00e1").replaceAll("\u00c3\u00ad", "\u00ed").replaceAll("\u00c3\u00ba", "\u00fa").replaceAll("\u00c3\u00b1", "\u00f1").replaceAll("\u00c3\u00a9", "\u00e9"); }
  function escapeHtml(value) { return cleanText(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  async function request(path, options = {}) {
    const current = session(); if (!current) throw new Error("Sesión tenant no disponible");
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data;
  }
  function cardFor(agentKey) {
    return [...document.querySelectorAll("#agent-grid .agent-card")]
      .find((card) => card.querySelector("strong")?.textContent.trim() === names[agentKey]);
  }
  function button(label, action, extra = "") { return `<button class="ghost-action" type="button" data-tenant-agent-action="${action}" ${extra}>${label}</button>`; }
  function matchReviewLabel(run) { return run?.review_completed_at ? "Ver decisiones" : run?.review_started_at ? "Continuar revisi\u00f3n" : "Revisar resultados"; }
  function researchStatus(card, run, suggestions, profileReviewState) {
    card.querySelector(".tenant-agent-run-status")?.remove();
    if (!run) return;
    const pending = suggestions.filter((item) => item.status === "pending").length;
    const approved = suggestions.filter((item) => item.status === "approved").length;
    const rejected = suggestions.filter((item) => item.status === "rejected").length;
    const profileApproved = ["approved", "validated", "aprobado"].includes(profileReviewState);
    const labels = {
      queued: ["Investigación en cola", "El proceso alojado recogerá esta petición."],
      preparing_context: ["Analizando la web aprobada", "Se comprueban consentimiento, dominio y límites antes de extraer hechos."],
      review_required: ["Investigación terminada", `${run.output_json?.suggestionIds?.length || 0} sugerencias esperan revisión humana.`],
      failed: ["Investigación fallida", run.error || "Revisa el evento de auditoría antes de reintentar."]
    };
    const content = labels[run.status] || [run.status, "Estado persistido por el proceso de investigación."];
    const displayContent = run.status === "review_required" && !pending
      ? profileApproved
        ? ["RevisiÃ³n completada", `${suggestions.length} sugerencias revisadas: ${approved} aceptadas y ${rejected} descartadas. Perfil aprobado.`]
        : ["Sugerencias revisadas", `${suggestions.length} decisiones registradas. Falta aprobar el perfil.`]
      : content;
    card.insertAdjacentHTML("beforeend", `<div class="plain-note tenant-agent-run-status"><strong>${escapeHtml(displayContent[0])}</strong><span>${escapeHtml(displayContent[1])}</span></div>`);
  }
  function updateCard(agent, governance, researchRuns, suggestions, matchRun) {
    const card = cardFor(agent.agent_key); if (!card) return;
    const contractedAgents = session()?.plan?.agentKeys;
    if (Array.isArray(contractedAgents) && !contractedAgents.includes(agent.agent_key)) {
      card.classList.add("is-disabled"); card.classList.remove("is-active-prototype", "has-required-action");
      card.setAttribute("aria-disabled", "true"); card.querySelector(".tenant-agent-actions")?.remove();
      const excludedStatus = card.querySelector(".agent-status-dot, .badge");
      if (excludedStatus?.classList.contains("agent-status-dot")) { excludedStatus.className = "agent-status-dot review"; excludedStatus.title = "No incluido en el plan contratado"; const reader = excludedStatus.querySelector(".sr-only"); if (reader) reader.textContent = "No incluido"; }
      else if (excludedStatus) { excludedStatus.className = "badge review"; excludedStatus.textContent = "No incluido"; }
      const excludedNote = card.querySelector(".agent-readiness"); if (excludedNote) excludedNote.textContent = "Este asistente no forma parte del plan actual de la entidad.";
      return;
    }
    const tone = agent.status === "ready" ? "safe" : agent.status === "paused" ? "review" : "warning";
    const label = agent.status === "ready" ? "Operativo" : agent.status === "paused" ? "Pausado" : "Bloqueado";
    card.classList.toggle("is-disabled", !agent.enabled); card.classList.toggle("is-active-prototype", agent.enabled);
    const status = card.querySelector(".agent-status-dot, .badge");
    if (status?.classList.contains("agent-status-dot")) { status.className = `agent-status-dot ${tone}`; status.title = `${label}: ${agent.status_reason || "Sin detalle"}`; const reader = status.querySelector(".sr-only"); if (reader) reader.textContent = label; }
    else if (status) { status.className = `badge ${tone}`; status.textContent = label; status.title = agent.status_reason || label; }
    const note = card.querySelector(".agent-readiness"); if (note) note.textContent = agent.status_reason || label;
    card.querySelector(".tenant-agent-actions")?.remove();
    const actions = document.createElement("div"); actions.className = "button-row tenant-agent-actions";
    if (agent.status === "paused") actions.innerHTML = button("Reanudar", "resume", `data-agent-key="${agent.agent_key}"`);
    if (agent.agent_key === "entity_research" && agent.status !== "paused") {
      const consent = governance.consents.find((item) => item.consent_type === "public_web_analysis");
      const source = governance.webSource; const baseUrl = source?.config_json?.base_url;
      const latestRun = researchRuns[0]; const running = ["queued", "preparing_context"].includes(latestRun?.status);
      if (consent?.status !== "granted" && baseUrl) actions.innerHTML = button("Autorizar web pública", "grant-web", `data-base-url="${escapeHtml(baseUrl)}"`);
      else if (source?.status !== "active" && source?.id) actions.innerHTML = button("Aprobar fuente web", "approve-web", `data-source-id="${source.id}"`);
      else if (agent.enabled) actions.innerHTML = running ? button("Investigación en curso", "run-research", "disabled") : button("Investigar ahora", "run-research");
      researchStatus(card, latestRun, suggestions, governance.profileReviewState);
      if (agent.enabled && !running && ["approved", "validated", "aprobado"].includes(governance.profileReviewState)) actions.querySelector("button").textContent = "Buscar cambios en la web";
    }
    if (agent.agent_key === "draft_agent" && agent.status !== "paused") {
      const consent = governance.consents.find((item) => item.consent_type === "ai_processing");
      if (consent?.status !== "granted") actions.innerHTML = button("Autorizar IA para borradores", "grant-ai");
    }
    if (agent.agent_key === "match_agent" && agent.enabled && ["queued", "preparing_context"].includes(matchRun?.status)) actions.innerHTML = button(matchRun.status === "queued" ? "Encaje en cola" : "Calculando encaje", "run-match", "disabled");
    else if (agent.agent_key === "match_agent" && agent.enabled && matchRun?.status === "review_required") actions.innerHTML = button(matchReviewLabel(matchRun), "view-match-results");
    else if (agent.agent_key === "match_agent" && agent.enabled) actions.innerHTML = button(matchRun?.status === "failed" ? "Reintentar encaje" : "Calcular encaje", "run-match");
    else if (agent.agent_key === "match_agent" && suggestions.some((item) => item.status === "pending")) actions.innerHTML = button("Revisar perfil investigado", "review-profile");
    const requiresAction = !agent.enabled && actions.childElementCount > 0;
    card.classList.toggle("has-required-action", requiresAction);
    if (requiresAction) card.removeAttribute("aria-disabled");
    else card.setAttribute("aria-disabled", String(!agent.enabled));
    if (actions.childElementCount) card.append(actions);
  }
  function updateSummary(agents, researchRuns, suggestions) {
    const note = document.querySelector("#agents-readiness-note span"); if (!note) return;
    const latestResearch = researchRuns[0];
    const pendingSuggestions = suggestions.filter((item) => item.status === "pending").length;
    const matchAgent = agents.find((agent) => agent.agent_key === "match_agent");
    const researchText = latestResearch?.status === "review_required"
      ? `Investigación web terminada: ${pendingSuggestions} sugerencias pendientes de revisión.`
      : latestResearch ? `Investigación web: ${latestResearch.status}.` : "Investigación web todavía no ejecutada.";
    const matchText = matchAgent?.enabled
      ? "El perfil está aprobado y ya puede calcularse el encaje."
      : `El encaje aún no está calculado: ${matchAgent?.status_reason || "falta completar el perfil"}.`;
    note.textContent = `${researchText} ${matchText} Las oportunidades visibles hasta entonces son el corpus disponible, no resultados filtrados para la entidad.`;
  }
  function updateEntitySummary(governance) {
    const consent = governance.consents.find((item) => item.consent_type === "public_web_analysis");
    const source = governance.webSource;
    const status = document.querySelector("[data-tenant-web-status]");
    const note = document.querySelector("[data-tenant-web-note]");
    if (!status || !note) return;
    if (consent?.status !== "granted") {
      status.textContent = "No autorizada";
      note.textContent = "La entidad todavía no ha autorizado el análisis de su web pública.";
    } else if (source?.status !== "active") {
      status.textContent = "Pendiente de aprobación";
      note.textContent = "Hay consentimiento, pero la fuente web aún no está aprobada.";
    } else {
      status.textContent = "Autorizada";
      note.textContent = "Solo lectura del dominio público aprobado por la entidad.";
    }
  }
  function updateLifecycleSummary(suggestions, profileReviewState, matchRun) {
    const note = document.querySelector("#agents-readiness-note span"); if (!note) return;
    const pending = suggestions.filter((item) => item.status === "pending").length;
    const approved = suggestions.filter((item) => item.status === "approved").length;
    const rejected = suggestions.filter((item) => item.status === "rejected").length;
    const profileApproved = ["approved", "validated", "aprobado"].includes(profileReviewState);
    if (pending || !profileApproved) return;
    const researchText = `InvestigaciÃ³n y revisiÃ³n completadas: ${approved} sugerencias aceptadas y ${rejected} descartadas; perfil aprobado.`;
    const matchViews = {
      queued: "El encaje estÃ¡ en cola y se actualizarÃ¡ automÃ¡ticamente.",
      preparing_context: "El encaje se estÃ¡ calculando.",
      review_required: `Encaje disponible: ${Number(matchRun?.usage_json?.opportunities || 0)} oportunidades analizadas; los resultados esperan revisiÃ³n humana.`,
      failed: "El encaje no pudo completarse; revisa el aviso antes de reintentar."
    };
    const matchText = matchViews[matchRun?.status] || "El perfil ya puede utilizarse para calcular el encaje.";
    const review = window.TENANT_MATCH_REVIEW_SUMMARY;
    const lifecycleMatchText = review?.state === "completed"
      ? `Revision del encaje completada: ${review.preselected} oportunidades continúan.`
      : review?.state === "in_progress"
        ? `Revision del encaje en curso: ${review.preselectedOnly} preseleccionadas, ${review.documentsPending} con documentos pendientes, ${review.dismissed} descartadas y ${review.pendingActionable} por decidir.`
        : matchText;
    note.textContent = cleanText(`${researchText} ${lifecycleMatchText}`);
  }
  function suggestionMeta(fieldKey) {
    return {
      territory: ["Territorio de actuación", "Zona geográfica identificada en la web pública."],
      logo_candidate: ["Posible logotipo", "Imagen encontrada en la web; comprueba que sea el logotipo oficial."],
      theme: ["Ámbito de actividad", "Tema de trabajo mencionado por la entidad."],
      legal_form: ["Forma jurídica", "Tipo de entidad mencionado en el contenido público."],
      program: ["Programa o servicio", "Línea de actuación ofrecida por la entidad."],
      collective: ["Colectivo destinatario", "Grupo de personas al que se dirige la actividad."]
    }[fieldKey] || [String(fieldKey || "Dato sugerido").replaceAll("_", " "), "Dato encontrado en la fuente pública."];
  }
  function confidenceMeta(confidence) {
    return {
      high: ["Confianza alta", "safe"],
      medium: ["Confianza media", "review"],
      low: ["Confianza baja", "warning"]
    }[confidence] || ["Confianza por revisar", "review"];
  }
  function logoPreview(item) {
    if (item.field_key !== "logo_candidate") return "";
    try {
      const imageUrl = new URL(item.suggested_value);
      const evidenceUrl = new URL(item.source_ref);
      if (imageUrl.protocol !== "https:" || imageUrl.hostname !== evidenceUrl.hostname) return "";
      const safeUrl = escapeHtml(imageUrl.href);
      return `<figure class="suggestion-logo-preview"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" title="Abrir imagen completa"><img src="${safeUrl}" alt="Vista previa del posible logotipo" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></a><figcaption>Vista previa encontrada en la web pública. Comprueba que sea el logotipo oficial antes de aceptarla.</figcaption></figure>`;
    } catch { return ""; }
  }
  function renderSuggestions(suggestions, profileReviewState, matchRun) {
    document.querySelector("#tenant-profile-review")?.remove();
    if (!suggestions.length) return;
    const pending = suggestions.filter((item) => item.status === "pending");
    const panel = document.createElement("article"); panel.id = "tenant-profile-review"; panel.className = "panel";
    if (["approved", "validated", "aprobado"].includes(profileReviewState)) {
      const approved = suggestions.filter((item) => item.status === "approved").length;
      const rejected = suggestions.filter((item) => item.status === "rejected").length;
      const views = {
        queued: ["warning", "En cola", "clock-3", "Cálculo de encaje en cola", "La solicitud está registrada. La pantalla se actualizará automáticamente cuando empiece y cuando termine.", "Encaje en cola", "run-match", "disabled"],
        preparing_context: ["review", "Calculando", "loader-circle", "Calculando el encaje", "Se está comparando el perfil aprobado con las oportunidades vigentes y su evidencia.", "Calculando encaje", "run-match", "disabled"],
        review_required: ["safe", "Resultado disponible", "circle-check-big", "Encaje calculado", `${Number(matchRun?.usage_json?.opportunities || 0)} oportunidades analizadas. Los resultados esperan revisión humana.`, "Ver resultados", "view-match-results", ""],
        failed: ["danger", "Requiere atención", "triangle-alert", "No se pudo calcular el encaje", escapeHtml(matchRun?.error || "Revisa la auditoría antes de reintentar."), "Reintentar encaje", "run-match", ""]
      };
      const view = views[matchRun?.status] || ["safe", "Completado", "badge-check", "Perfil preparado para el encaje", `${approved} sugerencias aceptadas y ${rejected} descartadas. El Asistente de encaje ya puede utilizar únicamente el perfil revisado.`, "Calcular encaje", "run-match", ""];
      panel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Revisión humana completada</p><h2>Perfil de entidad aprobado</h2></div><span class="badge ${view[0]}">${view[1]}</span></div>
        <div class="plain-note profile-approval-complete"><strong><i data-lucide="${view[2]}"></i>${view[3]}</strong><span>${view[4]}</span></div>
        <div class="button-row"><button class="primary-action" type="button" data-tenant-agent-action="${view[6]}" ${view[7]}><i data-lucide="git-compare-arrows"></i>${view[5]}</button></div>`;
      if (matchRun?.status === "review_required") {
        const label = matchReviewLabel(matchRun);
        const review = window.TENANT_MATCH_REVIEW_SUMMARY;
        panel.querySelector(".panel-heading .badge").textContent = matchRun.review_completed_at ? "Revisi\u00f3n completada" : matchRun.review_started_at ? "Revisi\u00f3n en curso" : "Resultado disponible";
        if (review?.state === "in_progress") panel.querySelector(".profile-approval-complete span").textContent = `${review.preselectedOnly} preseleccionadas, ${review.documentsPending} con documentos pendientes, ${review.dismissed} descartadas y ${review.pendingActionable} por decidir.`;
        if (review?.state === "completed") panel.querySelector(".profile-approval-complete span").textContent = `Revisi\u00f3n prioritaria completada. ${review.preselected} oportunidades contin\u00faan.`;
        panel.querySelector('[data-tenant-agent-action="view-match-results"]').innerHTML = `<i data-lucide="git-compare-arrows"></i>${label}`;
      }
      document.querySelector("#agent-grid")?.insertAdjacentElement("afterend", panel);
      return;
    }
    const reviewContent = pending.length
      ? `<div class="stack-list">${pending.map((item) => { const field = suggestionMeta(item.field_key); const confidence = confidenceMeta(item.confidence); return `<div class="stack-item"><div class="opportunity-topline"><div><strong>${escapeHtml(field[0])}</strong><small>${escapeHtml(field[1])}</small></div><span class="badge ${confidence[1]}">${confidence[0]}</span></div>${logoPreview(item)}<span>${escapeHtml(item.suggested_value)}</span><small>${escapeHtml(item.evidence_excerpt || "Sin fragmento de evidencia")}</small><div class="button-row"><a class="ghost-action" href="${escapeHtml(item.source_ref)}" target="_blank" rel="noopener noreferrer">Ver evidencia</a>${button("Aceptar sugerencia", "approve-suggestion", `data-suggestion-id="${item.id}"`)}${button("Descartar sugerencia", "reject-suggestion", `data-suggestion-id="${item.id}"`)}</div></div>`; }).join("")}</div>`
      : '<div class="plain-note"><strong>Revisión terminada</strong><span>Todas las sugerencias tienen una decisión. Ya puede aprobarse el perfil que utilizará el encaje.</span></div>';
    panel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Revisión humana</p><h2>Sugerencias del Investigador</h2></div><span class="badge ${pending.length ? "warning" : "safe"}">${pending.length ? `${pending.length} pendientes` : "Revisadas"}</span></div>
      ${reviewContent}<div class="button-row">${button(pending.length ? `Revisa las ${pending.length} pendientes` : "Aprobar perfil revisado", "approve-profile", pending.length ? "disabled" : "")}</div>`;
    document.querySelector("#agent-grid")?.insertAdjacentElement("afterend", panel);
  }
  async function refresh() {
    if (!session()) return;
    try {
      const [governance, suggestions, researchRuns] = await Promise.all([request("/api/tenant-agent-governance"), request("/api/tenant-profile-review"), request("/api/entity-research-runs")]);
      const matchRun = window.TENANT_MATCH_STATE;
      governance.agents.forEach((agent) => updateCard(agent, governance, researchRuns, suggestions, matchRun)); updateSummary(governance.agents, researchRuns, suggestions); updateLifecycleSummary(suggestions, governance.profileReviewState, matchRun); updateEntitySummary(governance); renderSuggestions(suggestions, governance.profileReviewState, matchRun); window.dispatchEvent(new CustomEvent("tenant-agent-governance-loaded", { detail: governance })); window.lucide?.createIcons();
    } catch (error) { const note = document.querySelector("#agents-readiness-note span"); if (note) note.textContent = `Estado operativo no disponible: ${error.message}`; }
  }
  async function act(element) {
    const action = element.dataset.tenantAgentAction; if (!action) return; element.disabled = true;
    try {
      if (action === "review-profile") { document.querySelector("#tenant-profile-review")?.scrollIntoView({ behavior: "smooth", block: "start" }); element.disabled = false; return; }
      if (action === "view-match-results") { await window.TenantMatchReview?.start(); document.querySelector('[data-screen="opportunities"]')?.click(); element.disabled = false; return; }
      if (action === "grant-web") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "grant_consent", consentType: "public_web_analysis", scope: { baseUrl: element.dataset.baseUrl, sameDomainOnly: true } }) });
      if (action === "grant-ai") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "grant_consent", consentType: "ai_processing", scope: { provider: "openai", store: false, allowedDataClasses: ["public"] } }) });
      if (action === "approve-web") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "approve_public_web_source", sourceId: element.dataset.sourceId }) });
      if (action === "resume") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "resume_agent", agentKey: element.dataset.agentKey }) });
      if (action === "run-research") await request("/api/entity-research-runs", { method: "POST", body: "{}" });
      if (action === "run-match") { const result = await request("/api/tenant-match-runs", { method: "POST", body: "{}" }); window.TENANT_MATCH_STATE = result.run; window.dispatchEvent(new CustomEvent("tenant-match-state", { detail: result.run })); }
      if (["approve-suggestion", "reject-suggestion"].includes(action)) await request("/api/tenant-profile-review", { method: "PATCH", body: JSON.stringify({ reviews: [{ id: element.dataset.suggestionId, status: action === "approve-suggestion" ? "approved" : "rejected" }] }) });
      if (action === "approve-profile") await request("/api/tenant-profile-review", { method: "PATCH", body: JSON.stringify({ approveProfile: true }) });
      const successMessage = action === "run-research" ? "Investigación encolada. El estado se actualizará en esta tarjeta."
        : action === "approve-profile" ? "Perfil aprobado. Ya puedes calcular el encaje."
          : action === "run-match" ? "Cálculo de encaje encolado. Podrás revisar el resultado cuando termine."
            : "Operación registrada y auditada.";
      if (typeof showToast === "function") showToast(successMessage); await refresh();
    } catch (error) { if (typeof showToast === "function") showToast(error.message); element.disabled = false; }
  }
  document.addEventListener("click", (event) => { const target = event.target instanceof Element ? event.target.closest("[data-tenant-agent-action]") : null; if (target) act(target); });
  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0));
  window.addEventListener("tenant-match-state", () => setTimeout(refresh, 0));
  setTimeout(refresh, 0);
  setInterval(() => { if (location.hash === "#view-agents") refresh(); }, 12000);
})();
