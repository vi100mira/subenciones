(function () {
  function session() {
    const value = window.CredentialsAuth?.getSession?.();
    return value?.role === "entity" && value?.tenantId ? value : null;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  async function request(options = {}) {
    const current = session();
    if (!current) throw new Error("Sesión tenant no disponible");
    const response = await fetch("/api/document-review-runs", {
      ...options,
      headers: { "Content-Type": "application/json", "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current) }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data;
  }

  function relation(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  function reviewMarkup(review) {
    const opportunity = relation(review.platform_opportunities);
    const requirements = review.requirements_json || [];
    const risks = review.risks_json || [];
    return `<article class="stack-item">
      <div class="opportunity-topline"><strong>${escapeHtml(opportunity?.title || "Convocatoria")}</strong><span class="badge review">${escapeHtml(review.human_review_status)}</span></div>
      <div class="compact-list"><strong>${requirements.length} requisitos con evidencia</strong><ul>${requirements.slice(0, 8).map((item) => `<li><b>${escapeHtml(item.label)}:</b> ${escapeHtml(item.text)}</li>`).join("")}</ul></div>
      ${risks.length ? `<div class="plain-note"><strong>Riesgos a comprobar</strong><span>${risks.map((risk) => escapeHtml(risk.text)).join(" ")}</span></div>` : ""}
      ${review.human_review_status === "pending" ? `<div class="button-row"><button class="ghost-action" data-document-review-decision="reviewed" data-review-id="${review.id}" type="button">Marcar revisado</button><button class="ghost-action" data-document-review-decision="dismissed" data-review-id="${review.id}" type="button">Descartar revisión</button></div>` : ""}
    </article>`;
  }

  function render(reviews) {
    document.querySelector("#document-review-runtime")?.remove();
    const host = document.querySelector("#documentary-agent-package");
    if (!host || !reviews.length) return;
    const panel = document.createElement("article");
    panel.id = "document-review-runtime";
    panel.className = "panel";
    panel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Revisión documental persistida</p><h2>Bases analizadas por versión</h2></div><span class="badge review">Revisión humana</span></div><div class="stack-list">${reviews.slice(0, 10).map(reviewMarkup).join("")}</div>`;
    host.insertAdjacentElement("afterend", panel);
  }

  async function refresh() {
    if (!session()) return;
    try { render(await request()); } catch { /* La interfaz local conserva su fallback sin afirmar persistencia. */ }
  }

  async function queue(canonicalKey) {
    if (!session() || !canonicalKey) return;
    try {
      await request({ method: "POST", body: JSON.stringify({ canonicalKey }) });
      if (typeof showToast === "function") showToast("Revisión documental encolada con evidencia y control humano.");
    } catch (error) {
      if (typeof showToast === "function") showToast(error.message);
    }
  }

  async function decide(button) {
    button.disabled = true;
    try {
      await request({ method: "PATCH", body: JSON.stringify({ reviewId: button.dataset.reviewId, reviewStatus: button.dataset.documentReviewDecision }) });
      await refresh();
    } catch (error) {
      button.disabled = false;
      if (typeof showToast === "function") showToast(error.message);
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest("[data-document-agent]");
    if (trigger) queue(trigger.dataset.documentAgent);
    const decision = target?.closest("[data-document-review-decision]");
    if (decision) decide(decision);
  }, true);
  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0));
  window.addEventListener("hashchange", () => setTimeout(refresh, 100));
  setTimeout(refresh, 0);
})();
