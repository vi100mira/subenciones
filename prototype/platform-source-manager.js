(function () {
  const sources = [
    { name: "BDNS/SNPSAP", group: "Publico estatal", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Operativa", cadence: "Diaria", doubt: "Sin duda bloqueante. La paginacion completa sigue pendiente de ejecutar por lotes.", action: "Continuar paginacion y normalizacion." },
    { name: "DOGV / GVA", group: "Territorial", territory: "Comunitat Valenciana", sourceStatus: "Fuente oficial", connectorStatus: "Conector pendiente", cadence: "Diaria tras conector", doubt: "Falta confirmar pagina indice, campos de plazo y si la oportunidad vive en HTML o PDF.", action: "Resolver regla de extraccion antes de activar alertas." },
    { name: "BOP Valencia", group: "Territorial", territory: "Valencia", sourceStatus: "Fuente oficial", connectorStatus: "Conector pendiente", cadence: "Semanal tras conector", doubt: "Fuente aceptada, pero falta patron estable para detectar ayudas entre boletines.", action: "Definir regla territorial y prueba con evidencia." },
    { name: "LABORA", group: "Territorial", territory: "Comunitat Valenciana", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria", doubt: "Sin duda bloqueante para empleo e insercion; requiere versionar cambios de bases.", action: "Mantener deteccion barata y revision humana si cambia." },
    { name: "Fundacion la Caixa", group: "Privado abierto", territory: "Espana por CCAA", url: "https://fundacionlacaixa.org/es/convocatorias-sociales", basisUrl: "https://fundacionlacaixa.org/documents/d/guest/convocatoria-social-comunitat-valenciana-2026-bases-pdf", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria si abre", normalization: "Patron aprendido", basis: "Bases oficiales localizadas", output: "Archivar cerradas y vigilar nuevas territoriales", depth: "Profundizar: indice territorial -> ficha -> bases/PDF", doubt: "La fuente es valida; cada linea territorial exige comprobar bases y plazo vigente.", action: "No alertar tenants sin evidencia de convocatoria abierta." },
    { name: "Fundacion ONCE", group: "Privado abierto", territory: "Espana", url: "https://www.fundaciononce.es/es/convocatorias-de-ayudas/para-entidades/convocatoria-general", verificationUrl: "https://www.fundaciononce.es/es/convocatorias-de-ayudas/para-entidades/convocatoria-empleo-publico", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria", normalization: "En normalizacion", basis: "Convocatorias separadas por linea", output: "Versionar cada convocatoria antes de recomendar", depth: "Profundizar: convocatorias -> entidades -> documentacion", doubt: "La fuente es valida; el encaje depende de colectivo, discapacidad y tipo de proyecto.", action: "Versionar cada convocatoria antes de recomendar." },
    { name: "Fundacion MAPFRE", group: "Privado abierto", territory: "Espana", url: "https://www.fundacionmapfre.org/premios-ayudas/convocatorias/", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Semanal", normalization: "En normalizacion", basis: "Pendiente separar programas y ayudas", output: "Crear oportunidad solo por linea con bases", depth: "Profundizar: programas -> ayuda concreta -> bases", doubt: "Puede publicar por programas; hay que separar premio, ayuda y convocatoria.", action: "Clasificar tipo de oportunidad antes de activar." },
    { name: "Fundacion Mutua Madrilena", group: "Privado abierto", territory: "Espana", url: "https://www.fundacionmutua.es/accion-social/ayudas-proyectos-sociales/", sourceStatus: "Fuente oficial", connectorStatus: "Solo vigilancia", cadence: "Semanal", normalization: "Vigilancia", basis: "Fuente recurrente cerrada o entre ediciones", output: "Alertar solo nueva edicion abierta", depth: "Profundizar: edicion anual -> bases -> solicitud", doubt: "Fuente recurrente; no siempre hay convocatoria viva.", action: "Alertar solo nueva edicion abierta." },
    { name: "Ford Espana", group: "Privado relacional", territory: "Comunitat Valenciana / Espana", url: "https://www.novaterra.org.es/ford-espana-y-sus-empleados-impulsan-la-transformacion-digital-de-fundacion-novaterra-a-traves-de-centimos-solidarios/", sourceStatus: "Fuente candidata", connectorStatus: "Revision manual", cadence: "Mensual", normalization: "Requiere humano", basis: "Sin bases publicas localizadas", output: "No crear oportunidad sin aportacion manual", depth: "Profundizar: noticia -> programa RSC -> contacto/bases manuales", doubt: "Novaterra acredita apoyo de Centimos Solidarios, pero no hay bases publicas localizadas.", action: "Aceptar solo con aportacion manual o evidencia directa de Ford." }
  ];

  const campaigns = [
    { title: "Territorial CV", scope: "GVA, DOGV, LABORA, BOP", status: "Preparada", metric: "4 fuentes oficiales", doubt: "DOGV y BOP necesitan regla de extraccion antes de producir oportunidades.", action: "Lanzar analisis tecnico o dejar en cola." },
    { title: "Fundaciones Espana", scope: "La Caixa, ONCE, MAPFRE, Mutua, Botin", status: "En seguimiento", metric: "12 fuentes revisadas", doubt: "No hay contador universal privado; se mide cobertura por fuente oficial.", action: "Ampliar catalogo y revisar cambios diarios como maximo." },
    { title: "Bancos y obra social", scope: "Santander, CaixaBank, Ibercaja, Bancaja", status: "En estudio", metric: "Catalogo inicial", doubt: "Faltan URLs oficiales y criterio de convocatoria abierta en varias entidades.", action: "Validar fuente oficial antes de activar monitor." },
    { title: "Federaciones sectoriales", scope: "Alertas abiertas reutilizables", status: "En estudio", metric: "Sin tenant-private", doubt: "Debe separarse alerta sectorial publica de informacion privada de socios.", action: "Aceptar solo fuentes abiertas y reutilizables." }
  ];

  const reviews = [
    { title: "DOGV detectado como fuente territorial", doubt: "El agente no sabe aun si debe leer un indice HTML, boletines PDF o ambos.", decision: "Elegir regla de extraccion y prueba de evidencia.", state: "Requiere criterio" },
    { title: "Fundacion Iberdrola: cambio de plazo", doubt: "Se detecta fecha nueva, pero falta confirmar si sustituye a la version anterior.", decision: "Versionar y alertar, o pausar hasta revisar bases.", state: "Critica" },
    { title: "BOP Valencia pendiente de conector", doubt: "La fuente es oficial, pero no hay patron de ayuda social fiable entre boletines.", decision: "Crear conector territorial o dejar en vigilancia sin alertas.", state: "Bloqueada" }
  ];

  const normalizationSteps = [
    { icon: "search-check", title: "1. Fuente oficial", detail: "Confirmar web oficial, financiador, territorio y si es indice o convocatoria concreta.", tip: "Si la URL no pertenece al financiador, no se normaliza." },
    { icon: "file-search", title: "2. Bases claras", detail: "Seguir ficha, documentos, PDF, FAQ, solicitud o formulario verificable.", tip: "Sin bases o URL verificable no hay oportunidad viva." },
    { icon: "traffic-cone", title: "3. Estado", detail: "Clasificar viva, cerrada, archivada, descartada o revision humana.", tip: "Cerrada se archiva; dudosa queda en revision." },
    { icon: "shield-check", title: "4. Aprobacion", detail: "Activar radar solo con evidencia, ruta y decision humana.", tip: "El tenant no recibe nada automaticamente." }
  ];
  const normalizedKey = "source-normalization.done.v1";
  const normalizationState = { tab: "flow", activeName: "Fundacion ONCE", done: readDone() };
  function reviewChecks(source) {
    return [
      ["Fuente oficial", "La URL pertenece al financiador o a su plataforma oficial."],
      [source.basisUrl ? "Bases localizadas" : "URL de verificacion humana", source.basisUrl ? "Hay bases, ficha o documento oficial suficiente." : "No hay bases curadas; se aprueba solo como patron vigilado y cualquier oportunidad requerira verificacion humana."],
      ["Estado y plazo", "La fuente queda clasificada como viva, cerrada, vigilancia o revision."],
      ["Seguimiento", "El agente de cambios queda activado antes de impactar tenants."]
    ];
  }

  function tone(state) {
    return state === "Operativa" || state === "Monitor activo" || state === "Fuente oficial" || state === "En seguimiento" || state === "Patron aprendido" || state === "Fuente normalizada" ? "safe" : state === "Critica" || state === "Requiere criterio" || state === "Conector pendiente" || state === "Requiere humano" ? "warning" : "review";
  }

  function badge(text) {
    return `<span class="badge ${tone(text)}">${text}</span>`;
  }

  function sourceRow(source) {
    return `
      <article class="source-library-card" data-source-name="${source.name}">
        <div class="opportunity-topline"><strong>${source.name}</strong>${badge(source.sourceStatus)}</div>
        <span>${source.group} - ${source.territory}</span>
        <div class="source-state-line">${badge(source.connectorStatus)}<span>Cadencia: ${source.cadence}</span></div>
        ${source.depth ? `<p><strong>Profundidad:</strong> ${source.depth}</p>` : ""}
        <p><strong>Duda:</strong> ${source.doubt}</p>
        <p><strong>Siguiente accion:</strong> ${source.action}</p>
        <div class="source-card-meta"><button class="ghost-action" data-source-manage="${source.name}" type="button">Ver criterio</button></div>
      </article>`;
  }

  function campaignRow(item) {
    return `
      <details class="stack-item">
        <summary class="opportunity-topline"><strong>${item.title}</strong><span>${item.metric}</span>${badge(item.status)}</summary>
        <span>${item.scope}</span>
        <div class="source-control-row">
          <div><strong>Duda que bloquea</strong><span>${item.doubt}</span></div>
          <div><strong>Que puedes hacer</strong><span>${item.action}</span></div>
          <div><strong>Activacion</strong><span>Nunca publica oportunidades sin evidencia y revision humana.</span></div>
        </div>
      </details>`;
  }

  function reviewRow(item) {
    return `
      <div class="stack-item">
        <div class="opportunity-topline"><strong>${item.title}</strong>${badge(item.state)}</div>
        <p><strong>Duda del agente:</strong> ${item.doubt}</p>
        <p><strong>Decision humana esperada:</strong> ${item.decision}</p>
        <div class="button-row"><button class="ghost-action" data-review-source="resolve" type="button">Marcar resuelta</button><button class="ghost-action" data-review-source="pause" type="button">Pausar fuente</button></div>
      </div>`;
  }

  function readDone() {
    try { return new Set(JSON.parse(localStorage.getItem(normalizedKey) || "[]")); } catch { return new Set(); }
  }

  function saveDone() {
    localStorage.setItem(normalizedKey, JSON.stringify([...normalizationState.done]));
  }

  function displayStatus(source) {
    if (normalizationState.done.has(source.name) || source.normalization === "Patron aprendido") return "Fuente normalizada";
    return source.normalization || "Sin analizar";
  }

  function escapeAttr(value) {
    return String(value || "").replace(/"/g, "&quot;");
  }

  function normalizationRow(source) {
    const status = displayStatus(source);
    const selected = source.name === normalizationState.activeName ? " is-selected" : "";
    const done = status === "Fuente normalizada";
    return `
      <div class="source-control-row${selected}" data-normalization-row="${source.name}">
        <div><strong>${source.name}</strong><span>${source.group} - ${source.territory}</span></div>
        <div><strong>Estado</strong><span>${status}</span></div>
        <div><strong>Bases / evidencia</strong><span>${source.basis || "Pendiente de localizar"}</span></div>
        ${badge(status)}
        <div><button class="${done ? "ghost-action" : "primary-action"}" data-normalize-source="${escapeAttr(source.name)}" type="button">${done ? "Ver ficha" : "Revisar y normalizar"}</button></div>
      </div>`;
  }

  function privateSources() {
    return sources.filter((source) => source.group.includes("Privado"));
  }

  function normalizationDetail(source = privateSources()[0]) {
    const status = displayStatus(source);
    const done = status === "Fuente normalizada";
    const evidenceUrl = source.basisUrl || source.verificationUrl || source.url;
    const evidenceLabel = source.basisUrl ? "Abrir bases normalizadas" : "Abrir URL de verificacion";
    return `
      <div class="plain-note">
        <strong>${done ? "Fuente normalizada" : "Ficha de normalizacion abierta"}: ${source.name}</strong>
        <span>${done ? "La fuente queda lista como patron controlado de plataforma. Cualquier oportunidad concreta seguira necesitando evidencia y revision humana." : "Revisa estos cuatro puntos. Si falta uno, la fuente no debe salir como oportunidad viva para ningun tenant."}</span>
        <div class="button-row">
          <a class="ghost-action" href="${source.url}" target="_blank" rel="noreferrer">Leer fuente oficial</a>
          <a class="ghost-action" href="${evidenceUrl}" target="_blank" rel="noreferrer">${evidenceLabel}</a>
        </div>
      </div>
      <div class="source-control-row">
        <div><strong>Fuente</strong><span>${source.territory}</span></div>
        <div><strong>1. Entrada oficial</strong><span>Confirmar que la pagina pertenece al financiador y no es una noticia secundaria.</span></div>
        <div><strong>2. Bases claras</strong><span>${source.basis || "Localizar PDF, ficha o formulario con requisitos verificables."}</span></div>
        <div><strong>3. Estado operativo</strong><span>${source.doubt}</span></div>
        <div><strong>4. Decision humana</strong><span>${source.output || source.action}</span></div>
      </div>
      <div class="source-control-row">
        <div><strong>Agente posterior</strong><span>Monitor de cambios privados</span></div>
        <div><strong>Que vigila</strong><span>Bases, plazo, estado, formulario, FAQ y resoluciones.</span></div>
        <div><strong>Cuando alerta</strong><span>Si detecta cambio relevante o duda nueva, saltara una alerta revisable.</span></div>
        <div><strong>Impacto tenant</strong><span>Alerta revisable; nunca envio automatico.</span></div>
      </div>
      <div class="plain-note"><strong>Resultado de normalizar</strong><span>No se crea una oportunidad viva hasta tener fuente oficial, bases o URL de verificacion, plazo/estado y aprobacion humana de plataforma. Una vez aprobada, otro agente vigila cambios como en fuentes publicas.</span></div>`;
  }

  function reviewModal(source) {
    const evidenceUrl = source.basisUrl || source.verificationUrl || source.url;
    const evidenceLabel = source.basisUrl ? "Leer bases" : "Abrir URL de verificacion";
    return `
      <div class="modal-backdrop" data-close-normalization-review>
        <article class="modal" role="dialog" aria-modal="true" aria-labelledby="normalization-review-title">
          <div class="panel-heading">
            <div><p class="eyebrow">Revision humana</p><h2 id="normalization-review-title">Normalizar ${source.name}</h2></div>
            <button class="icon-button" data-close-normalization-review type="button">X</button>
          </div>
          <div class="source-control-row">
            <div><strong>Fuente</strong><span>${source.group} - ${source.territory}</span></div>
            <div><strong>Bases / evidencia</strong><span>${source.basis || "Pendiente de localizar"}</span></div>
            <div><strong>Estado operativo</strong><span>${source.doubt}</span></div>
            <div><strong>Salida esperada</strong><span>${source.output || source.action}</span></div>
          </div>
          <div class="plain-note">
            <strong>Leer antes de aprobar</strong>
            <span>Abre estos enlaces y confirma manualmente que lo visto coincide con los checks. Si no puedes leer bases claras, deja la fuente como verificacion humana o vigilancia.</span>
            <div class="button-row">
              <a class="primary-action" href="${source.url}" target="_blank" rel="noreferrer">Leer fuente oficial</a>
              <a class="ghost-action" href="${evidenceUrl}" target="_blank" rel="noreferrer">${evidenceLabel}</a>
            </div>
          </div>
          <div class="stack-list">
            ${reviewChecks(source).map(([title, detail]) => `
              <label class="normalization-review-check">
                <span><input data-normalization-check type="checkbox" checked /> ${title}</span>
                <span>${detail}</span>
              </label>`).join("")}
          </div>
          <div class="plain-note"><strong>Despues de aprobar</strong><span>La fuente queda normalizada y pasa a vigilancia de cambios. Si cambian bases, plazo, estado o canal de solicitud, saltara una alerta revisable antes de impactar tenants.</span></div>
          <div class="button-row">
            <button class="primary-action" data-approve-normalization="${escapeAttr(source.name)}" type="button">Aprobar normalizacion</button>
            <button class="ghost-action" data-close-normalization-review type="button">Cancelar</button>
          </div>
        </article>
      </div>`;
  }

  function openReviewModal(source) {
    document.querySelector("[data-close-normalization-review]")?.remove();
    document.body.insertAdjacentHTML("beforeend", reviewModal(source));
  }

  function closeReviewModal() {
    document.querySelector("[data-close-normalization-review]")?.remove();
  }

  function approveSource(sourceName) {
    const source = sources.find((item) => item.name === sourceName);
    normalizationState.activeName = source.name;
    normalizationState.done.add(source.name);
    normalizationState.tab = "detail";
    saveDone();
    closeReviewModal();
    renderNormalizationShell();
    if (typeof showToast === "function") showToast(`Fuente normalizada: ${source.name}`);
  }

  function stepRow(step) {
    return `<div class="normalization-step" title="${step.tip}"><i data-lucide="${step.icon}"></i><strong>${step.title}</strong><span>${step.detail}</span><button class="info-dot" title="${step.tip}" type="button">i</button></div>`;
  }

  function normalizationShell() {
    const activeSource = privateSources().find((source) => source.name === normalizationState.activeName) || privateSources()[0];
    const doneCount = privateSources().filter((source) => displayStatus(source) === "Fuente normalizada").length;
    return `
      <div class="normalization-hero">
        <div><p class="eyebrow">Privadas abiertas</p><h2>Normalizacion de fuentes</h2><span>Resuelve una fuente antes de que pueda alimentar oportunidades de tenants.</span></div>
        <div class="source-state-line">${badge(`${doneCount} normalizadas`)}${badge("Revision humana obligatoria")}</div>
      </div>
      <div class="segmented normalization-tabs" aria-label="Pasos de normalizacion">
        <button class="${normalizationState.tab === "flow" ? "is-selected" : ""}" data-normalization-tab="flow" type="button"><i data-lucide="workflow"></i> Flujo</button>
        <button class="${normalizationState.tab === "sources" ? "is-selected" : ""}" data-normalization-tab="sources" type="button"><i data-lucide="library"></i> Fuentes</button>
        <button class="${normalizationState.tab === "detail" ? "is-selected" : ""}" data-normalization-tab="detail" type="button"><i data-lucide="clipboard-check"></i> Ficha</button>
        <button class="${normalizationState.tab === "review" ? "is-selected" : ""}" data-normalization-tab="review" type="button"><i data-lucide="user-check"></i> Revision</button>
      </div>
      <section data-normalization-pane="flow" ${normalizationState.tab === "flow" ? "" : "hidden"}>
        <div class="normalization-flow">${normalizationSteps.map(stepRow).join("")}</div>
        <div class="plain-note"><strong>Como se usa</strong><span>Elige una fuente, abre la revision, confirma los puntos y aprueba. Solo entonces cambia a Fuente normalizada y queda bajo vigilancia de cambios.</span><button class="primary-action" data-normalization-tab="sources" type="button">Elegir fuente</button></div>
      </section>
      <section data-normalization-pane="sources" ${normalizationState.tab === "sources" ? "" : "hidden"}>
        <div class="source-control-list">${privateSources().map(normalizationRow).join("")}</div>
      </section>
      <section data-normalization-pane="detail" ${normalizationState.tab === "detail" ? "" : "hidden"} id="source-normalization-detail">${normalizationDetail(activeSource)}</section>
      <section data-normalization-pane="review" ${normalizationState.tab === "review" ? "" : "hidden"}>
        <div class="stack-list">${reviews.map(reviewRow).join("")}</div>
      </section>`;
  }

  function renderNormalizationShell() {
    const shell = document.querySelector("#source-normalization-shell");
    if (!shell) return;
    shell.innerHTML = normalizationShell();
    window.lucide?.createIcons();
  }

  function switchNormalizationTab(tabName) {
    normalizationState.tab = tabName;
    renderNormalizationShell();
  }

  function installNormalizationStyles() {
    if (document.querySelector("#source-normalization-styles")) return;
    document.head.insertAdjacentHTML("beforeend", `<style id="source-normalization-styles">
      .normalization-hero { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:12px; padding:14px; border:1px solid var(--line); border-radius:8px; background:#f8fbfa; }
      .normalization-hero h2 { margin:2px 0 4px; }
      .normalization-tabs { margin-bottom:12px; }
      .normalization-tabs button { display:inline-flex; gap:6px; align-items:center; }
      .normalization-flow { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:12px; }
      .normalization-step { position:relative; min-height:118px; padding:14px; border:1px solid var(--line); border-radius:8px; background:#fff; }
      .normalization-step svg { width:24px; height:24px; color:var(--teal-dark); margin-bottom:10px; }
      .normalization-step strong, .normalization-step span { display:block; }
      .normalization-step span { margin-top:6px; color:var(--muted); line-height:1.4; }
      .normalization-step .info-dot { position:absolute; top:10px; right:10px; }
      .source-control-row.is-selected { border-color:var(--teal); box-shadow:0 0 0 2px rgba(0,116,105,.12); }
      .normalization-review-check { display:grid; grid-template-columns:220px 1fr; gap:10px; align-items:center; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:#fff; }
      .normalization-review-check span:first-child { color:var(--ink); font-weight:800; }
      .normalization-review-check span:last-child { color:var(--muted); line-height:1.4; }
      @media (max-width: 1180px) { .normalization-flow { grid-template-columns:repeat(2,minmax(0,1fr)); } .normalization-hero { flex-direction:column; } }
      @media (max-width: 560px) { .normalization-flow, .normalization-review-check { grid-template-columns:1fr; } }
    </style>`);
  }

  function renderPanel() {
    return `
      <article class="panel platform-source-panel" data-platform-pane="sources" hidden>
        <div id="source-normalization-shell">${normalizationShell()}</div>
      </article>`;
  }

  function switchTab(tabName) {
    document.querySelectorAll("[data-platform-tab]").forEach((tab) => tab.classList.toggle("is-selected", tab.dataset.platformTab === tabName));
    document.querySelectorAll("[data-platform-pane]").forEach((pane) => { pane.hidden = pane.dataset.platformPane !== tabName; });
  }

  function install() {
    const tabs = document.querySelector("#platform .segmented");
    if (!tabs || document.querySelector('[data-platform-tab="sources"]')) return;
    installNormalizationStyles();
    tabs.insertAdjacentHTML("beforeend", '<button data-platform-tab="sources">Normalizacion</button>');
    document.querySelector("#platform").insertAdjacentHTML("beforeend", renderPanel());
    document.addEventListener("click", (event) => {
      const tab = event.target.closest('[data-platform-tab="sources"]');
      const normalizationTab = event.target.closest("[data-normalization-tab]");
      const analyze = event.target.closest("[data-analyze-source]");
      const manualEvidence = event.target.closest("[data-manual-evidence]");
      const normalize = event.target.closest("[data-normalize-source]");
      const approve = event.target.closest("[data-approve-normalization]");
      const closeReview = event.target.closest("[data-close-normalization-review]");
      const manage = event.target.closest("[data-source-manage]");
      const review = event.target.closest("[data-review-source]");
      if (tab) switchTab("sources");
      if (normalizationTab) switchNormalizationTab(normalizationTab.dataset.normalizationTab);
      if (analyze) {
        document.querySelector("#source-analysis-note").innerHTML = "<strong>Analisis propuesto</strong><span>Fuente oficial probable. El escaneo profundo seguira enlaces internos hasta profundidad 2 y priorizara convocatorias, bases, PDF, FAQ, solicitud y formulario. Si solo encuentra portada, queda en revision humana.</span>";
      }
      if (manualEvidence) {
        document.querySelector("#source-analysis-note").innerHTML = "<strong>Aportacion registrada</strong><span>Queda como candidato manual: sirve para que una persona revise bases, plazo y legitimidad antes de crear oportunidad o alertar tenants.</span>";
      }
      if (normalize) {
        const source = sources.find((item) => item.name === normalize.dataset.normalizeSource);
        if (displayStatus(source) === "Fuente normalizada") {
          normalizationState.activeName = source.name;
          normalizationState.tab = "detail";
          renderNormalizationShell();
        } else {
          openReviewModal(source);
        }
      }
      if (approve) {
        const unchecked = [...document.querySelectorAll("[data-normalization-check]")].some((check) => !check.checked);
        if (unchecked) {
          if (typeof showToast === "function") showToast("Falta confirmar todos los puntos de revision.");
          return;
        }
        approveSource(approve.dataset.approveNormalization);
      }
      if (closeReview) {
        if (closeReview.classList.contains("modal-backdrop") && event.target !== closeReview) return;
        closeReviewModal();
      }
      if (manage && typeof showToast === "function") showToast(`Criterio abierto: ${manage.dataset.sourceManage}`);
      if (review && typeof showToast === "function") showToast(review.dataset.reviewSource === "resolve" ? "Duda marcada como resuelta en modo prototipo." : "Fuente pausada sin impacto en tenants.");
    });
    window.lucide?.createIcons();
  }

  install();
  document.addEventListener("DOMContentLoaded", install);
})();
