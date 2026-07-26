(function () {
  let active = null;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function session() {
    const current = window.CredentialsAuth?.getSession?.();
    return current?.role === "entity" && current?.tenantId ? current : null;
  }

  async function request(path, options = {}) {
    const current = session();
    if (!current?.accessToken) throw new Error("La sesión de la entidad no está disponible.");
    const response = await fetch(path, { ...options, headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current), ...(options.headers || {})
    } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `La operación falló (HTTP ${response.status}).`);
    return payload.data;
  }

  function close() {
    document.querySelector("[data-common-candidature-modal]")?.remove();
    active = null;
  }

  function render(candidatures = [], error = "") {
    const host = document.querySelector("[data-common-candidature-modal]");
    if (!host || !active) return;
    const adapt = active.mode === "adapt";
    host.innerHTML = `<article class="modal common-candidature-modal" role="dialog" aria-modal="true" aria-labelledby="common-candidature-title">
      <div class="panel-heading"><div><p class="eyebrow">Base común → candidatura</p><h2 id="common-candidature-title">${adapt ? "Crear copia editable" : "Vincular documento"}</h2></div><button class="icon-button" data-common-candidature-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note"><strong>${escapeHtml(active.title)}</strong><span>${adapt
        ? "Se vinculará el original como procedencia y se abrirá una copia versionada para este expediente. El original no cambia."
        : "La candidatura guardará una referencia confirmada al original aprobado; no se copiará su contenido."}</span></div>
      ${error ? `<div class="plain-note is-warning"><strong>No se pudieron cargar las candidaturas</strong><span>${escapeHtml(error)}</span></div>` : ""}
      <form data-common-candidature-form>
        <label><span>Candidatura de destino</span><select name="recommendationId" required ${candidatures.length ? "" : "disabled"}>
          <option value="">Selecciona una candidatura…</option>${candidatures.map((item) => `<option value="${escapeHtml(item.recommendationId)}">${escapeHtml(item.title)}${item.funderName ? ` · ${escapeHtml(item.funderName)}` : ""}</option>`).join("")}
        </select></label>
        ${candidatures.length ? "" : '<div class="empty-state compact"><strong>No hay candidaturas activas</strong><span>Preselecciona una oportunidad antes de vincular documentación.</span></div>'}
        <div class="plain-note compact"><strong>Control humano</strong><span>${adapt ? "La copia quedará en borrador hasta que la edites y consolides." : "El vínculo se confirma por tu acción y queda auditado."} Presentación y envío siguen bloqueados.</span></div>
        <div class="button-row"><button class="ghost-action" data-common-candidature-close type="button">Cancelar</button><button class="primary-action" type="submit" ${candidatures.length ? "" : "disabled"}>${adapt ? "Crear copia y editar" : "Vincular a candidatura"}</button></div>
        <small data-common-candidature-status></small>
      </form>
    </article>`;
    window.lucide?.createIcons();
  }

  async function open(button) {
    active = { mode: button.dataset.commonCandidatureAction, documentId: button.dataset.documentId,
      title: button.dataset.documentTitle, sha: button.dataset.documentSha };
    document.body.insertAdjacentHTML("beforeend", '<div class="modal-backdrop common-candidature-modal-backdrop" data-common-candidature-modal></div>');
    render();
    try { render(await request("/api/tenant-candidature-documents?action=candidatures")); }
    catch (error) { render([], error.message); }
  }

  async function submit(form) {
    const status = form.querySelector("[data-common-candidature-status]");
    const recommendationId = String(new FormData(form).get("recommendationId") || "");
    if (!recommendationId || !active) return;
    form.querySelector('button[type="submit"]').disabled = true;
    status.textContent = active.mode === "adapt" ? "Preparando la copia editable sin llamadas a IA…" : "Guardando el vínculo…";
    try {
      if (active.mode === "assign") {
        await request("/api/tenant-candidature-documents", { method: "POST", body: JSON.stringify({
          recommendationId, origin: "human_added", documents: [{ documentId: active.documentId,
            reason: "Vinculado directamente desde Base común por una persona autorizada.",
            evidenceRefs: active.sha ? [`sha256:${active.sha}`] : [] }]
        }) });
        await window.CandidatureDocuments?.invalidate?.(recommendationId);
        close(); window.PrivateAnnexViewer?.close?.();
        window.showToast?.("Documento vinculado y confirmado en la candidatura elegida.");
        return;
      }
      const result = await request("/api/common-document-adaptation", { method: "POST", body: JSON.stringify({
        recommendationId, sourceDocumentId: active.documentId
      }) });
      await window.CandidatureDocuments?.invalidate?.(recommendationId);
      window.dispatchEvent(new CustomEvent("draft-agent-run-updated", { detail: {
        canonicalKey: result.canonicalKey, run: result.run
      } }));
      close(); window.PrivateAnnexViewer?.close?.();
      await window.DocumentVersionEditor?.openRun?.(result.run.id, result.canonicalKey, result.documentRef);
      window.showToast?.("Copia específica creada. El original de Base común permanece intacto.");
    } catch (error) {
      status.textContent = error.message || "No se pudo completar la operación.";
      form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    const action = event.target.closest?.("[data-common-candidature-action]");
    if (action) return void open(action);
    const closeButton = event.target.closest?.("[data-common-candidature-close]");
    if (closeButton || event.target.matches?.("[data-common-candidature-modal]")) close();
  });
  document.addEventListener("submit", (event) => {
    if (!event.target.matches?.("[data-common-candidature-form]")) return;
    event.preventDefault(); submit(event.target);
  });
})();
