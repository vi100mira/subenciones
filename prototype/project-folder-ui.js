(function () {
  const states = new Map();
  const loads = new Map();
  const runs = new Map();

  function session() {
    return window.CredentialsAuth?.getSession?.() || null;
  }

  function documentAgentContracted() {
    return (session()?.plan?.agentKeys || []).includes("draft_agent");
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function runSignature(run) {
    if (!run) return "none";
    return JSON.stringify({
      id: run.id || null,
      status: run.status || null,
      updatedAt: run.updated_at || null,
      review: run.human_review || null,
      provenance: run.output_json?.versionProvenance || null,
      documents: run.output_json?.documents || []
    });
  }

  function formatDate(value) {
    if (!value) return "Sin versión guardada";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function statusMeta(status) {
    return {
      final_approved: ["Consolidado", "safe"],
      reviewed_for_work: ["Revisado para trabajo", "safe"],
      in_progress: ["En preparación", "review"],
      unavailable_local: ["Original local", "warning"],
      pending: ["Pendiente", "warning"]
    }[status] || ["Pendiente", "warning"];
  }

  async function request(recommendationId) {
    const current = session();
    if (!current?.accessToken || !current?.tenantId) throw new Error("Falta una sesión válida del tenant.");
    const response = await fetch(`/api/candidature-project-folder?recommendationId=${encodeURIComponent(recommendationId)}`, {
      headers: { ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo reconstruir la carpeta de proyecto.");
    return payload.data;
  }

  function fileActions(file, checkId) {
    const view = file.kind === "generated"
      ? `<button class="ghost-action compact" data-project-file-view="${escapeHtml(file.id)}" type="button"><i data-lucide="scan-search"></i>Ver</button>`
      : file.kind === "tenant" && file.documentId && file.sourceConnectionId
        ? `<button class="ghost-action compact" data-annex-open="${escapeHtml(file.documentId)}" data-annex-source="${escapeHtml(file.sourceConnectionId)}" data-annex-title="${escapeHtml(file.title)}" data-annex-mime="${escapeHtml(file.mimeType)}" data-annex-class="${escapeHtml(file.dataClass)}" data-annex-sha="${escapeHtml(file.sha256)}" data-annex-status="approved" data-annex-recommendation="Vinculado a la carpeta de esta candidatura" data-annex-stored="${Boolean(file.available)}" type="button"><i data-lucide="scan-search"></i>Ver</button>`
        : "";
    const canDownload = file.available && (documentAgentContracted() || file.kind === "tenant");
    const download = canDownload
      ? `<button class="ghost-action compact" data-project-download="document" data-project-check-id="${escapeHtml(checkId)}" data-project-file-id="${escapeHtml(file.id)}" type="button"><i data-lucide="download"></i>Descargar</button>`
      : `<button class="ghost-action compact" type="button" disabled title="${!file.available ? "El original todavía no está archivado en el tenant" : "Preparación documental no está incluida en el plan"}"><i data-lucide="${!file.available ? "cloud-off" : "lock-keyhole"}"></i>${!file.available ? "No disponible" : "Solo lectura"}</button>`;
    return `<div class="project-folder-file-actions">${view}${download}</div>`;
  }

  function fileRow(file, checkId) {
    const [label, tone] = statusMeta(file.status);
    const version = file.version ? `Versión ${escapeHtml(file.version)}` : file.kind === "tenant" ? "Original de la entidad" : "Sin versión";
    return `<article class="project-folder-file">
      <i data-lucide="${file.kind === "generated" ? "file-pen-line" : file.kind === "tenant" ? "paperclip" : "file-question"}"></i>
      <div><strong>${escapeHtml(file.title)}</strong><span>${escapeHtml(file.originLabel)} · ${version}</span><small>${escapeHtml(file.dataClass || "internal")} · ${formatDate(file.updatedAt)}</small></div>
      <span class="badge ${tone}">${label}</span>
      ${fileActions(file, checkId)}
    </article>`;
  }

  function checkCard(check, index) {
    const [label, tone] = statusMeta(check.status);
    const available = check.files.filter((file) => file.available).length;
    return `<details class="project-folder-check" ${index === 0 ? "open" : ""}>
      <summary>
        <span class="project-folder-check-index">${index + 1}</span>
        <span><strong>${escapeHtml(check.title)}</strong><small>${check.files.length} fichero${check.files.length === 1 ? "" : "s"} · ${available} disponible${available === 1 ? "" : "s"}</small></span>
        <span class="badge ${tone}">${label}</span>
        <i data-lucide="chevron-down"></i>
      </summary>
      <div class="project-folder-check-body">
        ${check.missingInputs?.length ? `<div class="plain-note is-warning"><strong>Falta completar</strong><span>${check.missingInputs.map(escapeHtml).join(" · ")}</span></div>` : ""}
        ${check.files.length ? `<div class="project-folder-files">${check.files.map((file) => fileRow(file, check.id)).join("")}</div>` : `<div class="plain-note"><strong>Aún no hay ficheros</strong><span>Trabaja este requisito desde Documentos; la carpeta se actualizará al guardar una versión o vincular un anexo.</span></div>`}
        <div class="project-folder-check-actions"><button class="ghost-action" data-project-download="check" data-project-check-id="${escapeHtml(check.id)}" type="button" ${available && documentAgentContracted() ? "" : "disabled"}><i data-lucide="folder-down"></i>${documentAgentContracted() ? `Descargar este check (${available})` : "Solo lectura"}</button></div>
      </div>
    </details>`;
  }

  function renderHost(host, data) {
    const summary = data.summary;
    host.innerHTML = `<section class="project-folder">
      <div class="project-folder-heading">
        <div><p class="eyebrow">Expediente persistente del tenant</p><p>Consulta cómo avanza el paquete, aunque todavía esté incompleto o pendiente de conformidad.</p></div>
        <div class="button-row"><button class="ghost-action" data-project-go-documents type="button"><i data-lucide="files"></i>Ir a Documentos</button><button class="primary-action" data-project-download="all" type="button" ${summary.availableFiles && documentAgentContracted() ? "" : "disabled"}><i data-lucide="${documentAgentContracted() ? "folder-down" : "lock-keyhole"}"></i>${documentAgentContracted() ? `Descargar disponibles (${summary.availableFiles})` : "Carpeta en solo lectura"}</button></div>
      </div>
      <div class="project-folder-metrics">
        <span><strong>${summary.totalChecks}</strong> checks</span><span><strong>${summary.completedChecks}</strong> completos</span><span><strong>${summary.reviewChecks}</strong> en revisión</span><span><strong>${summary.pendingChecks}</strong> pendientes</span><span><strong>${summary.consolidatedFiles || 0}</strong> consolidados</span><span><strong>${summary.totalFiles}</strong> ficheros</span>
      </div>
      <div class="project-folder-version"><i data-lucide="history"></i><span>${escapeHtml(data.versionLabel)} · actualizado ${formatDate(data.updatedAt)}</span></div>
      <div class="project-folder-checks">${data.checks.map(checkCard).join("")}</div>
      <div class="plain-note"><strong>Descarga de trabajo gobernada</strong><span>Antes de descargar se registra tu revisión. Los documentos no aprobados se identifican como BORRADOR DE TRABAJO · NO PRESENTAR; la aprobación final no cambia.</span></div>
    </section>`;
    window.lucide?.createIcons();
  }

  function renderRecommendation(recommendationId) {
    const data = states.get(recommendationId);
    document.querySelectorAll(`[data-project-folder][data-recommendation-id="${CSS.escape(recommendationId)}"]`).forEach((host) => {
      if (data) renderHost(host, data);
      else host.innerHTML = '<div class="plain-note"><strong>Preparando la carpeta de proyecto</strong><span>Se está reconstruyendo el estado persistente del expediente.</span></div>';
    });
  }

  async function load(recommendationId, force = false) {
    if (!recommendationId) return;
    if (!force && states.has(recommendationId)) return renderRecommendation(recommendationId);
    if (loads.has(recommendationId)) return loads.get(recommendationId);
    renderRecommendation(recommendationId);
    const pending = request(recommendationId).then((data) => {
      states.set(recommendationId, data); renderRecommendation(recommendationId);
    }).catch((error) => {
      if (states.has(recommendationId)) {
        window.showToast?.("No se pudo actualizar la carpeta. Se mantiene la última versión disponible.");
        return;
      }
      document.querySelectorAll(`[data-project-folder][data-recommendation-id="${CSS.escape(recommendationId)}"]`).forEach((host) => {
        host.innerHTML = `<div class="plain-note is-warning"><strong>No se pudo abrir la carpeta</strong><span>${escapeHtml(error.message)}</span></div>`;
      });
    }).finally(() => loads.delete(recommendationId));
    loads.set(recommendationId, pending);
    return pending;
  }

  function renderAll(force = false) {
    document.querySelectorAll("[data-project-folder]").forEach((host) => load(host.dataset.recommendationId, force));
  }

  function generatedDocument(fileId) {
    for (const run of runs.values()) {
      const document = run?.output_json?.documents?.find((item) => item.documentRef === fileId);
      if (document) return document;
    }
    return null;
  }

  function openGeneratedPreview(fileId) {
    const generated = generatedDocument(fileId);
    if (!generated) return window.showToast?.("La versión todavía no está disponible. Actualiza la carpeta.");
    const sections = generated.sections.map((section) => `<section><h4>${escapeHtml(section.title)}</h4>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("");
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-project-file-preview><article class="modal project-file-preview" role="dialog" aria-modal="true"><div class="panel-heading"><div><p class="eyebrow">Fichero de proyecto · vista de trabajo</p><h2>${escapeHtml(generated.title)}</h2></div><button class="icon-button" data-project-file-preview-close type="button" aria-label="Cerrar visor"><i data-lucide="x"></i></button></div><div class="plain-note is-warning"><strong>Borrador de trabajo</strong><span>No está conformado ni listo para presentar.</span></div><div class="project-file-preview-body">${sections}</div></article></div>`);
    window.lucide?.createIcons();
  }

  async function download(button) {
    const host = button.closest("[data-project-folder]");
    const recommendationId = host?.dataset.recommendationId;
    if (!recommendationId || !window.confirm("Confirmo que he revisado esta descarga de trabajo y que no se presentará como expediente final.")) return;
    const current = session();
    button.disabled = true;
    try {
      const response = await fetch("/api/candidature-project-folder", {
        method: "POST", headers: { "Content-Type": "application/json", ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId },
        body: JSON.stringify({ recommendationId, scope: button.dataset.projectDownload,
          scopeRef: button.dataset.projectDownload === "document" ? button.dataset.projectFileId : button.dataset.projectCheckId || "all",
          fileId: button.dataset.projectFileId || null, acknowledgeWorkingCopy: true })
      });
      if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error || "No se pudo preparar la descarga."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url;
      const disposition = response.headers.get("content-disposition") || "";
      link.download = disposition.match(/filename="([^"]+)"/)?.[1] || "carpeta-proyecto.zip";
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      window.showToast?.("Descarga de trabajo registrada. No cambia la aprobación final.");
      await load(recommendationId, true);
    } catch (error) {
      window.showToast?.(error.message || "No se pudo descargar la carpeta de proyecto.");
    } finally { button.disabled = false; }
  }

  document.addEventListener("click", (event) => {
    const close = event.target.closest?.("[data-project-file-preview-close]");
    const backdrop = event.target.closest?.("[data-project-file-preview]");
    if (close || (backdrop && event.target === backdrop)) { backdrop?.remove(); return; }
    const view = event.target.closest?.("[data-project-file-view]"); if (view) { openGeneratedPreview(view.dataset.projectFileView); return; }
    const trigger = event.target.closest?.("[data-project-download]"); if (trigger) { download(trigger); return; }
    if (event.target.closest?.("[data-project-go-documents]")) {
      document.querySelector("[data-candidature-panel-modal]")?.remove();
      document.querySelector('[data-candidature-action="documents"]')?.click();
    }
  });
  window.addEventListener("draft-agent-run-updated", (event) => {
    const canonicalKey = event.detail?.canonicalKey;
    if (!canonicalKey) return;
    const previousRun = runs.get(canonicalKey);
    const nextRun = event.detail.run || null;
    runs.set(canonicalKey, nextRun);
    if (runSignature(previousRun) !== runSignature(nextRun)) renderAll(true);
  });
  window.addEventListener("draft-document-version-updated", () => renderAll(true));
  window.addEventListener("candidature-documents-updated", () => renderAll(true));
  window.addEventListener("project-folder-hosts-rendered", () => renderAll());
  window.addEventListener("role-session-applied", () => { states.clear(); loads.clear(); runs.clear(); renderAll(true); });
  document.addEventListener("DOMContentLoaded", () => renderAll());
})();
