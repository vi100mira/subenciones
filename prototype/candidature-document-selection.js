(function () {
  const states = new Map();
  const loads = new Map();
  const suggestionAttempts = new Set();

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function session() {
    const current = window.CredentialsAuth?.getSession?.();
    return current?.role === "entity" && current?.tenantId ? current : null;
  }

  async function request(recommendationId, options = {}) {
    const current = session();
    if (!current) throw new Error("Inicia sesión para consultar los documentos de la candidatura.");
    const query = options.method ? "" : `?recommendationId=${encodeURIComponent(recommendationId)}`;
    const response = await fetch(`/api/tenant-candidature-documents${query}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        "x-tenant-id": current.tenantId,
        ...window.CredentialsAuth.authHeaders(current),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data;
  }

  function status(selection) {
    if (selection.selection_status === "confirmed") return ["Confirmado", "safe"];
    if (selection.selection_status === "excluded") return ["Excluido", "neutral"];
    return ["Revisión pendiente", "warning"];
  }

  function selectionRow(selection, recommendationId) {
    const [label, tone] = status(selection);
    const document = selection.document || {};
    return `<article class="candidature-document-row selection ${selection.selection_status}">
      <div class="candidature-document-copy">
        <div class="button-row">
          <span class="badge ${tone}">${label}</span>
          <span class="badge neutral">${selection.selection_origin === "human_added" ? "Añadido por una persona" : "Propuesto por el asistente"}</span>
        </div>
        <strong>${escapeHtml(document.title || "Documento no disponible")}</strong>
        <span>${escapeHtml(selection.reason_text)}</span>
        <small>Clase ${escapeHtml(document.data_class || "interna")} · referencia ${escapeHtml(String(selection.source_document_id).slice(0, 8))}</small>
      </div>
      ${selection.selection_status === "proposed" ? `<div class="button-row">
        <button class="ghost-action" data-candidature-document-review="excluded" data-selection-id="${escapeHtml(selection.id)}" data-recommendation-id="${escapeHtml(recommendationId)}" type="button">Excluir</button>
        <button class="primary-action" data-candidature-document-review="confirmed" data-selection-id="${escapeHtml(selection.id)}" data-recommendation-id="${escapeHtml(recommendationId)}" type="button">Confirmar</button>
      </div>` : ""}
    </article>`;
  }

  function approvalCandidateRow(candidate) {
    return `<article class="candidature-document-row pending">
      <div class="candidature-document-copy">
        <div class="button-row"><span class="badge warning">Requiere aprobación</span><span class="badge neutral">Aún no vinculable</span></div>
        <strong>${escapeHtml(candidate.title)}</strong>
        <span>${escapeHtml(candidate.reason)}</span>
        <small>Solo se muestra metadato documental · el contenido privado no se ha leído</small>
      </div>
      <button class="ghost-action" data-annex-open="${escapeHtml(candidate.id)}"
        data-annex-source="${escapeHtml(candidate.source_connection_id)}"
        data-annex-title="${escapeHtml(candidate.title)}" data-annex-mime="${escapeHtml(candidate.mime_type)}"
        data-annex-class="${escapeHtml(candidate.data_class)}" data-annex-sha="${escapeHtml(candidate.source_sha256)}"
        data-annex-status="pending" data-annex-recommendation="Revisar antes de utilizar en la candidatura"
        type="button">Revisar documento</button>
    </article>`;
  }

  function summaryMarkup(state) {
    const active = (state.selections || []).filter((item) => item.selection_status !== "excluded").length;
    return `<button class="candidature-document-summary" data-open-candidature-documents type="button">
      <span><i data-lucide="library"></i><strong>Base común en esta candidatura</strong></span>
      <span><strong>${active}</strong> vinculados · <strong>${state.approvedDocumentCount || 0}</strong> aprobados · <strong>${state.pendingDocumentCount || 0}</strong> por revisar · ${state.corpusDocumentCount || 0} inventariados</span>
      <i data-lucide="chevron-right"></i>
    </button>`;
  }

  function markup(state, recommendationId) {
    const selections = state.selections || [];
    const active = selections.filter((item) => item.selection_status !== "excluded");
    const confirmed = selections.filter((item) => item.selection_status === "confirmed").length;
    const proposed = selections.filter((item) => item.selection_status === "proposed").length;
    const corpus = Number(state.corpusDocumentCount || 0);
    const approvalCandidates = state.approvalCandidates || [];
    const contracted = (session()?.plan?.agentKeys || []).includes("draft_agent");
    return `<section class="candidature-document-selection">
      ${contracted ? "" : '<div class="plain-note is-warning"><strong>Histórico conservado</strong><span>Puedes revisar los vínculos existentes, pero no se crearán nuevas propuestas sin Preparación documental.</span></div>'}
      <div class="candidature-document-heading">
        <div>
          <p class="eyebrow">Subconjunto de Base común</p>
          <h3>${active.length} de ${corpus} documentos vinculados</h3>
          <p>La candidatura no incorpora el corpus completo. Solo usa referencias relevantes y aprobadas para este expediente.</p>
        </div>
        <button class="ghost-action" data-candidature-open-common type="button"><i data-lucide="library"></i> Ir a Base común</button>
      </div>
      <div class="candidature-document-metrics">
        <span><strong>${confirmed}</strong> confirmados</span>
        <span><strong>${proposed}</strong> propuestas por revisar</span>
        <span><strong>${state.approvedDocumentCount || 0}</strong> aprobados en Base común</span>
        <span><strong>${state.maxActiveDocuments || 20}</strong> máximo operativo</span>
      </div>
      ${selections.length
        ? `<div class="candidature-document-list">${selections.map((item) => selectionRow(item, recommendationId)).join("")}</div>`
        : `<div class="plain-note"><strong>Aún no hay documentos vinculados</strong><span>El asistente puede proponer unos pocos por relevancia cuando existan documentos internos aprobados. Una persona deberá confirmar cada propuesta.</span></div>`}
      ${approvalCandidates.length ? `<div class="candidature-approval-candidates">
        <div><p class="eyebrow">Preselección por metadatos</p><h4>Documentos que conviene revisar primero</h4><p>No se incorporan al expediente hasta que una persona los apruebe.</p></div>
        <div class="candidature-document-list">${approvalCandidates.map(approvalCandidateRow).join("")}</div>
      </div>` : ""}
    </section>`;
  }

  function renderRecommendation(recommendationId) {
    document.querySelectorAll(`[data-candidature-document-selection][data-recommendation-id="${CSS.escape(recommendationId)}"]`)
      .forEach((host) => {
        const state = states.get(recommendationId);
        if (state) host.innerHTML = markup(state, recommendationId);
        else host.innerHTML = '<div class="plain-note"><strong>Cargando subconjunto documental</strong><span>Comprobando los vínculos aprobados de esta candidatura.</span></div>';
      });
    document.querySelectorAll(`[data-candidature-document-summary][data-recommendation-id="${CSS.escape(recommendationId)}"]`)
      .forEach((host) => {
        const state = states.get(recommendationId);
        host.innerHTML = state ? summaryMarkup(state) : '<div class="candidature-document-summary is-loading"><span>Comprobando Base común…</span></div>';
      });
    window.lucide?.createIcons();
  }

  async function load(recommendationId, force = false) {
    if (!recommendationId) return;
    if (!force && states.has(recommendationId)) return renderRecommendation(recommendationId);
    if (!force && loads.has(recommendationId)) return loads.get(recommendationId);
    renderRecommendation(recommendationId);
    const pending = request(recommendationId)
      .then(async (state) => {
        const contracted = (session()?.plan?.agentKeys || []).includes("draft_agent");
        const active = ["documents_pending", "documents_ready", "active"].includes(state.recommendation?.candidacy_stage);
        if (contracted && active && state.approvedDocumentCount > 0
          && !(state.selections || []).length && !suggestionAttempts.has(recommendationId)) {
          suggestionAttempts.add(recommendationId);
          const result = await request(recommendationId, {
            method: "POST", body: JSON.stringify({ recommendationId, action: "suggest" })
          });
          if (result.proposed > 0) state = await request(recommendationId);
        }
        states.set(recommendationId, state);
        renderRecommendation(recommendationId);
      })
      .catch((error) => {
        document.querySelectorAll(`[data-candidature-document-selection][data-recommendation-id="${CSS.escape(recommendationId)}"]`)
          .forEach((host) => {
            host.innerHTML = `<div class="plain-note warning"><strong>No se pudo leer el subconjunto</strong><span>${escapeHtml(error.message)}</span></div>`;
          });
      })
      .finally(() => loads.delete(recommendationId));
    loads.set(recommendationId, pending);
    return pending;
  }

  function renderAll() {
    document.querySelectorAll("[data-candidature-document-selection], [data-candidature-document-summary]").forEach((host) => {
      const recommendationId = host.dataset.recommendationId;
      if (!recommendationId) {
        host.innerHTML = '<div class="plain-note warning"><strong>Candidatura sin vínculo persistido</strong><span>No se asociará ningún documento hasta identificar el expediente del tenant.</span></div>';
        return;
      }
      load(recommendationId);
    });
  }

  async function review(button) {
    button.disabled = true;
    const recommendationId = button.dataset.recommendationId;
    try {
      await request(recommendationId, {
        method: "PATCH",
        body: JSON.stringify({
          recommendationId,
          selectionId: button.dataset.selectionId,
          selectionStatus: button.dataset.candidatureDocumentReview
        })
      });
      states.delete(recommendationId);
      await load(recommendationId, true);
      window.showToast?.("Revisión documental guardada.");
    } catch (error) {
      button.disabled = false;
      window.showToast?.(error.message || "No se pudo guardar la revisión.");
    }
  }

  async function propose(recommendationId, documents) {
    if (!(session()?.plan?.agentKeys || []).includes("draft_agent")) {
      throw new Error("Preparación documental no está incluida en el plan contratado.");
    }
    const result = await request(recommendationId, {
      method: "POST",
      body: JSON.stringify({ recommendationId, origin: "assistant_recommended", documents })
    });
    states.delete(recommendationId);
    await load(recommendationId, true);
    return result;
  }

  document.addEventListener("click", (event) => {
    const reviewButton = event.target.closest?.("[data-candidature-document-review]");
    if (reviewButton) return void review(reviewButton);
    if (event.target.closest?.("[data-candidature-open-common]")) {
      document.querySelector("[data-close-candidature-panel]")?.remove();
      document.querySelector('[data-screen="knowledge"]')?.click();
    }
    if (event.target.closest?.("[data-open-candidature-documents]")) {
      document.querySelector('[data-candidature-action="documents"]')?.click();
    }
  });
  window.addEventListener("private-document-review-saved", () => {
    states.clear(); suggestionAttempts.clear(); renderAll();
  });
  window.addEventListener("candidature-document-hosts-rendered", renderAll);
  window.addEventListener("role-session-applied", () => {
    states.clear(); loads.clear(); suggestionAttempts.clear(); renderAll();
  });
  document.addEventListener("DOMContentLoaded", renderAll);
  window.CandidatureDocuments = { refresh: renderAll, propose };
})();
