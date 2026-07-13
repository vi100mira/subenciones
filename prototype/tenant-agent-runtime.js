(function () {
  const names = {
    grant_search: "Busqueda de convocatorias", entity_research: "Investigador de entidad",
    match_agent: "Asistente de encaje", document_review: "Revision documental",
    draft_agent: "Borrador de memoria", alert_agent: "Avisos y recordatorios"
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
  function updateCard(agent, governance) {
    const card = cardFor(agent.agent_key); if (!card) return;
    const tone = agent.status === "ready" ? "safe" : agent.status === "paused" ? "review" : "warning";
    const label = agent.status === "ready" ? "Operativo" : agent.status === "paused" ? "Pausado" : "Bloqueado";
    card.classList.toggle("is-disabled", !agent.enabled); card.classList.toggle("is-active-prototype", agent.enabled);
    card.setAttribute("aria-disabled", String(!agent.enabled));
    const dot = card.querySelector(".agent-status-dot");
    if (dot) { dot.className = `agent-status-dot ${tone}`; dot.title = `${label}: ${agent.status_reason || "Sin detalle"}`; const reader = dot.querySelector(".sr-only"); if (reader) reader.textContent = label; }
    const note = card.querySelector(".agent-readiness"); if (note) note.textContent = agent.status_reason || label;
    card.querySelector(".tenant-agent-actions")?.remove();
    const actions = document.createElement("div"); actions.className = "button-row tenant-agent-actions";
    if (agent.status === "paused") actions.innerHTML = button("Reanudar", "resume", `data-agent-key="${agent.agent_key}"`);
    if (agent.agent_key === "entity_research" && agent.status !== "paused") {
      const consent = governance.consents.find((item) => item.consent_type === "public_web_analysis");
      const source = governance.webSource; const baseUrl = source?.config_json?.base_url;
      if (consent?.status !== "granted" && baseUrl) actions.innerHTML = button("Autorizar web pública", "grant-web", `data-base-url="${escapeHtml(baseUrl)}"`);
      else if (source?.status !== "active" && source?.id) actions.innerHTML = button("Aprobar fuente web", "approve-web", `data-source-id="${source.id}"`);
      else if (agent.enabled) actions.innerHTML = button("Investigar ahora", "run-research");
    }
    if (agent.agent_key === "match_agent" && agent.enabled) actions.innerHTML = button("Calcular encaje", "run-match");
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
      const [governance, suggestions] = await Promise.all([request("/api/tenant-agent-governance"), request("/api/tenant-profile-review")]);
      governance.agents.forEach((agent) => updateCard(agent, governance)); updateSummary(governance.agents); updateEntitySummary(governance); renderSuggestions(suggestions); window.lucide?.createIcons();
    } catch (error) { const note = document.querySelector("#agents-readiness-note span"); if (note) note.textContent = `Estado operativo no disponible: ${error.message}`; }
  }
  async function act(element) {
    const action = element.dataset.tenantAgentAction; if (!action) return; element.disabled = true;
    try {
      if (action === "grant-web") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "grant_consent", consentType: "public_web_analysis", scope: { baseUrl: element.dataset.baseUrl, sameDomainOnly: true } }) });
      if (action === "approve-web") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "approve_public_web_source", sourceId: element.dataset.sourceId }) });
      if (action === "resume") await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "resume_agent", agentKey: element.dataset.agentKey }) });
      if (action === "run-research") await request("/api/entity-research-runs", { method: "POST", body: "{}" });
      if (action === "run-match") await request("/api/tenant-match-runs", { method: "POST", body: "{}" });
      if (["approve-suggestion", "reject-suggestion"].includes(action)) await request("/api/tenant-profile-review", { method: "PATCH", body: JSON.stringify({ reviews: [{ id: element.dataset.suggestionId, status: action === "approve-suggestion" ? "approved" : "rejected" }] }) });
      if (action === "approve-profile") await request("/api/tenant-profile-review", { method: "PATCH", body: JSON.stringify({ approveProfile: true }) });
      if (typeof showToast === "function") showToast("Operación registrada y auditada."); await refresh();
    } catch (error) { if (typeof showToast === "function") showToast(error.message); element.disabled = false; }
  }
  document.addEventListener("click", (event) => { const target = event.target instanceof Element ? event.target.closest("[data-tenant-agent-action]") : null; if (target) act(target); });
  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0));
  window.addEventListener("tenant-recommendations-applied", () => setTimeout(refresh, 0));
  setTimeout(refresh, 0);
})();
