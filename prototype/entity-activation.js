(function () {
  function applyIdentity() {
    const session = window.CredentialsAuth?.getSession?.();
    const rawName = session?.role === "entity" ? (session.label || "Entidad") : "Entidad";
    const name = rawName.replace(/\s+demo$/i, "");
    const active = session?.role === "entity" && session.tenantStatus === "active";
    document.querySelectorAll("[data-tenant-name]").forEach((node) => { node.textContent = name; });
    const status = document.querySelector("[data-tenant-status]");
    if (status) status.textContent = active ? "Verificada" : "Pendiente de comprobación";
    const note = document.querySelector("[data-tenant-status-note]");
    if (note) note.textContent = active ? "Acceso tenant activo y membresía validada." : "El acceso depende del estado tenant y la membresía.";
  }

  function renderActivation() {
    const screen = document.querySelector("#entity");
    if (!screen || screen.dataset.activationApplied) return;
    screen.dataset.activationApplied = "true";
    screen.innerHTML = `
      <article class="panel entity-hero">
        <div class="panel-heading">
          <div><p class="eyebrow">Entidad</p><h2 data-tenant-name>Entidad</h2></div>
        </div>
        <div class="entity-contract-grid">
          <div class="entity-contract-card"><p><i data-lucide="badge-check"></i><span>Alta institucional</span></p><strong data-tenant-status>Pendiente de comprobación</strong><small data-tenant-status-note>El acceso depende del estado tenant y la membresía.</small></div>
          <div class="entity-contract-card"><p><i data-lucide="briefcase-business"></i><span>Rol actual</span></p><strong>Gestor de subvenciones</strong><small>Puede usar oportunidades, candidaturas e información aprobada.</small></div>
          <div class="entity-contract-card"><p><i data-lucide="globe-2"></i><span>Web pública</span></p><strong data-tenant-web-status>Pendiente de comprobación</strong><small data-tenant-web-note>Requiere consentimiento vigente y fuente pública aprobada.</small></div>
          <div class="entity-contract-card"><p><i data-lucide="folder-lock"></i><span>Repositorio privado</span></p><strong>Pendiente</strong><small>Drive no conectado hasta consentimiento expreso.</small></div>
        </div>
        <div class="plain-note activation-note" id="onboarding-request-status">
          <p class="activation-note-title"><i data-lucide="shield-check"></i><strong>Alta segura completada</strong></p>
          <span>No crea usuarios, no conecta Drive y no aprueba datos automáticamente. El acceso de <span data-tenant-name>la entidad</span> depende de su estado y membresía.</span>
        </div>
      </article>

      `;
    applyIdentity();
    window.PlanAccess?.renderEntityPlan?.();
    window.lucide?.createIcons();
  }

  renderActivation();
  document.addEventListener("DOMContentLoaded", renderActivation);
  window.addEventListener("role-session-applied", applyIdentity);
})();
