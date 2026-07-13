(function () {
  const key = "subvenciones.audit.events.v1";
  const safeRead = () => {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  };
  const safeWrite = (events) => localStorage.setItem(key, JSON.stringify(events.slice(-80)));
  const nowTime = () => new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const id = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  function render() {
    const target = document.querySelector("#audit-timeline");
    if (!target) return;
    const events = safeRead();
    document.querySelector("#audit .panel-heading h2").textContent = "Eventos reales de sesion";
    target.innerHTML = `<div class="plain-note"><strong>Auditoria local activa</strong><span>Estos eventos se registran al interactuar con la app. No contienen datos privados ni sustituyen la tabla Supabase audit_events productiva.</span></div>` + events.slice().reverse().map((item) => `
      <div class="timeline-item">
        <time>${item.time}</time>
        <div><strong>${item.event}</strong><span>${item.actor} - ${item.scope} - ${item.detail}</span></div>
        <button class="info-dot" title="${item.info}" aria-label="Informacion de auditoria">i</button>
      </div>`).join("");
  }

  window.getAuditEvents = safeRead;
  window.auditEvent = (event) => {
    const entry = {
      id: id(),
      time: nowTime(),
      iso: new Date().toISOString(),
      actor: document.body.dataset.role === "superadmin" ? "Superadmin plataforma" : "Usuario entidad",
      scope: document.body.dataset.role === "superadmin" ? "platform" : "tenant:novaterra",
      event: event.event || "Evento",
      detail: event.detail || "Sin detalle",
      info: event.info || "Evento registrado localmente desde la interaccion de usuario."
    };
    safeWrite([...safeRead(), entry]);
    render();
    return entry;
  };

  function classify(button) {
    if (button.dataset.tenantAction) return { event: `Tenant ${button.dataset.tenantAction}`, detail: "Operacion abierta sobre Novaterra.", info: "Accion de gobierno tenant iniciada por superadmin." };
    if (button.dataset.tenantConfirm) return { event: `Tenant ${button.dataset.tenantConfirm} confirmado`, detail: "Operación confirmada con controles visibles.", info: "El registro conserva permisos, motivo, resultado y relación con la acción." };
    if (button.dataset.reviewAction) return { event: `Revision ${button.dataset.reviewAction}`, detail: "Accion de campana de plataforma.", info: "Manual runs requieren motivo, coste estimado y auditoria persistida." };
    if (button.dataset.sourceManage || button.dataset.sourceAction) return { event: "Fuente gestionada", detail: "Apertura de criterio o permisos de fuente.", info: "No accede a tenant-private sin politica explicita." };
    if (button.dataset.analyzeSource !== undefined) return { event: "Agente analiza fuente", detail: "Validacion guiada de fuente oficial candidata.", info: "IA solo si hay duda o cambio; primero hash/etag/reglas." };
    if (button.textContent.trim() === "Ejecutar ahora") return { event: "Invocacion agentica solicitada", detail: "Revision de plataforma bajo demanda.", info: "Debe crear ingestion_run/agent_run en backend productivo." };
    if (button.textContent.trim() === "Exportar auditoria") return { event: "Auditoria exportada", detail: "Exportacion solicitada por usuario.", info: "La exportacion no debe incluir secretos ni datos privados no autorizados." };
    return null;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const classified = classify(button);
    if (classified) window.auditEvent(classified);
  }, true);
  window.addEventListener("hashchange", () => window.auditEvent({ event: "Navegacion", detail: location.hash || "#view-dashboard", info: "Cambio de pantalla registrado en cliente." }));
  setTimeout(() => {
    if (!safeRead().length) safeWrite([{ id: id(), time: nowTime(), iso: new Date().toISOString(), actor: "Runtime auditoria", scope: "local", event: "Auditoria iniciada", detail: "Registro local preparado para la sesion.", info: "Primer evento real del runtime de auditoria local." }]);
    render();
  }, 0);
})();
