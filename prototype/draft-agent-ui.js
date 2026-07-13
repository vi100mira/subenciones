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

  function session() {
    return window.CredentialsAuth?.getSession?.() || null;
  }

  function statusNodes(canonicalKey) {
    return [...document.querySelectorAll(`[data-draft-agent-status="${CSS.escape(canonicalKey)}"]`)];
  }

  function render(canonicalKey, run, fallback) {
    const label = run ? labels[run.status] || [run.status, "Estado registrado por el worker."] : ["Sin ejecución", fallback || "Solicita un borrador cuando la convocatoria y sus límites estén verificados."];
    statusNodes(canonicalKey).forEach((node) => {
      node.classList.add("plain-note");
      node.replaceChildren();
      const strong = document.createElement("strong");
      const span = document.createElement("span");
      strong.textContent = label[0];
      span.textContent = run?.error ? `${label[1]} ${run.error}` : label[1];
      node.append(strong, span);
    });
    const active = ["queued", "preparing_context", "awaiting_provider", "generating"].includes(run?.status);
    document.querySelectorAll(`[data-draft-agent-start="${CSS.escape(canonicalKey)}"]`).forEach((button) => {
      button.disabled = active;
      button.textContent = active ? "Ejecución del redactor activa" : "Solicitar borrador IA";
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
      body: JSON.stringify({ canonicalKey, useApprovedInternalFacts: false })
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

  document.addEventListener("click", (event) => {
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
