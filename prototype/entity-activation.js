(function () {
  function applyIdentity() {
    const session = window.CredentialsAuth?.getSession?.();
    const name = session?.role === "entity" ? session.label : "Entidad";
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
          <div><span>Alta institucional</span><strong data-tenant-status>Pendiente de comprobación</strong><small data-tenant-status-note>El acceso depende del estado tenant y la membresía.</small></div>
          <div><span>Rol actual</span><strong>Gestor de subvenciones</strong><small>Puede usar oportunidades, candidaturas e información aprobada.</small></div>
          <div><span>Web pública</span><strong data-tenant-web-status>Pendiente de comprobación</strong><small data-tenant-web-note>Requiere consentimiento vigente y fuente pública aprobada.</small></div>
          <div><span>Repositorio privado</span><strong>Pendiente</strong><small>Drive no conectado hasta consentimiento expreso.</small></div>
        </div>
        <div class="plain-note activation-note" id="onboarding-request-status">
          <strong>Alta segura completada</strong>
          <span>No crea usuarios, no conecta Drive y no aprueba datos automáticamente. El acceso de <span data-tenant-name>la entidad</span> depende de su estado y membresía.</span>
        </div>
      </article>

      `;
    applyIdentity();
    window.lucide?.createIcons();
  }

  renderActivation();
  document.addEventListener("DOMContentLoaded", renderActivation);
  window.addEventListener("role-session-applied", applyIdentity);
})();
