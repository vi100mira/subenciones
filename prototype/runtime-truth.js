(function () {
  function renderRuntimeTruth() {
    const grid = document.querySelector("#dashboard .metric-grid");
    if (!grid) return;
    let note = document.querySelector("#dashboard-runtime-truth");
    if (!note) {
      note = document.createElement("div");
      note.id = "dashboard-runtime-truth";
      note.className = "plain-note";
      grid.insertAdjacentElement("afterend", note);
    }
    const actionable = grid.querySelector(".metric strong")?.textContent || "0";
    note.innerHTML = `<strong>Situación actual</strong><span>Estas ${actionable} oportunidades son las mismas que aparecen en la vista Oportunidades. Las fuentes públicas se revisan automáticamente; la investigación web, el análisis de archivos privados y la redacción con IA siguen pendientes de activación.</span>`;
    const runs = document.querySelector("#agent-runs-small");
    if (runs && !runs.querySelector(".agent-panel-note")) runs.insertAdjacentHTML("afterbegin", '<p class="agent-panel-note">Resumen informativo: las actividades mostradas son ejemplos, no acciones realizadas hoy.</p>');
  }

  renderRuntimeTruth();
  window.addEventListener("role-session-applied", () => setTimeout(renderRuntimeTruth, 0));
  window.addEventListener("hashchange", () => setTimeout(renderRuntimeTruth, 0));
})();
