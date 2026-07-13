(function () {
  const names = {
    grant_search: "Busqueda de convocatorias", entity_research: "Investigador de entidad",
    match_agent: "Asistente de encaje", document_review: "Revision documental",
    draft_agent: "Gestor documental", alert_agent: "Avisos y recordatorios"
  };
  function session() { const value = window.CredentialsAuth?.getSession?.(); return value?.role === "entity" && value?.tenantId ? value : null; }
  function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
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
  function researchStatus(card, run) {
    card.querySelector(".tenant-agent-run-status")?.remove();
    if (!run) return;
    const labels = {
      queued: ["Investigación en cola", "El proceso alojado recogerá esta petición."],
      preparing_context: ["Analizando la web aprobada", "Se comprueban consentimiento, dominio y límites antes de extraer hechos."],
      review_required: ["Investigación terminada", `${run.output_json?.suggestionIds?.length || 0} sugerencias esperan revisión humana.`],
      failed: ["Investigación fallida", run.error || "Revisa el evento de auditoría antes de reintentar."]
    };
    const content = labels[run.status] || [run.status, "Estado persistido por el proceso de investigación."];
    card.insertAdjacentHTML("beforeend", `<div class="plain-note tenant-agent-run-status"><strong>${escapeHtml(content[0])}</strong><span>${escapeHtml(content[1])}</span></div>`);
  }
  function updateCard(agent, governance, researchRuns, suggestions) {
    const card = cardFor(agent.agent_key); if (!card) return;
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
      researchStatus(card, latestRun);
    }
    if (agent.agent_key === "draft_agent" && agent.status !== "paused") {
      const consent = governance.consents.find((item) => item.consent_type === "ai_processing");
      if (consent?.status !== "granted") actions.innerHTML = button("Autorizar IA para borradores", "grant-ai");
    }
    if (agent.agent_key === "match_agent" && agent.enabled) actions.innerHTML = button("Calcular encaje", "run-match");
    else if (agent.agent_key === "match_agent" && suggestions.some((item) => item.status === "pending")) actions.innerHTML = button("Revisar perfil investigado", "review-profile");
    const requiresAction = !agent.enabled && actions.childElementCount > 0;
    card.classList.toggle("has-required-action", requiresAction);
    if (requiresAction) card.removeAttribute("aria-disabled");
    else card.setAttribute("aria-disabled", String(!agent.enabled));
    if (actions.childElementCount) card.append(actions);
  }
  function updateSummary(agents) {
    const note = document.querySelector("#agents-readiness-note span"); if (!note) return;
    const ready = agents.filter((agent) => agent.status === "ready" && agent.enabled).length;
    const blocked = agents.filter((agent) => agent.status === "blocked").length;
    const paused = agents.filter((agent) => agent.status === "paused").length;
    note.textContent = `${ready} capacidades operativas, ${blocked} bloqueadas por puertas pendientes y ${paused} pausadas. Los estados proceden del tenant, no de datos de ejemplo.`;
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
  function renderSuggestions(suggestions) {
    document.querySelector("#tenant-profile-review")?.remove();
    const pending = suggestions.filter((item) => item.status === "pending"); if (!pending.length) return;
    const panel = document.createElement("article"); panel.id = "tenant-profile-review"; panel.className = "panel";
    panel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Revisión humana</p><h2>Sugerencias del Investigador</h2></div><span class="badge warning">${pending.length} pendientes</span></div>
      <div class="stack-list">${pending.map((item) => `<div class="stack-item"><div class="opportunity-topline"><strong>${escapeHtml(item.field_key)}</strong><span class="badge review">${escapeHtml(item.confidence)}</span></div><span>${escapeHtml(item.suggested_value)}</span><small>${escapeHtml(item.evidence_excerpt || "Sin fragmento")}</small><div class="button-row"><a class="ghost-action" href="${escapeHtml(item.source_ref)}" target="_blank" rel="noopener noreferrer">Fuente</a>${button("Aprobar", "approve-suggestion", `data-suggestion-id="${item.id}"`)}${button("Rechazar", "reject-suggestion", `data-suggestion-id="${item.id}"`)}</div></div>`).join("")}</div>
      <div class="button-row">${button("Aprobar perfil revisado", "approve-profile")}</div>`;
    document.querySelector("#agent-grid")?.insertAdjacentElement("afterend", panel);
  }
  async function refresh() {
    if (!session()) return;
    try {
      const [governance, suggestions, researchRuns] = await Promise.all([request("/api/tenant-agent-governance"), request("/api/tenant-profile-review"), request("/api/entity-research-runs")]);
      governance.agents.forEach((agent) => updateCard(agent, governance, researchRuns, suggestions)); updateSummary(governance.agents); updateEntitySummary(governance); renderSuggestions(suggestions); window.lucide?.createIcons();
    } catch (error) { const note = document.querySelector("#agents-readiness-note span"); if (note) note.textContent = `Estado operativo no disponible: ${error.message}`; }
  }
  async function act(element) {
    const action = element.dataset.tenantAgentAction; if (!action) return; element.disabled = true;
    try {
      if (action === "review-profile") { document.querySelector("#tenant-profile-review")?.scrollIntoView({ behavior: "smooth", block: "start" }); element.disabled = false; return; }
      if (action === "grant-web") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "grant_consent", consentType: "public_web_analysis", scope: { baseUrl: element.dataset.baseUrl, sameDomainOnly: true } }) });
      if (action === "grant-ai") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "grant_consent", consentType: "ai_processing", scope: { provider: "openai", store: false, allowedDataClasses: ["public"] } }) });
      if (action === "approve-web") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "approve_public_web_source", sourceId: element.dataset.sourceId }) });
      if (action === "resume") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "resume_agent", agentKey: element.dataset.agentKey }) });
      if (action === "run-research") await request("/api/entity-research-runs", { method: "POST", body: "{}" });
      if (action === "run-match") await request("/api/tenant-match-runs", { method: "POST", body: "{}" });
      if (["approve-suggestion", "reject-suggestion"].includes(action)) await request("/api/tenant-profile-review", { method: "PATCH", body: JSON.stringify({ reviews: [{ id: element.dataset.suggestionId, status: action === "approve-suggestion" ? "approved" : "rejected" }] }) });
      if (action === "approve-profile") await request("/api/tenant-profile-review", { method: "PATCH", body: JSON.stringify({ approveProfile: true }) });
      if (typeof showToast === "function") showToast(action === "run-research" ? "Investigación encolada. El estado se actualizará en esta tarjeta." : "Operación registrada y auditada."); await refresh();
    } catch (error) { if (typeof showToast === "function") showToast(error.message); element.disabled = false; }
  }
  document.addEventListener("click", (event) => { const target = event.target instanceof Element ? event.target.closest("[data-tenant-agent-action]") : null; if (target) act(target); });
  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0));
  window.addEventListener("tenant-recommendations-applied", () => setTimeout(refresh, 0));
  setTimeout(refresh, 0);
  setInterval(() => { if (location.hash === "#view-agents") refresh(); }, 12000);
})();
