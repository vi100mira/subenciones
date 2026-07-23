(function () {
  let activeUrl = null;
  let activeMeta = null;
  const VIEWABLE = new Set(["application/pdf", "image/jpeg", "image/png"]);

  function session() { return window.CredentialsAuth?.getSession?.(); }
  function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function toast(message) { if (typeof window.showToast === "function") window.showToast(message); }
  function close() {
    document.querySelector("[data-annex-viewer]")?.remove();
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = null; activeMeta = null;
  }
  function confirmRestricted(restricted, stored = false) {
    const traceability = stored
      ? "El acceso al Blob quedará auditado."
      : "La selección local no sale de este equipo.";
    return !restricted || window.confirm(`Documento personal o sensible. ${traceability} No se enviará a IA ni se crearán embeddings. ¿Mostrarlo?`);
  }
  function metaFrom(button) {
    return {
      id: button.dataset.annexOpen, title: button.dataset.annexTitle || "Documento privado",
      mime: button.dataset.annexMime || "", dataClass: button.dataset.annexClass || "internal",
      sha: button.dataset.annexSha || "", status: button.dataset.annexStatus || "pending",
      recommendation: button.dataset.annexRecommendation || "Revisión documental",
      restricted: button.dataset.annexRestricted === "true", stored: button.dataset.annexStored === "true"
    };
  }
  function statusLabel(status) {
    return ({ approved: "Aprobado", restricted: "Aprobado · restringido", rejected: "Descartado", blocked: "Bloqueado para IA" }[status] || "Por revisar");
  }
  function openShell(meta) {
    close(); activeMeta = meta;
    const decided = ["approved", "restricted", "rejected"].includes(meta.status);
    const approved = ["approved", "restricted"].includes(meta.status);
    const viewable = VIEWABLE.has(meta.mime);
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop annex-viewer-backdrop" data-annex-viewer>
      <article class="modal annex-viewer-modal" role="dialog" aria-modal="true" aria-labelledby="annex-viewer-title">
        <header class="annex-viewer-heading"><button class="ghost-action" data-annex-viewer-close type="button"><i data-lucide="arrow-left"></i>Base común</button>
          <div><p class="eyebrow">Documento de la entidad</p><h2 id="annex-viewer-title">${escapeHtml(meta.title)}</h2></div>
          <button class="icon-button" data-annex-viewer-close type="button" aria-label="Cerrar visor"><i data-lucide="x"></i></button></header>
        <div class="annex-viewer-workspace">
          <div class="annex-viewer-stage" data-annex-viewer-stage><div class="annex-viewer-empty"><i data-lucide="${viewable ? "file-search" : "file-down"}"></i>
            <strong>${meta.stored && viewable ? "Confirma el acceso para mostrar el original" : viewable ? "Selecciona el original para comprobarlo" : "Vista visual no disponible para este formato"}</strong>
            <span>${viewable ? "Se mostrará aquí, sin enviarlo a IA." : "DOCX y XLSX se mantienen como descarga privada hasta incorporar una conversión segura."}</span></div></div>
          <aside class="annex-viewer-sidebar">
            <div class="annex-viewer-status"><span class="badge ${approved ? "safe" : meta.status === "rejected" || meta.status === "blocked" ? "danger" : "warning"}">${statusLabel(meta.status)}</span><strong>${escapeHtml(meta.recommendation)}</strong></div>
            <dl><div><dt>Clase de datos</dt><dd>${escapeHtml(meta.dataClass)}</dd></div><div><dt>Formato</dt><dd>${escapeHtml(meta.mime)}</dd></div><div><dt>Huella</dt><dd>${escapeHtml(meta.sha.slice(0, 16))}</dd></div><div><dt>Original</dt><dd>${meta.stored ? "Blob privado" : "Carpeta local"}</dd></div></dl>
            <div class="annex-viewer-notice"><i data-lucide="${meta.restricted ? "shield-alert" : "shield-check"}"></i><span>${meta.restricted ? "Acceso restringido y auditado." : "No se comparte con IA ni se hace público."}</span></div>
            ${viewable && !meta.stored ? `<input hidden type="file" data-annex-local-preview data-annex-title="${escapeHtml(meta.title)}" data-annex-sha="${escapeHtml(meta.sha)}" data-annex-restricted="${meta.restricted}" accept=".pdf,.jpg,.jpeg,.png"><button class="primary-action" data-annex-local-select type="button"><i data-lucide="folder-open"></i>Seleccionar y visualizar original</button>` : ""}
            ${!decided ? `<button class="primary-action" data-document-candidate-review="${escapeHtml(meta.id)}" data-review-status="${meta.restricted ? "restricted" : "approved"}" type="button">${meta.restricted ? "Aprobar como restringido" : "Aprobar para Base común"}</button><button class="ghost-action" data-document-candidate-review="${escapeHtml(meta.id)}" data-review-status="rejected" type="button">Descartar documento</button>` : ""}
            ${approved && !meta.stored ? `<input hidden type="file" data-annex-file="${escapeHtml(meta.id)}" data-annex-restricted="${meta.restricted}" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"><button class="primary-action" data-annex-select type="button"><i data-lucide="lock-keyhole"></i>Guardar original privado</button>` : ""}
            ${meta.stored ? `<button class="ghost-action" data-annex-download="${escapeHtml(meta.id)}" type="button"><i data-lucide="download"></i>Descargar original</button>` : ""}
          </aside>
        </div>
        <footer><span>Revisión humana obligatoria antes de reutilizar o presentar.</span><button class="ghost-action" data-annex-viewer-close type="button">Cerrar</button></footer>
      </article></div>`);
    window.lucide?.createIcons();
  }
  function renderBlob(blob) {
    if (!activeMeta || !VIEWABLE.has(blob.type)) return void toast("Este formato no tiene vista previa visual.");
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = URL.createObjectURL(blob);
    const stage = document.querySelector("[data-annex-viewer-stage]");
    if (!stage) return;
    const content = blob.type === "application/pdf" ? `<iframe src="${activeUrl}" title="Vista previa de ${escapeHtml(activeMeta.title)}"></iframe>`
      : `<img src="${activeUrl}" alt="Vista previa de ${escapeHtml(activeMeta.title)}">`;
    const stamp = `${session()?.email || "usuario autorizado"} · ${new Date().toLocaleString("es-ES")}`;
    stage.innerHTML = `${content}<span class="annex-viewer-watermark" data-annex-viewer-watermark>${escapeHtml(stamp)}</span>`;
  }
  async function sha256(file) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  async function previewLocal(input) {
    const file = input.files?.[0]; if (!file || !activeMeta) return;
    try {
      if (!VIEWABLE.has(file.type)) throw new Error("La vista previa local admite PDF, JPG y PNG.");
      if (activeMeta.sha.length === 64 && await sha256(file) !== activeMeta.sha.toLowerCase()) throw new Error("El archivo no coincide con la huella del inventario.");
      if (confirmRestricted(activeMeta.restricted)) renderBlob(file);
    } catch (error) { toast(error.message); } finally { input.value = ""; }
  }
  async function previewStored(meta) {
    if (!VIEWABLE.has(meta.mime) || !confirmRestricted(meta.restricted, true)) return;
    try {
      const current = session();
      const response = await fetch(`/api/private-annex-file?documentId=${encodeURIComponent(meta.id)}&mode=preview`, {
        headers: { "x-tenant-id": current.tenantId, "x-annex-restricted-confirmed": String(meta.restricted), ...window.CredentialsAuth.authHeaders(current) }
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "No se pudo abrir el anexo");
      renderBlob(await response.blob());
    } catch (error) { toast(error.message); }
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (target?.matches("[data-annex-open]")) { const meta = metaFrom(target); openShell(meta); if (meta.stored) previewStored(meta); }
    if (target?.matches("[data-annex-local-select]")) target.parentElement?.querySelector("[data-annex-local-preview]")?.click();
    if (target?.matches("[data-annex-viewer-close]") || event.target?.matches?.("[data-annex-viewer]")) close();
  });
  document.addEventListener("change", (event) => {
    if (event.target.matches?.("[data-annex-local-preview]")) previewLocal(event.target);
  });
  window.PrivateAnnexViewer = { close };
})();
