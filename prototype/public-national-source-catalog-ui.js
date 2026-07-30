(() => {
  const sourceRows = [
    ["bdns-snpsap", "BDNS / SNPSAP", "Espana", "Descubrimiento canonico", "Intervencion General de la Administracion del Estado"],
    ["boe", "BOE", "Nacional", "Publicacion oficial", "Agencia Estatal Boletin Oficial del Estado"],
    ["boja", "BOJA", "Andalucia", "Publicacion oficial", "Junta de Andalucia"],
    ["boa", "BOA", "Aragon", "Publicacion oficial", "Gobierno de Aragon"],
    ["bopa", "BOPA", "Asturias", "Publicacion oficial", "Principado de Asturias"],
    ["boib", "BOIB", "Illes Balears", "Publicacion oficial", "Govern de les Illes Balears"],
    ["boc-canarias", "BOC", "Canarias", "Publicacion oficial", "Gobierno de Canarias"],
    ["boc-cantabria", "BOC", "Cantabria", "Publicacion oficial", "Gobierno de Cantabria"],
    ["docm", "DOCM", "Castilla-La Mancha", "Publicacion oficial", "Junta de Comunidades de Castilla-La Mancha"],
    ["bocyl", "BOCYL", "Castilla y Leon", "Publicacion oficial", "Junta de Castilla y Leon"],
    ["dogc", "DOGC", "Cataluna", "Publicacion oficial", "Generalitat de Catalunya"],
    ["dogv", "DOGV", "Comunitat Valenciana", "Publicacion oficial", "Generalitat Valenciana"],
    ["doe", "DOE", "Extremadura", "Publicacion oficial", "Junta de Extremadura"],
    ["dog", "DOG", "Galicia", "Publicacion oficial", "Xunta de Galicia"],
    ["bocm", "BOCM", "Comunidad de Madrid", "Publicacion oficial", "Comunidad de Madrid"],
    ["borm", "BORM", "Region de Murcia", "Publicacion oficial", "Region de Murcia"],
    ["bon", "BON", "Navarra", "Publicacion oficial", "Gobierno de Navarra"],
    ["bopv", "BOPV", "Pais Vasco", "Publicacion oficial", "Gobierno Vasco"],
    ["bor", "BOR", "La Rioja", "Publicacion oficial", "Gobierno de La Rioja"]
  ];
  const sources = sourceRows.map(([id, label, territory, sourceRole, owner]) => ({
    id, label, territory, sourceRole, owner,
    connectorStatus: "Evaluación de permisos pendiente; no se ha programado ningún rastreo.",
    connectorCause: "Robots y términos todavía no tienen una evaluación persistida.",
    connectorOwner: "Operación técnica del radar",
    connectorNextStep: "Registrar la evaluación de permisos antes de considerar cualquier rastreo.",
    robotsStatus: "pending_assessment",
    termsStatus: "pending_assessment",
    scanEnabled: false
  }));
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const summary = Object.freeze({ sourceCount: sources.length, autonomousGazettes: 17, scanEligible: 0 });
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const date = (value) => value ? new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Sin datos";

  function renderSourceMap(target, readModel) {
    if (!target) return;
    if (readModel?.territories?.length) {
      const national = readModel.nationalScope || {};
      target.innerHTML = `<div class="plain-note"><strong>Análisis nacional de oportunidades públicas</strong><span>Actualizado: ${escapeHtml(date(readModel.generatedAt))}. Las cifras proceden del índice canónico BDNS; son independientes de que un conector territorial esté o no activado.</span><span>Ámbito estatal no repartido: ${escapeHtml(national.indexed || 0)} indexadas · ${escapeHtml(national.openVerified || 0)} abiertas verificadas · ${escapeHtml(national.pendingReview || 0)} pendientes de revisión humana.</span></div>${readModel.territories.map((territory) => {
        const evidenceSource = sourceById.get(territory.evidenceSourceId);
        const source = territory.canonicalSources?.length ? territory.canonicalSources.join(", ") : "Sin datos";
        const status = territory.dataStatus === "available" ? "active" : "pending";
        return `<details class="source-node ${status}"><summary><span class="source-node-copy"><strong>${escapeHtml(territory.label)}</strong><span>${escapeHtml(territory.indexed)} indexadas BDNS · ${escapeHtml(territory.openVerified)} abiertas verificadas · ${escapeHtml(territory.pendingReview)} pendientes de revisión humana</span></span><b aria-label="Convocatorias indexadas">${escapeHtml(territory.indexed)}</b><i data-lucide="chevron-down"></i></summary><div class="source-node-preview"><p><strong>Datos de oportunidades procedentes de BDNS:</strong> ${escapeHtml(territory.indexed)} detectadas/indexadas · ${escapeHtml(territory.openVerified)} abiertas verificadas · ${escapeHtml(territory.pendingReview)} pendientes de revisión humana. Fuente canónica: ${escapeHtml(source)}.</p><p><strong>Evidencia de oportunidad BDNS:</strong> ${escapeHtml(territory.evidenceUrls)} URL HTTPS de versión vigente · actualización ${escapeHtml(date(territory.updatedAt))}. Estas cifras no dependen del conector territorial.</p><p><strong>Conector territorial (${escapeHtml(evidenceSource?.label || territory.evidenceSourceId)}):</strong> ${escapeHtml(evidenceSource?.connectorStatus || "Evaluación de permisos pendiente; no se ha programado ningún rastreo.")}</p><p><strong>Causa:</strong> ${escapeHtml(evidenceSource?.connectorCause || "Robots y términos todavía no tienen una evaluación persistida.")} <strong>Propietario:</strong> ${escapeHtml(evidenceSource?.connectorOwner || "Operación técnica del radar")}.</p><p><strong>Siguiente paso:</strong> ${escapeHtml(evidenceSource?.connectorNextStep || "Registrar la evaluación de permisos antes de considerar cualquier rastreo.")}</p>${territory.dataStatus === "available" ? "" : `<p>${escapeHtml(territory.cause)}</p>`}</div></details>`;
      }).join("")}`;
      window.lucide?.createIcons();
      return;
    }
    if (readModel) {
      target.innerHTML = '<div class="plain-note"><strong>Análisis nacional sin datos</strong><span>No se ha recibido la lectura persistida de BDNS. No se muestran cifras de catálogo como oportunidades.</span></div>';
      return;
    }
    target.innerHTML = `<details class="source-catalog-context"><summary>Catálogo nacional declarado: ${summary.sourceCount} fuentes</summary><span>Contexto de procedencia: BDNS es la capa canónica; BOE y los diarios aportan publicación o evidencia. El catálogo no mide oportunidades ni implica rastreo.</span></details>${sources.map((source) => `<details class="source-node pending"><summary><span class="source-node-copy"><strong>${escapeHtml(source.label)} · ${escapeHtml(source.territory)}</strong><span>Conector territorial: ${escapeHtml(source.connectorStatus)}</span></span><b aria-label="Sin rastreo programado">—</b><i data-lucide="chevron-down"></i></summary><div class="source-node-preview"><p><strong>Conector territorial:</strong> ${escapeHtml(source.connectorStatus)}</p><p><strong>Causa:</strong> ${escapeHtml(source.connectorCause)} <strong>Propietario:</strong> ${escapeHtml(source.connectorOwner)}.</p><p><strong>Siguiente paso:</strong> ${escapeHtml(source.connectorNextStep)}</p></div></details>`).join("")}`;
    window.lucide?.createIcons();
  }

  window.NationalSourceCatalogUI = Object.freeze({ version: "public-national-v1", sources: Object.freeze(sources), summary, renderSourceMap });
})();
