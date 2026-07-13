(function () {
  function renderActivation() {
    const screen = document.querySelector("#entity");
    if (!screen || screen.dataset.activationApplied) return;
    screen.dataset.activationApplied = "true";
    screen.innerHTML = `
      <article class="panel entity-hero">
        <div class="panel-heading">
          <div><p class="eyebrow">Entidad activa</p><h2>Novaterra</h2></div>
        </div>
        <div class="entity-contract-grid">
          <div><span>Alta institucional</span><strong>Verificada</strong><small>Email admin validado y condiciones aceptadas.</small></div>
          <div><span>Rol actual</span><strong>Gestor de subvenciones</strong><small>Puede usar oportunidades, candidaturas e información aprobada.</small></div>
          <div><span>Web publica</span><strong>Autorizada</strong><small>Solo lectura de informacion abierta de la entidad.</small></div>
          <div><span>Repositorio privado</span><strong>Pendiente</strong><small>Drive no conectado hasta consentimiento expreso.</small></div>
        </div>
        <div class="plain-note activation-note" id="onboarding-request-status">
          <strong>Alta segura completada</strong>
          <span>No crea usuarios, no conecta Drive y no aprueba datos automaticamente. El acceso de Novaterra queda activo solo tras validacion y aceptacion de condiciones.</span>
        </div>
      </article>

      `;
    window.lucide?.createIcons();
  }

  renderActivation();
  document.addEventListener("DOMContentLoaded", renderActivation);
})();
