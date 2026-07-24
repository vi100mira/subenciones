(function () {
  const reasonLabels = {
    eligibility: "No cumple requisitos",
    low_fit: "Encaje insuficiente",
    deadline: "Plazo inviable",
    capacity: "Falta de capacidad interna",
    strategy: "Decisi\u00f3n estrat\u00e9gica",
    duplicate: "Duplicada o ya considerada",
    other: "Otro motivo"
  };

  function session() {
    const value = window.CredentialsAuth?.getSession?.();
    return value?.role === "entity" && value?.tenantId ? value : null;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  async function mutate(body) {
    const current = session();
    if (!current) throw new Error("Sesion de entidad no disponible");
    const response = await fetch("/api/tenant-match-review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current) },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    await window.refreshTenantMatchState?.();
    return payload.data;
  }

  function allRows() {
    return [...(window.RADAR?.opportunities || []), ...(window.RADAR_ENTITY_DISCARDED || []), ...(window.RADAR_DEADLINE_ARCHIVED || [])];
  }

  function rowByOpportunity(id) {
    return allRows().find((item) => String(item.id) === String(id));
  }

  function iconButton(icon, title, attributes) {
    return `<button class="icon-action" type="button" title="${title}" aria-label="${title}" ${attributes}><i data-lucide="${icon}"></i><span class="sr-only">${title}</span></button>`;
  }

  function candidateCell(item) {
    const recommendation = item.matchRecommendation;
    if (!recommendation) return "";
    const id = escapeHtml(recommendation.id);
    const opportunityId = escapeHtml(item.id);
    const decision = recommendation.decision_status || "pending";
    const stage = recommendation.candidacy_stage || "none";
    if (decision === "dismissed") return `<div class="candidate-state"><span class="badge danger">Descartada</span>${iconButton("rotate-ccw", "Reconsiderar y preseleccionar", `data-match-decision="preselected" data-recommendation-id="${id}"`)}</div>`;
    if (decision === "preselected" && stage !== "none") {
      const labels = { documents_pending: "Docs pendientes", documents_ready: "Docs listas", active: "Proyecto", abandoned: "Abandonada" };
      const tone = stage === "active" ? "safe" : "warning";
      return `<div class="candidate-state"><span class="badge ${tone}">${labels[stage] || "Preseleccionada"}</span>${iconButton("folder-open", "Ver candidatura", `data-candidate-detail="${opportunityId}"`)}${iconButton("archive-x", "Abandonar candidatura", `data-match-decision="dismissed" data-recommendation-id="${id}" data-opportunity-id="${opportunityId}" data-has-candidacy="true"`)}</div>`;
    }
    if (decision === "preselected") return `<div class="candidate-state"><span class="badge review">Preseleccionada</span>${iconButton("folder-plus", "Preparar candidatura", `data-match-stage="documents_pending" data-recommendation-id="${id}" data-opportunity-id="${opportunityId}"`)}${iconButton("x-circle", "Descartar", `data-match-decision="dismissed" data-recommendation-id="${id}"`)}</div>`;
    const lowFit = recommendation.recommendation_status === "low_fit";
    return `<div class="candidate-state">${lowFit ? '<span class="badge review">Bajo encaje</span>' : ""}${iconButton("bookmark-plus", lowFit ? "Preseleccionar pese al bajo encaje" : "Preseleccionar", `data-match-decision="preselected" data-recommendation-id="${id}"`)}${iconButton("x-circle", "Descartar", `data-match-decision="dismissed" data-recommendation-id="${id}"`)}</div>`;
  }

  function summaryHtml() {
    const summary = window.TENANT_MATCH_REVIEW_SUMMARY;
    if (!summary) return "";
    const state = summary.state;
    const title = state === "completed" ? "Revisi\u00f3n prioritaria completada" : state === "in_progress" ? "Revisi\u00f3n humana en curso" : "Resultado disponible";
    const progress = `${summary.preselectedOnly} preseleccionadas, ${summary.documentsPending} con documentaci\u00f3n pendiente, ${summary.dismissed} descartadas y ${summary.pendingActionable} prioritarias por decidir.`;
    const text = state === "not_started"
      ? `${summary.total} oportunidades analizadas. ${summary.actionable} requieren decisi\u00f3n y ${summary.lowFit} presentan bajo encaje.`
      : state === "completed" ? `${progress} Las ${summary.lowFit} de bajo encaje siguen disponibles para reconsiderar.` : progress;
    const complete = state === "in_progress" && summary.pendingActionable === 0
      ? '<button class="ghost-action" data-match-review-complete type="button">Completar revisi\u00f3n</button>' : "";
    return `<div class="fit-copy"><strong>${title}</strong><span>${text} Consultar no implica aprobar.</span></div>${complete}`;
  }

  function openDismissModal(button) {
    document.querySelector("[data-match-decision-modal]")?.remove();
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.dataset.matchDecisionModal = "true";
    modal.innerHTML = `<article class="modal" role="dialog" aria-modal="true" aria-labelledby="match-decision-title"><div class="panel-heading"><div><p class="eyebrow">Decision humana</p><h2 id="match-decision-title">${button.dataset.hasCandidacy ? "Abandonar candidatura" : "Descartar oportunidad"}</h2></div><button class="icon-button" data-close-match-decision type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div><label>Motivo<select data-match-decision-reason><option value="">Selecciona un motivo</option>${Object.entries(reasonLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><label>Nota opcional<textarea data-match-decision-note rows="3" maxlength="1000" placeholder="Contexto para futuras revisiones"></textarea></label><div class="button-row"><button class="primary-action" data-confirm-match-dismiss data-recommendation-id="${escapeHtml(button.dataset.recommendationId)}" type="button">Confirmar decision</button></div></article>`;
    document.body.append(modal);
    window.lucide?.createIcons();
  }

  async function handleAction(button) {
    try {
      if (button.dataset.matchDecision === "dismissed") return openDismissModal(button);
      if (button.dataset.matchDecision) {
        await mutate({ action: "decide", recommendationId: button.dataset.recommendationId, decisionStatus: button.dataset.matchDecision });
        if (typeof showToast === "function") showToast("Decision humana registrada y auditada.");
      }
      if (button.dataset.matchStage) {
        await mutate({ action: "set_stage", recommendationId: button.dataset.recommendationId, candidacyStage: button.dataset.matchStage });
        window.openWorkspaceAnalysis?.(button.dataset.opportunityId);
      }
      if (button.hasAttribute("data-match-review-complete")) {
        await mutate({ action: "complete_review" });
        if (typeof showToast === "function") showToast("Revision del encaje completada.");
      }
    } catch (error) { if (typeof showToast === "function") showToast(error.message); }
  }

  document.addEventListener("click", async (event) => {
    const close = event.target.closest?.("[data-close-match-decision]");
    if (close) return close.closest("[data-match-decision-modal]")?.remove();
    const confirm = event.target.closest?.("[data-confirm-match-dismiss]");
    if (confirm) {
      const modal = confirm.closest("[data-match-decision-modal]");
      const reason = modal.querySelector("[data-match-decision-reason]").value;
      if (!reason) return typeof showToast === "function" && showToast("Selecciona un motivo de descarte.");
      try {
        await mutate({ action: "decide", recommendationId: confirm.dataset.recommendationId, decisionStatus: "dismissed", reason, note: modal.querySelector("[data-match-decision-note]").value });
        modal.remove();
        if (typeof showToast === "function") showToast("Descarte registrado con su motivo.");
      } catch (error) { if (typeof showToast === "function") showToast(error.message); }
      return;
    }
    const action = event.target.closest?.("[data-match-decision], [data-match-stage], [data-match-review-complete]");
    if (action) handleAction(action);
  });

  window.TenantMatchReview = {
    candidateCell,
    summaryHtml,
    start: () => mutate({ action: "start_review" }),
    decide: (recommendationId, decisionStatus) => mutate({ action: "decide", recommendationId, decisionStatus }),
    stageByOpportunity: async (opportunityId, candidacyStage) => {
      const row = rowByOpportunity(opportunityId);
      if (row?.matchRecommendation?.id) return mutate({ action: "set_stage", recommendationId: row.matchRecommendation.id, candidacyStage });
    }
  };
})();
