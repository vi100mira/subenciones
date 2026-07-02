(function () {
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function dateOnly(value) {
    if (!value) return "";
    const text = String(value);
    return text.includes("T") ? text.slice(0, 10) : text;
  }

  function firstEvidence(item) {
    const announcement = item?.announcements?.[0];
    const document = item?.documents?.[0];
    if (announcement) return { label: announcement.officialJournal || "Anuncio oficial", date: announcement.publishedAt, url: announcement.url };
    if (document) return { label: document.description || document.filename || "Documento oficial", date: document.publishedAt || document.modifiedAt, url: document.url };
    if (item?.basesUrl) return { label: "Bases reguladoras", date: item?.generatedAt, url: item.basesUrl };
    return { label: item?.source || "Fuente pendiente", date: "", url: item?.officialUrl || "" };
  }

  function statusLabel(status) {
    return status === "open" ? "Abierto" : status === "closed" ? "Cerrado" : "Incierto";
  }

  function tone(trace) {
    if (trace.status === "closed") return "danger";
    if (trace.confidence === "Alta" && trace.structured) return "safe";
    return "warning";
  }

  function build(item) {
    const evidence = firstEvidence(item);
    const structured = Boolean(item?.deadlineEnd || item?.deadlineStart);
    const observed = item?.deadlineObserved || (item?.deadlineEnd ? dateOnly(item.deadlineEnd) : item?.deadline || "Plazo no estructurado");
    const sourceDate = dateOnly(item?.deadlineEvidenceDate || evidence.date);
    const generatedAt = dateOnly(item?.deadlineReadAt || window.RADAR?.generatedAt || window.PLATFORM_COVERAGE?.updatedAt || new Date().toISOString());
    const confidence = item?.deadlineConfidence || (structured ? "Media" : "Baja");
    const status = item?.deadlineStatus || "uncertain";
    const doubt = structured
      ? "Fecha estructurada por el agente; verificar si las bases publican rectificacion."
      : "Plazo relativo, textual o pendiente; requiere lectura de bases/anuncio antes de asumir fecha final.";
    return {
      observed,
      status,
      statusLabel: statusLabel(status),
      confidence,
      structured,
      evidenceLabel: item?.deadlineEvidenceLabel || evidence.label,
      evidenceDate: sourceDate || "Sin fecha de publicacion",
      evidenceUrl: item?.deadlineEvidenceUrl || evidence.url || item?.officialUrl || item?.basesUrl || "",
      agentReadAt: generatedAt,
      nextReview: item?.deadlineNextReviewAt ? dateOnly(item.deadlineNextReviewAt) : status === "closed" ? "Archivada; revisar solo si se reactiva." : "Revisar en la proxima ejecucion diaria del radar.",
      tenantAlarm: item?.tenantAlarmPolicy || (status === "closed" ? "No alertar salvo cambio de reapertura." : confidence === "Alta" && structured ? "Avisar si cambia la fecha o el documento fuente." : "Alerta critica si se obtiene fecha final o cambia el texto de plazo."),
      doubt: item?.deadlineUncertaintyReason || doubt
    };
  }

  function cell(item) {
    const trace = build(item);
    return `
      <div class="deadline-cell is-${tone(trace)}">
        <strong>${esc(trace.observed)}</strong>
        <span>${esc(trace.statusLabel)} - confianza ${esc(trace.confidence)}</span>
        <small>${trace.structured ? "Fecha estructurada" : "Necesita revisar bases"}</small>
      </div>`;
  }

  function summary(trace) {
    if (!trace) return "";
    return `
      <div class="deadline-summary is-${tone(trace)}">
        <strong>${esc(trace.observed)}</strong>
        <span>${esc(trace.statusLabel)} - confianza ${esc(trace.confidence)} - ${trace.structured ? "estructurada" : "sin fecha final estructurada"}</span>
      </div>`;
  }

  function panelFromTrace(trace) {
    if (!trace) return "";
    const source = trace.evidenceUrl ? `<a href="${esc(trace.evidenceUrl)}" target="_blank" rel="noreferrer">${esc(trace.evidenceLabel)}</a>` : esc(trace.evidenceLabel);
    return `
      <div class="deadline-trace-card">
        <div class="deadline-trace-head">
          <div><p class="eyebrow">Trazabilidad de fechas</p><h3>${esc(trace.observed)}</h3></div>
          <span class="badge ${tone(trace)}">${esc(trace.statusLabel)} - ${esc(trace.confidence)}</span>
        </div>
        <div class="deadline-trace-grid">
          <div><strong>Fuente usada</strong><span>${source}</span></div>
          <div><strong>Fecha de fuente</strong><span>${esc(trace.evidenceDate)}</span></div>
          <div><strong>Lectura agente</strong><span>${esc(trace.agentReadAt)}</span></div>
          <div><strong>Proxima revision</strong><span>${esc(trace.nextReview)}</span></div>
          <div><strong>Alarma tenant</strong><span>${esc(trace.tenantAlarm)}</span></div>
          <div><strong>Duda abierta</strong><span>${esc(trace.doubt)}</span></div>
        </div>
      </div>`;
  }

  window.deadlineTrace = { build, cell, summary, panelFromTrace };
})();
