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
    const consolidated = documentDraft.consolidation?.status === "consolidated";
    const locked = historical || (consolidated && !active.reopening);
    const humanStarted = ["candidature_adaptation", "manual_template"].includes(documentDraft.documentType);
    const versionLabel = version ? `Versión ${version.version_number}`
      : humanStarted ? "Borrador inicial de la entidad" : "Salida original de la IA";
    modal.innerHTML = `<article class="modal candidature-panel-modal action" role="dialog" aria-modal="true" aria-labelledby="document-version-title">
      <div class="panel-heading"><div><p class="eyebrow">${consolidated && !active.reopening ? "Documento consolidado" : "Borrador editable y versionado"}</p><h2 id="document-version-title">${escapeHtml(documentDraft.title)}</h2></div><button class="icon-button" data-close-document-version type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note ${consolidated && !active.reopening ? "" : "is-warning"}"><strong>${consolidated && !active.reopening ? "Cerrado por una persona autorizada" : `${escapeHtml(versionLabel)} · ${escapeHtml(version?.status || "base")}`}</strong><span>${consolidated && !active.reopening ? `Consolidado el ${escapeHtml(new Date(documentDraft.consolidation.reviewedAt).toLocaleString("es-ES"))}. Puedes reabrirlo; la siguiente edición volverá a dejarlo en borrador.` : "Edita el contenido redactable y consolida solo este documento cuando esté terminado. Estructura, evidencias y firma permanecen bloqueadas."}</span></div>
      <div data-document-version-fields>${documentDraft.sections.map((section) => `<label><span>${escapeHtml(section.title)}</span><textarea data-document-edit-section="${escapeHtml(section.title)}" rows="6" ${locked ? "disabled" : ""}>${escapeHtml((section.paragraphs || []).join("\n\n"))}</textarea><small>Procedencia conservada: ${escapeHtml((section.evidenceRefs || []).join(" · ") || "revisión humana")}</small></label>`).join("")}</div>
      <label><span>Nota de esta versión</span><textarea data-document-version-note rows="2" maxlength="1000" ${locked ? "disabled" : ""} placeholder="Resume el cambio o la validación realizada...">${escapeHtml(version?.change_note || "")}</textarea></label>
      <div class="button-row">${historical ? `<button class="ghost-action" data-view-current-document-version type="button">Volver a la versión actual</button>`
        : consolidated && !active.reopening ? `<button class="ghost-action" data-promote-document-version type="button"><i data-lucide="library-big"></i>Enviar a revisión de Base común</button><button class="primary-action" data-reopen-document-version type="button"><i data-lucide="file-pen-line"></i>Reabrir para corregir</button><button class="ghost-action" data-close-document-version type="button">Cerrar</button>`
        : `<button class="ghost-action" data-save-document-version type="button">Guardar como borrador</button><button class="primary-action" data-consolidate-document-version type="button"><i data-lucide="badge-check"></i>Guardar y consolidar documento</button>`}</div>
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
      documentRef: button.dataset.documentRef, selectedVersionId: data.currentVersionId, reopening: false };
    renderEditor();
  }

  async function createManualEditor(button) {
    const seed = window.ConstructedDocumentDraftSeed?.(Number(button.dataset.documentIndex));
    if (!seed?.content || !seed.targetDocumentRef) throw new Error("No se pudo preparar la plantilla editable.");
    const data = await api("/api/draft-document-versions", { method: "POST", body: JSON.stringify({
      canonicalKey: button.dataset.canonicalKey, seedContent: seed.content, targetDocumentRef: seed.targetDocumentRef
    }) });
    window.dispatchEvent(new CustomEvent("draft-agent-run-updated", { detail: {
      canonicalKey: button.dataset.canonicalKey, run: data.run
    } }));
    await loadEditor({ dataset: { runId: data.run.id, canonicalKey: button.dataset.canonicalKey,
      documentRef: data.documentRef } });
    window.showToast?.("Borrador manual creado sin llamadas a IA. Ya puedes editar sus apartados.");
  }

  function collectEdits() {
    const documentDraft = currentDocument();
    return [{ documentRef: documentDraft.documentRef, sections: [...document.querySelectorAll("[data-document-edit-section]")].map((textarea) => ({
      title: textarea.dataset.documentEditSection,
      paragraphs: textarea.value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    })) }];
  }

  async function saveVersion(consolidate = false) {
    const data = await api("/api/draft-document-versions", { method: "POST", body: JSON.stringify({
      runId: active.runId, edits: collectEdits(),
      consolidateDocumentRef: consolidate ? active.documentRef : null,
      changeNote: document.querySelector("[data-document-version-note]")?.value
        || (consolidate ? "Documento revisado y consolidado por la entidad" : "Edición humana del borrador")
    }) });
    const refreshed = await api(`/api/draft-document-versions?runId=${encodeURIComponent(active.runId)}`);
    active = { ...active, ...refreshed, selectedVersionId: refreshed.currentVersionId };
    window.dispatchEvent(new CustomEvent("draft-document-version-updated", { detail: {
      canonicalKey: active.canonicalKey, runId: active.runId, content: data.version.content_json, review: data.review
    } }));
    if (consolidate) {
      closeEditor();
      window.showToast?.(data.allDocumentsConsolidated
        ? "Documento consolidado. Todos los documentos generados del proyecto ya están cerrados."
        : "Documento consolidado. Puedes continuar con el siguiente sin cerrar todavía el proyecto completo.");
    } else {
      active.reopening = false;
      renderEditor();
      window.showToast?.(`Versión ${data.version.version_number} guardada como borrador sin sobrescribir la anterior.`);
    }
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

  async function promoteToCommonKnowledge(button) {
    button.disabled = true;
    const data = await api("/api/common-knowledge-promotion", { method: "POST", body: JSON.stringify({
      runId: active.runId, versionId: active.currentVersionId, documentRef: active.documentRef
    }) });
    window.dispatchEvent(new CustomEvent("common-knowledge-updated", { detail: { documentId: data.id } }));
    button.textContent = "Enviado a revisión";
    window.showToast?.("Documento añadido a Base común como pendiente. Revísalo allí antes de reutilizarlo.");
  }

  document.addEventListener("click", async (event) => {
    const target = event.target.closest?.("button, [data-document-version-modal]");
    if (!target) return;
    if (target.matches("[data-document-version-edit]")) {
      try { await loadEditor(target); } catch (error) { window.showToast?.(error?.message || "No se pudo abrir el editor."); }
      return;
    }
    if (target.matches("[data-document-version-create]")) {
      target.disabled = true;
      try { await createManualEditor(target); } catch (error) {
        target.disabled = false; window.showToast?.(error?.message || "No se pudo crear el borrador manual.");
      }
      return;
    }
    if (target.matches("[data-close-document-version]") || (target.matches("[data-document-version-modal]") && event.target === target)) { closeEditor(); return; }
    if (target.matches("[data-view-document-version]")) { active.selectedVersionId = target.dataset.viewDocumentVersion; renderEditor(); return; }
    if (target.matches("[data-view-current-document-version]")) { active.selectedVersionId = active.currentVersionId; active.reopening = false; renderEditor(); return; }
    if (target.matches("[data-reopen-document-version]")) { active.reopening = true; renderEditor(); return; }
    try {
      if (target.matches("[data-save-document-version]")) { target.disabled = true; await saveVersion(false); }
      if (target.matches("[data-consolidate-document-version]")) { target.disabled = true; await saveVersion(true); }
      if (target.matches("[data-promote-document-version]")) await promoteToCommonKnowledge(target);
      if (target.matches("[data-reject-document-version]")) { target.disabled = true; await decideVersion("rejected"); }
      if (target.matches("[data-activate-approved-version]")) { target.disabled = true; await decideVersion("approved", active.selectedVersionId); }
    } catch (error) {
      target.disabled = false;
      window.showToast?.(error?.message || "No se pudo guardar la versión documental.");
    }
  });
  window.DocumentVersionEditor = {
    openRun: (runId, canonicalKey, documentRef) => loadEditor({ dataset: { runId, canonicalKey, documentRef } })
  };
})();
