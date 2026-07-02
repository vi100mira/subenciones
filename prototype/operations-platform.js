(function () {
  function badge(text, tone = "review") {
    return `<span class="badge ${tone}">${text}</span>`;
  }

  function row(item) {
    return `<div class="stack-item"><div class="opportunity-topline"><strong>${item.title}</strong>${badge(item.state, item.tone)}</div><span>${item.detail}</span></div>`;
  }

  function renderPlatformOperations() {
    const coverage = window.PLATFORM_COVERAGE || {};
    const publicRadar = coverage.public || {};
    const privateOpen = coverage.privateOpen || {};
    const entityResearch = coverage.entityResearch || {};
    const metrics = document.querySelectorAll("#operations .metric");
    if (!metrics.length) return;
    const metricData = [
      ["Corpus plataforma", publicRadar.loaded || 0, `${publicRadar.potential || 0} publicas potenciales BDNS`],
      ["Privadas abiertas", privateOpen.loadedRows || 0, `${privateOpen.sourcesReviewed || 0} fuentes revisadas`],
      ["Revision humana", privateOpen.needsHumanReview || 0, "Cambios/fuentes antes de impactar tenants"],
      ["Coste IA real hoy", "0,00", "EUR. IA solo si cambia o hay motivo auditado"]
    ];
    metrics.forEach((metric, index) => {
      const data = metricData[index];
      metric.querySelector("span").textContent = data[0];
      metric.querySelector("strong").textContent = data[1];
      metric.querySelector("small").textContent = data[2];
    });
    const jobs = [
      { title: "BDNS/SNPSAP", detail: `${publicRadar.loaded || 0}/${publicRadar.potential || 0} filas cargadas, ${publicRadar.detailErrors || 0} errores de detalle, ${publicRadar.uncertain || 0} plazos inciertos.`, state: "Productivo parcial", tone: "safe" },
      { title: "Privadas abiertas", detail: `${privateOpen.sourcesReviewed || 0} fuentes oficiales revisadas, ${privateOpen.activeOrOpen || 0} activas/open, ${privateOpen.loadedRows || 0} oportunidades de catalogo inicial.`, state: "Catalogo inicial", tone: "warning" },
      { title: "Territorial CV", detail: "GVA/LABORA monitorizables; DOGV/BOP siguen pendientes de conector fiable antes de alertar tenants.", state: "Conector pendiente", tone: "warning" },
      { title: "Investigador de entidad", detail: `${entityResearch.crawlLimit || "12 paginas"} con salida sugerida; falta worker persistente y aprobacion humana de hechos.`, state: "Flujo definido", tone: "review" }
    ];
    const health = [
      { title: "Supabase y APIs tenant", detail: "Endpoints de watches y alertas existen; requieren sesion autenticada real para uso productivo.", state: "Listo para conectar", tone: "safe" },
      { title: "RAG plataforma", detail: "Publico y privado abierto separados de tenant-private. No hay lectura cruzada de datos privados.", state: "Aislado", tone: "safe" },
      { title: "Blob documentos candidatura", detail: "Endpoint tenant-scoped preparado; falta configurar BLOB_READ_WRITE_TOKEN para confirmar escritura real en Vercel Blob.", state: "Pendiente token", tone: "warning" },
      { title: "Canales externos", detail: "Sin envio automatico. Email/Teams/WhatsApp quedan bloqueados hasta aprobacion humana y auditoria.", state: "Bloqueado seguro", tone: "warning" }
    ];
    document.querySelector("#operations-jobs").innerHTML = `<div class="plain-note"><strong>Alcance global superadmin</strong><span>Estado de plataforma completa: corpus publico, privadas abiertas, conectores territoriales, alertas, coste y seguridad. No depende del tenant activo.</span></div>${jobs.map(row).join("")}`;
    document.querySelector("#operations-health").innerHTML = health.map(row).join("");
    document.querySelector("#operations .capacity-grid").innerHTML = `<div><span>BDNS cargado</span><strong>${publicRadar.loaded || 0}/${publicRadar.potential || 0}</strong><progress value="${publicRadar.loaded || 0}" max="${publicRadar.potential || 1}"></progress></div><div><span>Privadas revisadas</span><strong>${privateOpen.sourcesReviewed || 0}</strong><progress value="${privateOpen.activeOrOpen || 0}" max="${privateOpen.sourcesReviewed || 1}"></progress></div><div><span>Errores detalle</span><strong>${publicRadar.detailErrors || 0}</strong><progress value="${publicRadar.detailErrors || 0}" max="10"></progress></div><div><span>IA diaria</span><strong>0 llamadas</strong><progress value="0" max="6"></progress></div>`;
  }

  renderPlatformOperations();
  window.addEventListener("hashchange", renderPlatformOperations);
})();
