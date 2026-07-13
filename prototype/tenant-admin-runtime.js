(function () {
  function session() {
    const value = window.CredentialsAuth?.getSession?.();
    return value?.role === "superadmin" && value?.accessToken ? value : null;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function slugify(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function request(path, options = {}) {
    const current = session();
    if (!current) throw new Error("Sesión superadmin no disponible");
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...window.CredentialsAuth.authHeaders(current), ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Error HTTP ${response.status}`);
    return payload.data;
  }

  function status(title, message, tone = "review") {
    const host = document.querySelector("[data-tenant-admin-status]");
    if (!host) return;
    host.className = `plain-note ${tone === "safe" ? "is-safe" : ""}`;
    host.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  }

  function downloadBlueprint(data, slug) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tenant-blueprint-${slug}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportBlueprint(slug) {
    const data = await request(`/api/admin-tenant-provision?slug=${encodeURIComponent(slug)}`);
    downloadBlueprint(data, slug);
    status("Blueprint exportado", `Huella ${data.blueprintHash}. No contiene consentimientos, secretos ni documentos privados.`, "safe");
  }

  function lifecycleModal(action, slug) {
    document.querySelector(".modal-backdrop")?.remove();
    const labels = { activate: "Activar tenant", archive: "Archivar tenant", restore: "Restaurar tenant" };
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-close-modal><article class="modal tenant-op-modal" role="dialog" aria-modal="true"><div class="panel-heading"><div><p class="eyebrow">Ciclo de vida auditado</p><h2>${labels[action]}</h2></div><button class="icon-button" data-close-modal type="button">X</button></div><div class="inline-form"><label><span>Motivo obligatorio</span><input data-tenant-lifecycle-reason value="Operación administrativa verificada" /></label></div><div class="plain-note"><strong>Sin borrado definitivo</strong><span>La operación conserva trazabilidad y no concede consentimientos.</span></div><div class="button-row"><button class="primary-action" data-tenant-lifecycle-confirm="${action}" data-tenant-slug="${escapeHtml(slug)}" type="button">Confirmar</button><button class="ghost-action" data-close-modal type="button">Cancelar</button></div></article></div>`);
  }

  async function lifecycle(button) {
    const reason = document.querySelector("[data-tenant-lifecycle-reason]")?.value || "";
    const action = button.dataset.tenantLifecycleConfirm;
    const slug = button.dataset.tenantSlug;
    const data = await request("/api/admin-tenant-lifecycle", { method: "PATCH", body: JSON.stringify({ action, slug, reason }) });
    document.querySelector(".modal-backdrop")?.remove();
    status("Ciclo de vida actualizado", `${data.organization.name}: ${data.status}. Agentes reconciliados según puertas reales.`, "safe");
  }

  async function provision() {
    const name = document.querySelector('[data-tenant-create="name"]')?.value.trim() || "";
    const websiteUrl = document.querySelector('[data-tenant-create="website"]')?.value.trim() || "";
    const ownerEmail = document.querySelector('[data-tenant-create="owner-email"]')?.value.trim() || "";
    const slug = slugify(name);
    if (!name || !slug) throw new Error("Falta un nombre de entidad válido");
    const blueprint = { version: 1, entity: { name, slug, displayName: name, websiteUrl: websiteUrl || null, primaryColor: "#24515a" }, profile: {}, motivations: { created_from: "platform_console" } };
    const data = await request("/api/admin-tenant-provision", { method: "POST", body: JSON.stringify({ blueprint, ownerEmail }) });
    const blocked = (data.agents || []).filter((agent) => !agent.enabled).length;
    status("Estructura tenant creada", `${data.slug}: ${data.agents?.length || 0} agentes provisionados, ${blocked} esperan consentimiento, fuente o perfil. Activa el tenant tras revisar.`, "safe");
  }

  document.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const provisionButton = target?.closest("[data-tenant-provision]");
    const actionButton = target?.closest("[data-tenant-admin-action]");
    const confirmButton = target?.closest("[data-tenant-lifecycle-confirm]");
    try {
      if (provisionButton) { provisionButton.disabled = true; await provision(); provisionButton.disabled = false; }
      if (actionButton) {
        const slug = actionButton.closest("[data-tenant-slug]")?.dataset.tenantSlug;
        if (actionButton.dataset.tenantAdminAction === "export") await exportBlueprint(slug);
        else lifecycleModal(actionButton.dataset.tenantAdminAction, slug);
      }
      if (confirmButton) { confirmButton.disabled = true; await lifecycle(confirmButton); }
    } catch (error) {
      if (provisionButton) provisionButton.disabled = false;
      if (confirmButton) confirmButton.disabled = false;
      status("Operación no completada", error.message);
    }
  });
})();
