(function () {
  let active = null;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function session() {
    return window.CredentialsAuth?.getSession?.() || null;
  }

  async function api(path, options = {}) {
    const current = session();
    if (!current?.accessToken || !current?.tenantId) throw new Error("La sesión de la entidad no está disponible.");
    const response = await fetch(path, { ...options, headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current), ...(options.headers || {})
    } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `La operación falló (HTTP ${response.status}).`);
    return payload.data;
  }

  function closeEditor() {
    document.querySelector("[data-document-version-modal]")?.remove();
    document.querySelectorAll("[data-hidden-for-document-editor]").forEach((node) => {
      node.hidden = false;
      node.style.removeProperty("display");
      node.removeAttribute("data-hidden-for-document-editor");
    });
    active = null;
  }

  function selectedVersion() {
    return active?.versions?.find((version) => version.id === active.selectedVersionId) || null;
  }

  function selectedContent() {
    return selectedVersion()?.content_json || active?.currentContent || null;
  }

  function currentDocument() {
    return selectedContent()?.documents?.find((document) => document.documentRef === active?.documentRef) || null;
  }

  function renderEditor() {
    const documentDraft = currentDocument();
    if (!documentDraft) throw new Error("El documento generado ya no está disponible en esta versión.");
    const modal = document.querySelector("[data-document-version-modal]");
    const version = selectedVersion();
    const historical = Boolean(active.selectedVersionId && active.selectedVersionId !== active.currentVersionId);
    const versionLabel = version ? `Versión ${version.version_number}` : "Salida original de la IA";
    modal.innerHTML = `<article class="modal candidature-panel-modal action" role="dialog" aria-modal="true" aria-labelledby="document-version-title">
      <div class="panel-heading"><div><p class="eyebrow">Borrador editable y versionado</p><h2 id="document-version-title">${escapeHtml(documentDraft.title)}</h2></div><button class="icon-button" data-close-document-version type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note"><strong>${escapeHtml(versionLabel)} · ${escapeHtml(version?.status || "base")}</strong><span>Solo editas contenido redactable. Estructura, requisitos, evidencias y firma permanecen bloqueados.</span></div>
      <div data-document-version-fields>${documentDraft.sections.map((section) => `<label><span>${escapeHtml(section.title)}</span><textarea data-document-edit-section="${escapeHtml(section.title)}" rows="6" ${historical ? "disabled" : ""}>${escapeHtml((section.paragraphs || []).join("\n\n"))}</textarea><small>Procedencia conservada: ${escapeHtml((section.evidenceRefs || []).join(" · ") || "revisión humana")}</small></label>`).join("")}</div>
      <label><span>Nota de la versión o motivo de rechazo</span><textarea data-document-version-note rows="2" maxlength="1000" ${historical ? "disabled" : ""} placeholder="Resume el cambio realizado...">${escapeHtml(version?.change_note || "")}</textarea></label>
      <div class="button-row">${historical ? `<button class="ghost-action" data-view-current-document-version type="button">Volver a la versión actual</button>${version?.status === "approved" ? `<button class="primary-action" data-activate-approved-version type="button">Usar esta versión aprobada</button>` : ""}` : `<button class="ghost-action" data-save-document-version type="button">Guardar nueva versión</button><button class="primary-action" data-approve-document-version type="button" ${active.currentVersionId ? "" : "disabled"}>Aprobar esta versión</button><button class="ghost-action" data-reject-document-version type="button" ${active.currentVersionId ? "" : "disabled"}>Rechazar</button>`}</div>
      <details open><summary>Historial de versiones</summary><div class="button-row">${(active.versions || []).map((item) => `<button class="ghost-action" data-view-document-version="${escapeHtml(item.id)}" type="button">v${item.version_number} · ${escapeHtml(item.status)}</button>`).join("") || "<small>Aún no hay ediciones humanas guardadas.</small>"}</div></details>
    </article>`;
    window.lucide?.createIcons();
  }

  async function loadEditor(button) {
    const runId = button.dataset.runId;
    const data = await api(`/api/draft-document-versions?runId=${encodeURIComponent(runId)}`);
    document.querySelectorAll("[data-constructed-doc-modal]").forEach((node) => {
      node.hidden = true;
      node.style.display = "none";
      node.setAttribute("data-hidden-for-document-editor", "true");
    });
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-document-version-modal></div>`);
    active = { ...data, runId, canonicalKey: button.dataset.canonicalKey,
      documentRef: button.dataset.documentRef, selectedVersionId: data.currentVersionId };
    renderEditor();
  }

  function collectEdits() {
    const documentDraft = currentDocument();
    return [{ documentRef: documentDraft.documentRef, sections: [...document.querySelectorAll("[data-document-edit-section]")].map((textarea) => ({
      title: textarea.dataset.documentEditSection,
      paragraphs: textarea.value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    })) }];
  }

  async function saveVersion() {
    const data = await api("/api/draft-document-versions", { method: "POST", body: JSON.stringify({
      runId: active.runId, edits: collectEdits(),
      changeNote: document.querySelector("[data-document-version-note]")?.value || "Edición humana del borrador"
    }) });
    const refreshed = await api(`/api/draft-document-versions?runId=${encodeURIComponent(active.runId)}`);
    active = { ...active, ...refreshed, selectedVersionId: refreshed.currentVersionId };
    window.dispatchEvent(new CustomEvent("draft-document-version-updated", { detail: {
      canonicalKey: active.canonicalKey, runId: active.runId, content: data.version.content_json, review: data.review
    } }));
    renderEditor();
    window.showToast?.(`Versión ${data.version.version_number} guardada sin sobrescribir la anterior.`);
  }

  async function decideVersion(action, versionId = active.currentVersionId) {
    const note = document.querySelector("[data-document-version-note]")?.value || "";
    const data = await api("/api/draft-document-versions", { method: "PATCH", body: JSON.stringify({
      runId: active.runId, versionId, action, note
    }) });
    window.dispatchEvent(new CustomEvent("draft-document-version-updated", { detail: {
      canonicalKey: active.canonicalKey, runId: active.runId,
      content: data.version.content_json, review: data.review
    } }));
    closeEditor();
    window.showToast?.(action === "approved" ? "Versión aprobada para exportación privada; la presentación sigue bloqueada."
      : "Versión rechazada. Conserva su historial y puedes crear otra corrección.");
  }

  document.addEventListener("click", async (event) => {
    const target = event.target.closest?.("button, [data-document-version-modal]");
    if (!target) return;
    if (target.matches("[data-document-version-edit]")) {
      try { await loadEditor(target); } catch (error) { window.showToast?.(error?.message || "No se pudo abrir el editor."); }
      return;
    }
    if (target.matches("[data-close-document-version]") || (target.matches("[data-document-version-modal]") && event.target === target)) { closeEditor(); return; }
    if (target.matches("[data-view-document-version]")) { active.selectedVersionId = target.dataset.viewDocumentVersion; renderEditor(); return; }
    if (target.matches("[data-view-current-document-version]")) { active.selectedVersionId = active.currentVersionId; renderEditor(); return; }
    try {
      if (target.matches("[data-save-document-version]")) { target.disabled = true; await saveVersion(); }
      if (target.matches("[data-approve-document-version]")) { target.disabled = true; await decideVersion("approved"); }
      if (target.matches("[data-reject-document-version]")) { target.disabled = true; await decideVersion("rejected"); }
      if (target.matches("[data-activate-approved-version]")) { target.disabled = true; await decideVersion("approved", active.selectedVersionId); }
    } catch (error) {
      target.disabled = false;
      window.showToast?.(error?.message || "No se pudo guardar la versión documental.");
    }
  });
})();
