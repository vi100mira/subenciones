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

  function session() {
    return window.CredentialsAuth?.getSession?.() || null;
  }

  function statusNodes(canonicalKey) {
    return [...document.querySelectorAll(`[data-draft-agent-status="${CSS.escape(canonicalKey)}"]`)];
  }

  function render(canonicalKey, run, fallback) {
    const review = run?.human_review;
    const label = review?.status === "approved" ? [review.docx_blob_path ? "Aprobado y exportado" : "Aprobado para exportar", "La revisión humana autoriza generar DOCX y PDF privados; nunca presentar automáticamente."]
      : review?.status === "rejected" ? ["Borrador rechazado", review.review_note || "Debe corregirse antes de volver a generar."]
      : run ? labels[run.status] || [run.status, "Estado registrado por el worker."] : ["Sin ejecución", fallback || "Solicita un borrador cuando la convocatoria y sus límites estén verificados."];
    statusNodes(canonicalKey).forEach((node) => {
      node.classList.add("plain-note");
      node.replaceChildren();
      const strong = document.createElement("strong");
      const span = document.createElement("span");
      strong.textContent = label[0];
      span.textContent = run?.error ? `${label[1]} ${run.error}` : label[1];
      node.append(strong, span);
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
      if (run?.status === "review_required") {
        const controls = document.createElement("div"); controls.className = "draft-review-controls";
        if (!review) {
          const note = document.createElement("textarea"); note.dataset.draftReviewNote = run.id; note.placeholder = "Nota de revisión (obligatoria si se rechaza)"; note.rows = 2;
          const actions = document.createElement("div"); actions.className = "button-row";
          for (const [status, text, className] of [["rejected", "Rechazar y corregir", "ghost-action"], ["approved", "Aprobar para exportar", "primary-action"]]) {
            const button = document.createElement("button"); button.type = "button"; button.className = className;
            button.dataset.draftReviewAction = status; button.dataset.draftRunId = run.id; button.dataset.canonicalKey = canonicalKey; button.textContent = text; actions.append(button);
          }
          controls.append(note, actions);
        } else if (review.status === "approved") {
          const actions = document.createElement("div"); actions.className = "button-row";
          if (!review.docx_blob_path) {
            const exportButton = document.createElement("button"); exportButton.type = "button"; exportButton.className = "primary-action";
            exportButton.dataset.draftExport = run.id; exportButton.dataset.canonicalKey = canonicalKey; exportButton.textContent = "Generar DOCX y PDF privados"; actions.append(exportButton);
          } else {
            const downloads = review.validation_json?.package?.pathname ? [["package", "Descargar expediente ZIP"]] : [];
            downloads.push(["docx", "Descargar DOCX conjunto"], ["pdf", "Descargar PDF de validación"]);
            for (const [type, text] of downloads) {
              const button = document.createElement("button"); button.type = "button"; button.className = "ghost-action";
              button.dataset.draftDownload = type; button.dataset.reviewId = review.id; button.textContent = text; actions.append(button);
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
      button.textContent = active ? "Ejecución del redactor activa" : button.dataset.approvedFacts === "true" ? "Borrador personalizado" : "Borrador base (solo publico)";
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
    const run = (payload.data || []).find((item) => item.input_manifest_json?.canonicalKey === canonicalKey) || null;
    render(canonicalKey, run);
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

  async function downloadDraft(button) {
    const current = session(); button.disabled = true; const type = button.dataset.draftDownload;
    const response = await fetch(`/api/private-draft-download?reviewId=${encodeURIComponent(button.dataset.reviewId)}&type=${type}`, { headers: { ...window.CredentialsAuth.authHeaders(current), "x-tenant-id": current.tenantId } }).catch(() => null);
    if (!response?.ok) { const payload = await response?.json().catch(() => null); window.showToast?.(payload?.error || "No se pudo descargar el documento privado."); button.disabled = false; return; }
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = type === "package" ? "expediente-documental-aprobado.zip" : `borrador-aprobado.${type}`; link.click(); URL.revokeObjectURL(url); button.disabled = false;
  }

  document.addEventListener("click", (event) => {
    const reviewButton = event.target.closest?.("[data-draft-review-action]"); if (reviewButton) { reviewDraft(reviewButton); return; }
    const exportButton = event.target.closest?.("[data-draft-export]"); if (exportButton) { exportDraft(exportButton); return; }
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
  setInterval(refreshVisible, 15000);
})();
