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
    const loadedPublic = window.RADAR_PLATFORM_OPPORTUNITIES?.length || window.RADAR?.count || publicRadar.loaded || 0;
    const potentialPublic = window.RADAR?.totalElements || publicRadar.potential || loadedPublic;
    const metrics = document.querySelectorAll("#operations .metric");
    if (!metrics.length) return;
    const metricData = [
      ["Publicaciones revisadas", loadedPublic, `${potentialPublic} localizadas antes de comprobar vigencia y encaje`],
      ["Convocatorias privadas abiertas", privateOpen.loadedRows || 0, "Con vigencia y bases confirmadas"],
      ["Pendientes de revisión", privateOpen.needsHumanReview || 0, "Fuentes que necesitan comprobación humana"],
      ["Coste de IA hoy", "0,00", "EUR. La redacción con IA no está activada"]
    ];
    metrics.forEach((metric, index) => {
      const data = metricData[index];
      metric.querySelector("span").textContent = data[0];
      metric.querySelector("strong").textContent = data[1];
      metric.querySelector("small").textContent = data[2];
    });
    const jobs = [
      { title: "Base Nacional de Subvenciones", detail: `${loadedPublic} oportunidades públicas revisadas automáticamente.`, state: "Disponible", tone: "safe" },
      { title: "Financiadores privados", detail: `15 financiadores en seguimiento; ${privateOpen.activeOrOpen || 0} convocatorias abiertas confirmadas hoy.`, state: "En seguimiento", tone: "review" },
      { title: "Fuentes de la Comunitat Valenciana", detail: "GVA y LABORA se pueden consultar; la lectura automática de DOGV y boletines provinciales sigue pendiente.", state: "Parcial", tone: "warning" },
      { title: "Investigación de la entidad", detail: "La autorización está prevista, pero la web de la entidad todavía no se analiza automáticamente.", state: "En preparación", tone: "warning" }
    ];
    const health = [
      { title: "Accesos de cada entidad", detail: "Los accesos y avisos requieren una sesión válida de la entidad.", state: "Disponible", tone: "safe" },
      { title: "Separación de información", detail: "La información privada de una entidad no se muestra a otra.", state: "Protegida", tone: "safe" },
      { title: "Procesos automáticos", detail: "La búsqueda se revisa cada día. El redactor arranca al solicitarlo y recupera tareas pendientes cada quince minutos.", state: "Activos", tone: "safe" },
      { title: "Documentos de candidatura", detail: "La generación está preparada; falta activar el almacenamiento privado antes de usar documentación real.", state: "Pendiente", tone: "warning" },
      { title: "Canales externos", detail: "Sin envio automatico. Email/Teams/WhatsApp quedan bloqueados hasta aprobacion humana y auditoria.", state: "Bloqueado seguro", tone: "warning" }
    ];
    document.querySelector("#operations-jobs").innerHTML = `<div class="plain-note"><strong>Vista general</strong><span>Estado de las fuentes, revisiones, avisos, costes y protección de todas las entidades.</span></div>${jobs.map(row).join("")}`;
    document.querySelector("#operations-health").innerHTML = health.map(row).join("");
    document.querySelector("#operations .capacity-grid").innerHTML = `<div><span>Publicaciones revisadas</span><strong>${loadedPublic}</strong><progress value="${loadedPublic}" max="${potentialPublic || 1}"></progress></div><div><span>Financiadores privados</span><strong>15</strong><progress value="15" max="15"></progress></div><div><span>Incidencias de lectura</span><strong>${publicRadar.detailErrors || 0}</strong><progress value="${publicRadar.detailErrors || 0}" max="10"></progress></div><div><span>Uso de IA hoy</span><strong>Sin uso</strong><progress value="0" max="6"></progress></div>`;
  }

  renderPlatformOperations();
  window.renderPlatformOperations = renderPlatformOperations;
  window.addEventListener("hashchange", renderPlatformOperations);
})();
