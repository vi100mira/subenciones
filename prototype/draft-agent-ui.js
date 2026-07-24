(function () {
  const labels = {
    queued: ["En cola", "La petición espera al worker asíncrono."],
    preparing_context: ["Preparando contexto", "Se vuelven a comprobar plazo, versión, límites y consentimiento."],
    awaiting_provider: ["Esperando proveedor IA", "No hay proveedor autorizado. No se ha generado ni enviado contenido."],
    generating: ["Generando borrador", "El proveedor trabaja con contexto mínimo y salida estructurada."],
    review_required: ["Revisión humana obligatoria", "El borrador debe superar PDF, límites y aprobación antes de cualquier uso externo."],
    failed: ["Ejecución bloqueada", "Revisa el error y la evidencia antes de reintentar."],
    cancelled: ["Ejecución cancelada", "No se conserva ninguna salida activa."]
  };
  const preparationLabels = {
    drafted_in_proposal: "Redactado en la propuesta",
    official_template_required: "Requiere plantilla oficial",
    tenant_evidence_required: "Debe aportarlo la entidad",
    human_completion_required: "Requiere cumplimentacion humana",
    pending_classification: "Pendiente de clasificar"
  };
  const categoryLabels = {
    generated_draft: "Contenido redactado por el agente",
    official_form: "Modelo oficial",
    supporting_evidence: "Evidencia de la entidad",
    declaration: "Declaración para completar y firmar",
    other: "Documento pendiente de clasificar"
  };
  const previewRuns = new Map();
  const latestRuns = new Map();
  let previewObjectUrl = "";

  function session() {
    return window.CredentialsAuth?.getSession?.() || null;
  }

  function statusNodes(canonicalKey) {
    return [...document.querySelectorAll(`[data-draft-agent-status="${CSS.escape(canonicalKey)}"]`)];
  }

  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function render(canonicalKey, run, fallback, approvedKnowledge = {}) {
    latestRuns.set(canonicalKey, run || null);
    window.dispatchEvent(new CustomEvent("draft-agent-run-updated", { detail: { canonicalKey, run: run || null } }));
    const review = run?.human_review;
    const approvedFactCount = Number(approvedKnowledge.factCount || 0);
    const latestApprovedAt = approvedKnowledge.latestApprovedAt || null;
    const knowledgeIsNewer = Boolean(run?.created_at && latestApprovedAt && new Date(latestApprovedAt) > new Date(run.created_at));
    if (review?.id) previewRuns.set(review.id, run);
    const completeOutput = Array.isArray(run?.output_json?.documents) && run.output_json.documents.length > 0
      && Array.isArray(run?.output_json?.documentPlan) && run.output_json.documentPlan.length > 0;
    const label = review?.status === "approved" ? [review.docx_blob_path ? "Aprobado y exportado" : "Aprobado para exportar", "La revisión humana autoriza generar DOCX y PDF privados; nunca presentar automáticamente."]
      : review?.status === "rejected" ? ["Borrador rechazado", review.review_note || "Debe corregirse antes de volver a generar."]
      : run?.status === "review_required" && !completeOutput ? ["Resultado heredado incompleto", "Esta ejecución no contiene borradores ni plan documental. Debe generarse de nuevo cuando las bases estén revisadas."]
      : run ? labels[run.status] || [run.status, "Estado registrado por el worker."] : ["Sin ejecución", fallback || "Solicita un borrador cuando la convocatoria y sus límites estén verificados."];
    statusNodes(canonicalKey).forEach((node) => {
      node.classList.add("plain-note");
      node.replaceChildren();
      const strong = document.createElement("strong");
      const span = document.createElement("span");
      strong.textContent = label[0];
      span.textContent = run?.error ? `${label[1]} ${run.error}` : label[1];
      node.append(strong, span);
      const retrieval = run?.context_manifest_json?.privateRetrieval || run?.input_manifest_json?.privateRetrieval;
      if (retrieval?.mode === "approved_fact_hybrid_v1") {
        const retrievalNote = document.createElement("small");
        retrievalNote.textContent = `Conocimiento privado recuperado: ${retrieval.selectedCount || 0} de ${retrieval.candidateCount || 0} hechos aprobados · referencias preservadas · recuperación con 0 llamadas IA.`;
        node.append(retrievalNote);
      }
      if (approvedFactCount > 0) {
        const knowledgeNote = document.createElement("small");
        knowledgeNote.textContent = knowledgeIsNewer
          ? `${approvedFactCount} hechos aprobados están disponibles y la última aprobación (${formatDate(latestApprovedAt)}) es posterior a este borrador. Genera una nueva versión personalizada para aplicarlos sin alterar la anterior.`
          : !run
            ? `${approvedFactCount} hechos aprobados están preparados. Se recuperarán solo los pertinentes cuando las bases permitan generar el borrador personalizado.`
            : run.use_approved_internal_facts
            ? `${approvedFactCount} hechos aprobados están disponibles para futuras versiones. Este borrador conserva el conjunto recuperado en su manifiesto.`
            : `${approvedFactCount} hechos aprobados están disponibles para generar una versión personalizada; el borrador público actual no los utiliza.`;
        node.append(knowledgeNote);
      }
      if (Number.isFinite(Number(run?.usage_json?.estimated_eur))) {
        const costNote = document.createElement("small");
        costNote.textContent = `Generación IA: ${Number(run.usage_json.estimated_eur).toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 4 })} · ${Number(run.usage_json.total_tokens || 0)} tokens.`;
        node.append(costNote);
      }
      if (run?.status === "review_required" && run.output_json?.documents?.length) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Abrir borrador para revisión";
        details.append(summary);
        const heading = document.createElement("h4");
        heading.textContent = run.output_json.title || "Expediente de borradores";
        details.append(heading);
        run.output_json.documents.forEach((draft) => {
          const documentTitle = document.createElement("h5");
          documentTitle.textContent = `${draft.role === "primary_proposal" ? "Documento principal" : "Anexo redactable"}: ${draft.title}`;
          details.append(documentTitle);
          (draft.sections || []).forEach((section) => {
            const title = document.createElement("h6"); title.textContent = section.title; details.append(title);
            (section.paragraphs || []).forEach((paragraph) => {
              const text = document.createElement("p"); text.textContent = paragraph; details.append(text);
            });
          });
          if (draft.missingInputs?.length) {
            const pending = document.createElement("small"); pending.textContent = `Datos pendientes: ${draft.missingInputs.join(" · ")}`; details.append(pending);
          }
        });
        if (run.output_json.documentPlan?.length) {
          const planTitle = document.createElement("h5"); planTitle.textContent = "Plan documental exigido por las bases"; details.append(planTitle);
          const plan = document.createElement("ul"); plan.className = "basis-evidence-list";
          run.output_json.documentPlan.forEach((item) => {
            const row = document.createElement("li");
            const title = document.createElement("strong"); title.textContent = item.title;
            const status = document.createElement("span"); status.textContent = `${categoryLabels[item.category] || item.category} · ${preparationLabels[item.preparation] || item.preparation}`;
            const pending = document.createElement("small"); pending.textContent = item.missingInputs?.length ? `Pendiente: ${item.missingInputs.join(" · ")}` : `Cubre ${item.requirementRefs?.join(", ") || "un requisito revisado"}; sin datos pendientes declarados`;
            row.append(title, status, pending); plan.append(row);
          });
          details.append(plan);
        }
        if (run.output_json.uncertainties?.length) {
          const warning = document.createElement("p");
          warning.textContent = `Pendiente de revisión: ${run.output_json.uncertainties.join(" · ")}`;
          details.append(warning);
        }
        node.append(details);
      }
      if (run?.status === "review_required" && completeOutput) {
        const controls = document.createElement("div"); controls.className = "draft-review-controls";
        if (!review) {
          const note = document.createElement("textarea"); note.dataset.draftReviewNote = run.id; note.placeholder = "Nota de revisión (obligatoria si se rechaza)"; note.rows = 2;
          const actions = document.createElement("div"); actions.className = "button-row";
          for (const [status, text, className] of [["rejected", "Rechazar y corregir", "ghost-action"], ["approved", "Aprobar para exportar", "primary-action"]]) {
            const button = document.createElement("button"); button.type = "button"; button.className = className;
            button.dataset.draftReviewAction = status; button.dataset.draftRunId = run.id; button.dataset.canonicalKey = canonicalKey; button.textContent = text; actions.append(button);
          }
          controls.append(note, actions);
        } else if (review.status === "pending" && review.validation_json?.draftVersionId) {
          const note = document.createElement("small");
          note.textContent = "Existe una versión humana en edición. Ábrela desde Ver documento para guardarla, compararla y aprobarla.";
          controls.append(note);
        } else if (review.status === "approved") {
          const actions = document.createElement("div"); actions.className = "button-row";
          if (!review.docx_blob_path) {
            const exportButton = document.createElement("button"); exportButton.type = "button"; exportButton.className = "primary-action";
            exportButton.dataset.draftExport = run.id; exportButton.dataset.canonicalKey = canonicalKey; exportButton.textContent = "Generar DOCX y PDF privados"; actions.append(exportButton);
          } else {
            const previews = review.validation_json?.package?.pathname ? [["package", "Ver expediente ZIP"]] : [];
            previews.push(["docx", "Ver DOCX conjunto"], ["pdf", "Ver PDF de validación"]);
            for (const [type, text] of previews) {
              const button = document.createElement("button"); button.type = "button"; button.className = "ghost-action";
              button.dataset.draftPreview = type; button.dataset.reviewId = review.id; button.textContent = text; actions.append(button);
            }
          }
          controls.append(actions);
        }
        node.append(controls);
      }
    });
    const active = ["queued", "preparing_context", "awaiting_provider", "generating"].includes(run?.status);
    document.querySelectorAll(`[data-draft-agent-start="${CSS.escape(canonicalKey)}"]`).forEach((button) => {
      button.disabled = active;
      if (active) button.textContent = "Ejecución del redactor activa";
      else if (button.dataset.approvedFacts === "true") {
        button.textContent = run && approvedFactCount
          ? `Regenerar con conocimiento aprobado${approvedFactCount ? ` (${approvedFactCount})` : ""}`
          : run ? "Generar nueva versión personalizada"
            : `Generar borrador personalizado${approvedFactCount ? ` (${approvedFactCount})` : ""}`;
      } else button.textContent = run ? "Generar nueva versión pública" : "Generar borrador público";
    });
  }

  async function loadRuns(canonicalKey) {
    const current = session();
    if (!current?.accessToken || !current?.tenantId) {
      render(canonicalKey, null, "Inicia sesión como entidad para consultar o encolar el redactor.");
      return null;
    }
    const response = await fetch("/api/draft-agent-runs", { headers: { ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId } }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    if (!response?.ok || !payload?.ok) {
      render(canonicalKey, null, payload?.error || "No se pudo consultar la cola del redactor.");
      return null;
    }
    const runs = Array.isArray(payload.data) ? payload.data : payload.data?.runs || [];
    const approvedKnowledge = Array.isArray(payload.data) ? {} : payload.data?.approvedKnowledge || {};
    const run = runs.find((item) => item.input_manifest_json?.canonicalKey === canonicalKey) || null;
    render(canonicalKey, run, null, approvedKnowledge);
    return run;
  }

  async function enqueue(button) {
    const canonicalKey = button.dataset.draftAgentStart;
    const current = session();
    if (!current?.accessToken || !current?.tenantId) {
      render(canonicalKey, null, "Inicia sesión como entidad antes de solicitar el borrador.");
      return;
    }
    button.disabled = true;
    render(canonicalKey, { status: "queued" });
    const response = await fetch("/api/draft-agent-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId },
      body: JSON.stringify({ canonicalKey, useApprovedInternalFacts: button.dataset.approvedFacts === "true" })
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    button.disabled = false;
    if (!response?.ok || !payload?.ok) {
      if (response?.status === 409) {
        await loadRuns(canonicalKey);
        return;
      }
      render(canonicalKey, { status: "failed", error: payload?.error || "No se pudo encolar." });
      return;
    }
    render(canonicalKey, payload.data.run);
    setTimeout(() => loadRuns(canonicalKey), 1800);
  }

  async function reviewDraft(button) {
    const current = session(); const canonicalKey = button.dataset.canonicalKey;
    const note = document.querySelector(`[data-draft-review-note="${CSS.escape(button.dataset.draftRunId)}"]`)?.value || "";
    button.disabled = true;
    const response = await fetch("/api/draft-agent-runs", { method: "PATCH", headers: { "Content-Type": "application/json", ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId }, body: JSON.stringify({ runId: button.dataset.draftRunId, reviewStatus: button.dataset.draftReviewAction, note }) }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    if (!response?.ok || !payload?.ok) { window.showToast?.(payload?.error || "No se pudo registrar la revisión."); button.disabled = false; return; }
    window.showToast?.(payload.data.message); await loadRuns(canonicalKey);
  }

  async function exportDraft(button) {
    const current = session(); const canonicalKey = button.dataset.canonicalKey; button.disabled = true;
    const response = await fetch("/api/approved-draft-document", { method: "POST", headers: { "Content-Type": "application/json", ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId }, body: JSON.stringify({ runId: button.dataset.draftExport }) }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    window.showToast?.(response?.ok && payload?.ok ? "Expediente ZIP, DOCX y PDF privados generados y auditados." : payload?.error || "No se pudo generar la exportación.");
    button.disabled = false; await loadRuns(canonicalKey);
  }

  function closeDraftPreview() {
    document.querySelector("[data-draft-preview-modal]")?.remove();
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
  }

  function appendGeneratedDocuments(container, output, includePlan) {
    (output?.documents || []).forEach((draft) => {
      const page = document.createElement("article"); page.className = "draft-preview-page";
      const title = document.createElement("h3"); title.textContent = draft.title || "Documento sin titulo"; page.append(title);
      const meta = document.createElement("p"); meta.className = "draft-preview-meta";
      meta.textContent = `${draft.role === "primary_proposal" ? "Documento principal" : "Anexo redactable"} · ${(draft.requirementRefs || []).join(", ") || "Requisito pendiente"}`; page.append(meta);
      (draft.sections || []).forEach((section) => {
        const heading = document.createElement("h4"); heading.textContent = section.title; page.append(heading);
        (section.paragraphs || []).forEach((paragraph) => { const text = document.createElement("p"); text.textContent = paragraph; page.append(text); });
      });
      if (draft.missingInputs?.length) { const pending = document.createElement("div"); pending.className = "plain-note"; pending.textContent = `Datos pendientes: ${draft.missingInputs.join(" · ")}`; page.append(pending); }
      container.append(page);
    });
    if (includePlan && output?.documentPlan?.length) {
      const plan = document.createElement("article"); plan.className = "draft-preview-page";
      const heading = document.createElement("h3"); heading.textContent = "Indice del expediente documental"; plan.append(heading);
      const list = document.createElement("ul"); list.className = "basis-evidence-list";
      output.documentPlan.forEach((item) => {
        const row = document.createElement("li");
        const title = document.createElement("strong"); title.textContent = item.title;
        const status = document.createElement("span"); status.textContent = `${categoryLabels[item.category] || item.category} · ${preparationLabels[item.preparation] || item.preparation}`;
        row.append(title, status); list.append(row);
      });
      plan.append(list); container.append(plan);
    }
  }

  async function fetchDraftBlob(reviewId, type) {
    const current = session();
    const response = await fetch(`/api/private-draft-download?reviewId=${encodeURIComponent(reviewId)}&type=${type}`, { headers: { ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId } }).catch(() => null);
    if (!response?.ok) { const payload = await response?.json().catch(() => null); throw new Error(payload?.error || "No se pudo recuperar el documento privado."); }
    return response.blob();
  }

  async function openDraftPreview(button) {
    const type = ["docx", "pdf", "package"].includes(button.dataset.draftPreview) ? button.dataset.draftPreview : "";
    const run = previewRuns.get(button.dataset.reviewId);
    if (!type || !run?.output_json) return window.showToast?.("La vista previa ya no esta disponible. Actualiza la candidatura.");
    closeDraftPreview();
    const labels = { docx: ["DOCX conjunto", "Representacion fiel del contenido aprobado; la paginacion final puede variar en Word."], pdf: ["PDF de validacion", "Documento final renderizado para comprobar su aspecto antes de descargar."], package: ["Expediente ZIP", "Indice y contenido de los documentos incluidos en el paquete aprobado."] };
    const backdrop = document.createElement("div"); backdrop.className = "modal-backdrop"; backdrop.dataset.draftPreviewModal = "true";
    backdrop.innerHTML = `<article class="modal draft-preview-modal" role="dialog" aria-modal="true" aria-labelledby="draft-preview-title"><div class="panel-heading"><div><p class="eyebrow">Visor previo a la descarga</p><h2 id="draft-preview-title">${labels[type][0]}</h2></div><button class="icon-button" data-close-draft-preview type="button" aria-label="Cerrar visor"><i data-lucide="x"></i></button></div><div class="plain-note"><strong>Revisa antes de descargar</strong><span>${labels[type][1]} El archivo sigue siendo privado del tenant y no se presenta automaticamente.</span></div><div class="draft-preview-body" data-draft-preview-body></div><div class="button-row"><button class="primary-action" data-draft-download="${type}" data-review-id="${button.dataset.reviewId}" type="button"><i data-lucide="download"></i> Descargar ${labels[type][0]}</button><button class="ghost-action" data-close-draft-preview type="button">Cerrar</button></div></article>`;
    document.body.append(backdrop);
    const body = backdrop.querySelector("[data-draft-preview-body]");
    const downloadButton = backdrop.querySelector("[data-draft-download]");
    if (type === "pdf") {
      downloadButton.disabled = true;
      body.innerHTML = '<div class="plain-note"><strong>Cargando PDF privado...</strong><span>La vista se prepara en memoria y no guarda una copia local.</span></div>';
      try {
        previewObjectUrl = URL.createObjectURL(await fetchDraftBlob(button.dataset.reviewId, type));
        body.innerHTML = `<iframe class="draft-preview-frame" title="Vista previa del PDF aprobado" src="${previewObjectUrl}"></iframe>`;
        downloadButton.disabled = false;
      } catch (error) {
        const note = document.createElement("div"); note.className = "plain-note";
        const strong = document.createElement("strong"); strong.textContent = "Vista previa no disponible";
        const message = document.createElement("span"); message.textContent = error.message;
        note.append(strong, message); body.replaceChildren(note);
      }
    } else appendGeneratedDocuments(body, run.output_json, type === "package");
    window.lucide?.createIcons();
  }

  async function downloadDraft(button) {
    if (!button.closest("[data-draft-preview-modal]")) return;
    const current = session(); button.disabled = true; const type = button.dataset.draftDownload;
    const response = await fetch(`/api/private-draft-download?reviewId=${encodeURIComponent(button.dataset.reviewId)}&type=${type}`, { headers: { ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId } }).catch(() => null);
    if (!response?.ok) { const payload = await response?.json().catch(() => null); window.showToast?.(payload?.error || "No se pudo descargar el documento privado."); button.disabled = false; return; }
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = type === "package" ? "expediente-documental-aprobado.zip" : `borrador-aprobado.${type}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); button.disabled = false;
  }

  document.addEventListener("click", (event) => {
    const closePreview = event.target.closest?.("[data-close-draft-preview]"); if (closePreview) { closeDraftPreview(); return; }
    const previewBackdrop = event.target.closest?.("[data-draft-preview-modal]"); if (previewBackdrop && event.target === previewBackdrop) { closeDraftPreview(); return; }
    const reviewButton = event.target.closest?.("[data-draft-review-action]"); if (reviewButton) { reviewDraft(reviewButton); return; }
    const exportButton = event.target.closest?.("[data-draft-export]"); if (exportButton) { exportDraft(exportButton); return; }
    const preview = event.target.closest?.("[data-draft-preview]"); if (preview) { openDraftPreview(preview); return; }
    const download = event.target.closest?.("[data-draft-download]"); if (download) { downloadDraft(download); return; }
    const button = event.target.closest?.("[data-draft-agent-start]");
    if (button) enqueue(button);
  });
  function refreshVisible() {
    [...new Set([...document.querySelectorAll("[data-draft-agent-status]")].map((node) => node.dataset.draftAgentStatus).filter(Boolean))].forEach(loadRuns);
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(refreshVisible, 200));
  window.addEventListener("hashchange", () => setTimeout(refreshVisible, 250));
  window.addEventListener("workspace-candidates-changed", () => setTimeout(refreshVisible, 250));
  window.addEventListener("draft-agent-hosts-rendered", () => setTimeout(refreshVisible, 0));
  window.addEventListener("role-session-applied", () => { previewRuns.clear(); latestRuns.clear(); closeDraftPreview(); });
  setInterval(refreshVisible, 15000);
})();
