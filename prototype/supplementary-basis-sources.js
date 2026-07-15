(function () {
  const state = { sources: [], opportunities: [], error: "", loading: false };
  const roleLabels = { regulatory: "Bases reguladoras", call: "Convocatoria completa", application_form: "Modelo o anexo de solicitud" };
  const authorityLabels = { official_journal: "Boletín oficial", issuing_body: "Organismo convocante", official_registry: "Registro oficial" };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const safeLink = (value) => { try { const url = new URL(String(value || "")); return url.protocol === "https:" ? url.href : "#"; } catch { return "#"; } };

  function session() {
    const current = window.CredentialsAuth?.getSession?.();
    return current?.role === "superadmin" && current?.accessToken ? current : null;
  }
  async function request(path, options = {}) {
    const current = session(); if (!current) throw new Error("Sesión superadmin no disponible");
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...window.CredentialsAuth.authHeaders(current), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data;
  }
  function statusBadge(source) {
    if (source.status === "approved" && source.last_verified_at && !source.last_verification_error) return '<span class="badge safe">Captura verificada</span>';
    if (source.status === "approved" && source.last_verification_error) return '<span class="badge warning">Captura fallida</span>';
    if (source.status === "approved") return '<span class="badge review">Aprobada · pendiente de radar</span>';
    if (source.status === "rejected") return '<span class="badge warning">Rechazada</span>';
    return '<span class="badge review">Pendiente de aprobación</span>';
  }
  function render() {
    const target = document.querySelector("#platform-supplementary-bases"); if (!target) return;
    if (state.error) { target.innerHTML = `<div class="plain-note"><strong>Registro no disponible</strong><span>${escapeHtml(state.error)}</span></div>`; return; }
    const options = state.opportunities.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.canonical_key)} · ${escapeHtml(item.title)}</option>`).join("");
    const rows = state.sources.map((source) => {
      const opportunity = Array.isArray(source.platform_opportunities) ? source.platform_opportunities[0] : source.platform_opportunities;
      const verification = source.last_verified_at ? `Último intento: ${new Date(source.last_verified_at).toLocaleString("es-ES")}${source.last_verification_error ? ` · ${escapeHtml(source.last_verification_error)}` : ""}` : "Todavía no capturada por el radar";
      const discovery = source.proposal_origin === "official_link_discovery" ? `<span class="badge review">Descubierta automáticamente${source.match_score ? ` · ${source.match_score}%` : ""}</span>` : "";
      const actions = source.status === "proposed" ? `<div class="button-row"><button class="ghost-action" data-supplementary-source-action="reject" data-source-id="${source.id}" type="button">Rechazar</button><button class="primary-action" data-supplementary-source-action="approve" data-source-id="${source.id}" type="button">Aprobar fuente</button></div>` : "";
      return `<article class="stack-item"><div class="opportunity-topline"><div><strong>${escapeHtml(opportunity?.title || "Convocatoria")}</strong><span>${escapeHtml(roleLabels[source.document_role] || source.document_role)} · ${escapeHtml(authorityLabels[source.source_authority] || source.source_authority)}</span></div><div class="button-row">${discovery}${statusBadge(source)}</div></div><a href="${escapeHtml(safeLink(source.source_url))}" target="_blank" rel="noopener">${escapeHtml(source.source_url)}</a><div class="source-state-line"><span>${verification}</span>${actions}</div></article>`;
    }).join("");
    target.innerHTML = `<form class="inline-form" data-supplementary-source-form><label><span>Convocatoria</span><select name="opportunityId" required>${options || '<option value="">No hay oportunidades disponibles</option>'}</select></label><label><span>Documento</span><select name="documentRole"><option value="regulatory">Bases reguladoras</option><option value="call">Convocatoria completa</option><option value="application_form">Modelo de solicitud</option></select></label><label><span>Autoridad</span><select name="sourceAuthority"><option value="official_journal">Boletín oficial</option><option value="issuing_body">Organismo convocante</option><option value="official_registry">Registro oficial</option></select></label><label><span>URL oficial HTTPS</span><input name="sourceUrl" type="url" inputmode="url" placeholder="https://.../bases.pdf" required /></label><label><span>Motivo o referencia</span><input name="note" placeholder="Dónde se cita esta norma o por qué corresponde" /></label><button class="primary-action" type="submit" ${options ? "" : "disabled"}>Proponer fuente</button></form><div class="plain-note"><strong>Doble validación</strong><span>Aprobar una URL permite que el radar la capture. Sus cláusulas no se usarán hasta verificar citas y aprobar la interpretación.</span></div><div class="stack-list">${rows || '<div class="empty-state">No hay fuentes suplementarias registradas.</div>'}</div>`;
  }
  async function refresh() {
    if (!session() || state.loading) return; state.loading = true;
    try { const data = await request("/api/admin-supplementary-basis-sources?status=all"); state.sources = data.sources || []; state.opportunities = data.opportunities || []; state.error = ""; }
    catch (error) { state.error = error.message; }
    state.loading = false; render();
  }
  async function submit(form) {
    const values = Object.fromEntries(new FormData(form));
    try { const result = await request("/api/admin-supplementary-basis-sources", { method: "POST", body: JSON.stringify(values) }); window.showToast?.(result.message); form.reset(); await refresh(); }
    catch (error) { window.showToast?.(error.message); }
  }
  async function review(button) {
    button.disabled = true;
    try { const result = await request("/api/admin-supplementary-basis-sources", { method: "PATCH", body: JSON.stringify({ sourceId: button.dataset.sourceId, action: button.dataset.supplementarySourceAction }) }); window.showToast?.(result.message); await refresh(); }
    catch (error) { window.showToast?.(error.message); button.disabled = false; }
  }
  document.addEventListener("submit", (event) => { if (event.target.matches?.("[data-supplementary-source-form]")) { event.preventDefault(); submit(event.target); } });
  document.addEventListener("click", (event) => { const button = event.target.closest?.("[data-supplementary-source-action]"); if (button) review(button); });
  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0));
  window.addEventListener("hashchange", () => { if (location.hash === "#view-platform") setTimeout(refresh, 0); });
  setTimeout(refresh, 0);
})();
