function currentOpportunities() {
  const privateRows = [...(window.MOCK.opportunities || []), ...(window.PRIVATE_OPEN_OPPORTUNITIES || [])].filter((item) => item.sourceScope && item.sourceScope !== "Publica oficial" && !item.sourceScope.toLowerCase().includes("tenant"));
  const publicRows = document.body.dataset.role === "superadmin" && window.RADAR_PLATFORM_OPPORTUNITIES?.length ? window.RADAR_PLATFORM_OPPORTUNITIES : window.RADAR?.opportunities || [];
  return publicRows.length ? [...publicRows, ...privateRows] : window.MOCK.opportunities;
}

function modalScoreLabel(score) {
  return score >= 75 ? "Prioridad alta" : score >= 55 ? "Prioridad media" : "Prioridad baja";
}

function escapeModalText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function sourceTextBody(item) {
  const complete = String(item.extractedText || "No hay texto extraido disponible.").replace(/\s+/g, " ").trim();
  const excerpt = complete.slice(0, 2400);
  const sections = excerpt.replace(/\s+(?=(?:Art(?:í|i)culo|Base|Primero|Segundo|Tercero|Cuarto|Quinto)\b)/gi, "\n");
  const fragments = sections.split(/\n|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÜÑ0-9])/).map((text) => text.trim()).filter(Boolean);
  const paragraphs = [];
  fragments.forEach((fragment) => {
    const previous = paragraphs.at(-1);
    const startsSection = /^(?:Art(?:í|i)culo|Base|Primero|Segundo|Tercero|Cuarto|Quinto)\b/i.test(fragment);
    if (!previous || startsSection || `${previous} ${fragment}`.length > 520) paragraphs.push(fragment);
    else paragraphs[paragraphs.length - 1] = `${previous} ${fragment}`;
  });
  const metadata = [item.source, item.territory].filter(Boolean).map((value) => `<span>${escapeModalText(value)}</span>`).join("");
  return `<div class="source-text-document">
    <header class="source-text-summary"><p class="eyebrow">Documento de origen</p><h3>${escapeModalText(item.title)}</h3>${metadata ? `<div class="source-text-meta">${metadata}</div>` : ""}</header>
    <div class="source-text-copy">${paragraphs.map((paragraph) => `<p>${escapeModalText(paragraph)}</p>`).join("")}</div>
    ${complete.length > excerpt.length ? '<p class="source-text-truncation">Vista parcial: se muestran los primeros 2.400 caracteres del texto extraído.</p>' : ""}
  </div>`;
}

function openOpportunityModal(id, mode) {
  const item = currentOpportunities().find((entry) => entry.id === id);
  if (!item) return;
  const isText = mode === "text";
  const textTitle = item.sourceTextLabel || "Texto original usado";
  const body = isText ? sourceTextBody(item) : `
    <p>${item.source} - ${item.territory}. ${modalScoreLabel(item.score)} (${item.score}/100 estimado, no elegibilidad).</p>
    ${window.deadlineTrace ? window.deadlineTrace.panelFromTrace(window.deadlineTrace.build(item)) : ""}
    ${item.programFeatures?.length ? `<h3>Caracteristicas del programa</h3><ul>${item.programFeatures.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}
    <h3>Por que puede encajar</h3><ul>${item.fit.map((x) => `<li>${x}</li>`).join("")}</ul>
    <h3>Riesgos</h3><ul>${item.risks.map((x) => `<li>${x}</li>`).join("")}</ul>
    <h3>Evidencia</h3><ul>${item.evidence.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-close-modal>
      <article class="modal ${isText ? "source-text-modal" : ""}" role="dialog" aria-modal="true" aria-labelledby="opportunity-modal-title">
        <div class="panel-heading"><h2 id="opportunity-modal-title">${isText ? escapeModalText(textTitle) : "Analisis legible"}</h2><button class="icon-button" data-close-modal type="button" aria-label="Cerrar">&times;</button></div>
        ${isText ? "" : `<strong>${item.title}</strong>`}${body}
      </article>
    </div>`);
}

function applyOpportunityFilter(filter) {
  const cards = [...document.querySelectorAll(".opportunity-item")];
  const list = currentOpportunities();
  cards.forEach((card, index) => {
    const item = list[index];
    const critical = item.deadlineStatus === "open" && (item.deadlineConfidence === "Baja" || item.score >= 70);
    const privateSource = item.sourceScope ? item.sourceScope !== "Publica oficial" : !["BDNS/SNPSAP"].includes(item.source);
    card.hidden = filter === "critical" ? !critical : filter === "private" ? !privateSource : false;
  });
  document.querySelector("#filter-note")?.remove(); document.querySelector("#filter-empty")?.remove();
  const text = filter === "critical" ? "Criticas: abiertas, alta prioridad o con plazo/confianza que requiere revision." : filter === "private" ? "Privadas: 20 oportunidades cargadas desde fuentes privadas abiertas y catalogo curado de plataforma." : "Todas: radar publico y oportunidades disponibles para revisar.";
  document.querySelector("#opportunity-list").insertAdjacentHTML("beforebegin", `<div class="plain-note" id="filter-note"><strong>${text}</strong></div>`);
  if (!cards.some((card) => !card.hidden)) document.querySelector("#opportunity-list").insertAdjacentHTML("beforebegin", `<div class="plain-note" id="filter-empty"><strong>No hay resultados en este filtro con el radar actual.</strong></div>`);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-close-modal]");
  if (!target) return;
  if (target.dataset.opportunity) openOpportunityModal(target.dataset.opportunity, "analysis");
  if (target.dataset.textOpportunity) openOpportunityModal(target.dataset.textOpportunity, "text");
  if (target.dataset.closeModal !== undefined && (!target.classList.contains("modal-backdrop") || event.target === target)) document.querySelector(".modal-backdrop")?.remove();
  if (target.dataset.filter) {
    document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("is-selected", button === target));
    applyOpportunityFilter(target.dataset.filter);
  }
});
