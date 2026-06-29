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

function exportAudit() {
  downloadWord("auditoria-subvenciones-demo.doc", "Auditoria de trazabilidad - demo", [
    { title: "Alcance", lines: "Eventos de prototipo. Solo la lectura BDNS procede de la copia publica cargada; el resto simula la trazabilidad que tendra el producto." },
    { title: "Eventos", lines: window.MOCK.audit.map((item) => `${item.time} - ${item.event}: ${item.actor}. ${item.detail}`) },
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
        <div class="panel-heading"><h2>Politicas y normas</h2><button class="icon-button" data-close-modal>X</button></div>
        <div class="policy-list">
          <article><strong>Fuentes publicas</strong><p>El radar puede leer fuentes oficiales o abiertas. Cada recomendacion debe conservar evidencia y procedencia.</p></article>
          <article><strong>Datos de entidad</strong><p>Solo se usan con permiso de la entidad, dentro de su propio entorno y con el minimo contexto necesario.</p></article>
          <article><strong>IA con fuentes verificables</strong><p>La IA ayuda a comparar, explicar y redactar borradores. No decide elegibilidad ni presenta solicitudes.</p></article>
          <article><strong>Revision humana</strong><p>Todo borrador, exportacion, envio o uso externo requiere validacion de una persona autorizada.</p></article>
          <article><strong>Plataforma</strong><p>La administracion de plataforma gestiona fuentes comunes, lecturas publicas y revisiones programadas. La entidad gobierna usuarios, permisos y fuentes privadas.</p></article>
        </div>
      </article>
    </div>
  `);
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
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const text = button.textContent.trim();
    if (text === "Exportar auditoria") exportAudit();
    if (text === "Exportar borrador Word" || text === "Exportar cuando se apruebe") exportProposal();
    if (button.dataset.policyModal !== undefined) showPolicyModal();
    if (text === "Solicitar fuente") showToast("Solicitud registrada en demo. La aprueba el responsable de datos de la entidad.");
    if (text === "Nueva revision") showToast("Demo: revision de plataforma para sincronizar, preparar textos y, mas adelante, actualizar el indice de busqueda.");
    if (button.dataset.sourceAction) showToast(`${button.dataset.sourceAction}: aqui se abriria permisos, responsable, alcance y ultima revision.`);
    if (button.dataset.workspaceAction) handleWorkspaceAction(button.dataset.workspaceAction, button);
  });
}

addGovernanceContext();
bindStaticActions();
