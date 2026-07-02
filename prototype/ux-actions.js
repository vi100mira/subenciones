function downloadWord(filename, title, sections) {
  const body = sections.map((section) => `
    <h2>${section.title}</h2>
    ${Array.isArray(section.lines) ? `<ul>${section.lines.map((line) => `<li>${line}</li>`).join("")}</ul>` : `<p>${section.lines}</p>`}
  `).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${body}</body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
window.downloadWord = downloadWord;

function exportAudit() {
  const auditRows = (window.getAuditEvents?.() || window.MOCK.audit).map((item) => `${item.time} - ${item.event}: ${item.actor}. ${item.detail}`);
  downloadWord("auditoria-subvenciones-demo.doc", "Auditoria de trazabilidad - demo", [
    { title: "Alcance", lines: "Eventos de prototipo. Solo la lectura BDNS procede de la copia publica cargada; el resto simula la trazabilidad que tendra el producto." },
    { title: "Eventos", lines: auditRows },
    { title: "Control humano", lines: "Ningun evento implica envio, presentacion ni uso externo de informacion sin revision humana." }
  ]);
  showToast("Auditoria exportada en formato Word editable.");
}

function exportProposal() {
  downloadWord("borrador-candidatura-empleo-inclusivo.doc", "Borrador de candidatura - empleo inclusivo 2026", [
    { title: "Aviso de revision", lines: "Documento editable para Word. No esta aprobado para presentar hasta revision humana." },
    ...window.MOCK.outline.map((section) => ({ title: section.title, lines: section.text })),
    { title: "Tareas pendientes", lines: window.MOCK.checklist.map((item) => `${item.item}: ${item.state}`) }
  ]);
  showToast("Borrador Word generado. Sigue pendiente de revision humana.");
}

function addGovernanceContext() {
  const list = document.querySelector("#source-control-list");
  if (!list || document.querySelector("#governance-owner-note")) return;
  list.insertAdjacentHTML("beforebegin", `
    <div class="plain-note" id="governance-owner-note">
      <strong>Quien gobierna esto</strong>
      <span>La administracion de plataforma gestiona fuentes comunes. Cada entidad decide sus fuentes privadas y un responsable interno aprueba que datos se usan para analisis o borradores.</span>
    </div>
  `);
}

function showPolicyModal() {
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-close-modal>
      <article class="modal policy-modal" role="dialog" aria-modal="true">
        <div class="panel-heading"><h2>Politicas y modelo</h2><button class="icon-button" data-close-modal>X</button></div>
        <div class="policy-list">
          <article><strong>Fuentes publicas</strong><p>El radar puede leer fuentes oficiales o abiertas. Cada recomendacion debe conservar evidencia y procedencia.</p></article>
          <article><strong>Datos de entidad</strong><p>Solo se usan con permiso de la entidad, dentro de su propio entorno y con el minimo contexto necesario.</p></article>
          <article><strong>Separacion operativa</strong><p>Publicas y privadas abiertas se indexan por plataforma. Las fuentes privadas del tenant quedan aisladas con permisos, auditoria y aprobacion propia.</p></article>
          <article><strong>IA con fuentes verificables</strong><p>La IA ayuda a comparar, explicar y redactar borradores. No decide elegibilidad ni presenta solicitudes.</p></article>
          <article><strong>Revision humana</strong><p>Todo borrador, exportacion, envio o uso externo requiere validacion de una persona autorizada.</p></article>
          <article><strong>Plataforma</strong><p>La administracion de plataforma gestiona fuentes comunes, lecturas publicas y revisiones programadas. La entidad gobierna usuarios, permisos y fuentes privadas.</p></article>
        </div>
      </article>
    </div>
  `);
}

function showTenantModal(action) {
  const content = {
    edit: ["Editar Novaterra", "Cambios auditados", `<div class="inline-form"><label><span>Nombre</span><input value="Novaterra" /></label><label><span>Web publica</span><input value="https://www.novaterra.org.es" /></label><label><span>Email admin</span><input value="admin@novaterra.org.es" /></label><label><span>Color marca</span><input value="#24515a" /></label></div><div class="plain-note"><strong>No toca datos privados</strong><span>Solo cambia configuracion visible del tenant. Requiere auditoria y no modifica fuentes privadas.</span></div>`, "Guardar cambios"],
    terms: ["Terminos y consentimientos", "Control legal", `<div class="policy-list"><article><strong>Condiciones aceptadas</strong><p>Suite de asistencia, radar y borradores sujetos a revision humana.</p></article><article><strong>Web publica</strong><p>Autorizada para lectura de informacion abierta. Hechos quedan sugeridos hasta aprobacion.</p></article><article><strong>Drive privado</strong><p>Pendiente. No se conecta sin consentimiento expreso y alcance limitado.</p></article></div>`, "Registrar revision"],
    suspend: ["Suspender Novaterra", "Operacion reversible", `<div class="inline-form"><label><span>Motivo obligatorio</span><input value="Revision administrativa" /></label><label><span>Fecha de revision</span><input value="2026-07-08" /></label></div><div class="plain-note"><strong>Efecto</strong><span>Bloquea accesos y nuevas ejecuciones tenant. Mantiene datos aislados y auditables.</span></div>`, "Suspender tenant"],
    delete: ["Eliminar Novaterra", "Bloqueado por seguridad", `<div class="policy-list danger-list"><article><strong>Doble aprobacion</strong><p>Requiere superadmin y owner del tenant.</p></article><article><strong>Exportacion previa</strong><p>Antes debe ofrecerse exportacion y periodo de retencion legal.</p></article><article><strong>Auditoria</strong><p>La operacion no esta disponible en prototipo ni se ejecuta sin backend seguro.</p></article></div>`, "Solicitar borrado seguro"]
  }[action];
  document.querySelector(".modal-backdrop")?.remove();
  document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-close-modal><article class="modal tenant-op-modal" role="dialog" aria-modal="true"><div class="panel-heading"><div><p class="eyebrow">${content[1]}</p><h2>${content[0]}</h2></div><button class="icon-button" data-close-modal>X</button></div>${content[2]}<div class="button-row"><button class="primary-action" data-tenant-confirm="${action}" type="button">${content[3]}</button><button class="ghost-action" data-close-modal type="button">Cancelar</button></div></article></div>`);
}

function handleWorkspaceAction(action, button) {
  if (action === "Preparar Word") {
    document.querySelector("#proposal-outline").insertAdjacentHTML("afterbegin", `
      <article class="outline-item action-log">
        <strong>Memoria tecnica preparada</strong>
        <p>Borrador editable con evidencias publicas y hechos internos aprobados. Falta revision humana.</p>
      </article>
    `);
    showToast("Memoria preparada como borrador editable.");
    return;
  }
  if (action === "Anexar") return showToast("Demo: se abriria selector de documentos Office/PDF y se registraria la procedencia.");
  if (action === "Ver evidencia") return showToast("Evidencia: fuente oficial y perfil minimo aprobados para analisis.");
  button.closest(".check-item").querySelector(".badge").textContent = "Verificado";
  button.closest(".check-item").querySelector(".badge").className = "badge safe";
  showToast("Punto verificado en demo. Queda registrado para auditoria.");
}

function bindStaticActions() {
  document.addEventListener("change", (event) => {
    const input = event.target.closest("#tenant-logo-upload");
    if (!input) return;
    document.querySelector("[data-logo-file]").textContent = input.files?.[0]?.name || "Sin archivo";
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const text = button.textContent.trim();
    if (text === "Exportar auditoria") exportAudit();
    if (text === "Exportar borrador Word" || text === "Exportar cuando se apruebe") exportProposal();
    if (button.dataset.policyModal !== undefined) showPolicyModal();
    if (text === "Solicitar fuente") showToast("Solicitud registrada en demo. La aprueba el responsable de datos de la entidad.");
    if (text === "Programar revision") { window.showScreen?.("platform"); showToast("Configura cadencia, presupuesto y fuentes antes de crear una revision programada."); }
    if (text === "Ejecutar ahora") { window.showScreen?.("platform"); showToast("Ejecucion manual: deteccion ligera primero; IA solo con cambios o motivo auditado."); }
    if (button.dataset.reviewAction === "save") { const cron = button.closest(".stack-item")?.querySelector("[data-cron-input]")?.value.trim() || ""; return showToast(/^(\S+\s+){4}\S+$/.test(cron) ? "Cron valido en demo. Backend validara zona horaria, cadencia maxima IA y presupuesto." : "Cron incompleto: usa 5 campos, por ejemplo 0 6 * * *."); }
    if (button.dataset.reviewAction === "run") showToast("Ejecucion manual en demo: requiere motivo y queda auditada antes de usar IA.");
    if (button.dataset.sourceAction) showToast(`${button.dataset.sourceAction}: aqui se abriria permisos, responsable, alcance y ultima revision.`);
    if (button.dataset.tenantAction) showTenantModal(button.dataset.tenantAction);
    if (button.dataset.tenantConfirm) { document.querySelector(".modal-backdrop")?.remove(); showToast({ edit: "Cambios de tenant guardados en prototipo con auditoria.", terms: "Revision de terminos registrada en prototipo.", suspend: "Suspension preparada: backend exigira motivo, permisos y auditoria.", delete: "Borrado no ejecutado: queda como solicitud segura pendiente de doble aprobacion." }[button.dataset.tenantConfirm]); }
    if (button.dataset.workspaceAction) handleWorkspaceAction(button.dataset.workspaceAction, button);
  });
}

addGovernanceContext();
bindStaticActions();
