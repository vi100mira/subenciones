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
    note.innerHTML = `<strong>Capacidad real en este momento</strong><span>${actionable} filas accionables cargadas desde BDNS municipal/social y vigilancia de 15 financiadores privados. La busqueda, extracción y OCR son deterministas; el investigador de entidad y el RAG privado aun no estan operativos, y OpenAI registra 0 llamadas.</span>`;
    const runs = document.querySelector("#agent-runs-small");
    if (runs && !runs.querySelector(".agent-panel-note")) runs.insertAdjacentHTML("afterbegin", '<p class="agent-panel-note">Resumen cargado para orientar; no es telemetria en tiempo real.</p>');
  }

  renderRuntimeTruth();
  window.addEventListener("role-session-applied", () => setTimeout(renderRuntimeTruth, 0));
  window.addEventListener("hashchange", () => setTimeout(renderRuntimeTruth, 0));
})();
