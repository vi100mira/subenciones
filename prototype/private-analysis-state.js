(function () {
  function dateLabel(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "fecha no disponible";
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function latest(governance) {
    return Array.isArray(governance?.privateIngestionRuns) ? governance.privateIngestionRuns[0] || null : null;
  }

  function inventory(governance, run) {
    const source = governance?.privateSources?.find((item) => item.id === run?.source_connection_id);
    const value = source?.config_json?.lastInventory;
    return value && value.runId === run?.id ? value : null;
  }

  function view(governance) {
    const run = latest(governance);
    if (!run) return {
      run: null, active: false, actionLabel: "Abrir preparación documental",
      title: "Análisis documental no iniciado",
      detail: "Todavía no hay una ejecución registrada para esta entidad."
    };
    const when = dateLabel(run.finished_at || run.started_at || run.created_at);
    if (run.status === "queued") return {
      run, active: true, actionLabel: "Ver análisis en cola", title: "Análisis documental en cola",
      detail: `Solicitado el ${when}. No se puede iniciar otra ejecución hasta que termine.`
    };
    if (run.status === "running") return {
      run, active: true, actionLabel: "Ver análisis en curso", title: "Análisis documental en curso",
      detail: `Iniciado el ${when}. No se puede iniciar otra ejecución hasta que termine.`
    };
    if (run.status === "completed") {
      const result = inventory(governance, run);
      const counts = Number(run.scanned || 0) > 0 ? ` · ${Number(run.scanned)} documentos revisados` : "";
      const proposals = Number(result?.proposalCount || run.inserted || 0) > 0 ? ` · ${Number(result?.proposalCount || run.inserted)} propuestas` : "";
      const quarantine = Number(result?.quarantineIndex?.chunks || 0) > 0 ? ` · ${Number(result.quarantineIndex.chunks)} fragmentos preparados en cuarentena` : "";
      const aiCost = result ? ` · ${Number(result.externalAiCalls || 0)} llamadas IA (coste IA 0 €)` : "";
      return {
        run, active: false, actionLabel: "Revisar o actualizar análisis", title: "Último análisis documental",
        detail: `Completado el ${when}${counts}${proposals}${quarantine}${aiCost}. El índice local está preparado, pero el redactor solo utiliza hechos aprobados. La vectorización semántica no se ha iniciado.`
      };
    }
    if (run.status === "failed") return {
      run, active: false, actionLabel: "Reintentar preparación documental", title: "Último análisis fallido",
      detail: `Finalizó con error el ${when}. ${String(run.error || "Revisa la auditoría antes de reintentarlo.")}`
    };
    return {
      run, active: false, actionLabel: "Volver a preparar documentación", title: "Último análisis cancelado",
      detail: `Cancelado el ${when}. Puedes iniciar una nueva ejecución cuando lo necesites.`
    };
  }

  window.PrivateAnalysisState = { dateLabel, latest, view };
})();
