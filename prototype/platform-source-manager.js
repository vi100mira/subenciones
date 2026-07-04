(function () {
  const sources = [
    { name: "BDNS/SNPSAP", group: "Publico estatal", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Operativa", cadence: "Diaria", doubt: "Sin duda bloqueante. La paginacion completa sigue pendiente de ejecutar por lotes.", action: "Continuar paginacion y normalizacion." },
    { name: "DOGV / GVA", group: "Territorial", territory: "Comunitat Valenciana", sourceStatus: "Fuente oficial", connectorStatus: "Conector pendiente", cadence: "Diaria tras conector", doubt: "Falta confirmar pagina indice, campos de plazo y si la oportunidad vive en HTML o PDF.", action: "Resolver regla de extraccion antes de activar alertas." },
    { name: "BOP Valencia", group: "Territorial", territory: "Valencia", sourceStatus: "Fuente oficial", connectorStatus: "Conector pendiente", cadence: "Semanal tras conector", doubt: "Fuente aceptada, pero falta patron estable para detectar ayudas entre boletines.", action: "Definir regla territorial y prueba con evidencia." },
    { name: "LABORA", group: "Territorial", territory: "Comunitat Valenciana", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria", doubt: "Sin duda bloqueante para empleo e insercion; requiere versionar cambios de bases.", action: "Mantener deteccion barata y revision humana si cambia." },
    { name: "Fundacion la Caixa", group: "Privado abierto", territory: "Espana por CCAA", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria si abre", depth: "Profundizar: indice territorial -> ficha -> bases/PDF", doubt: "La fuente es valida; cada linea territorial exige comprobar bases y plazo vigente.", action: "No alertar tenants sin evidencia de convocatoria abierta." },
    { name: "Fundacion ONCE", group: "Privado abierto", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria", depth: "Profundizar: convocatorias -> entidades -> documentacion", doubt: "La fuente es valida; el encaje depende de colectivo, discapacidad y tipo de proyecto.", action: "Versionar cada convocatoria antes de recomendar." },
    { name: "Fundacion MAPFRE", group: "Privado abierto", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Semanal", depth: "Profundizar: programas -> ayuda concreta -> bases", doubt: "Puede publicar por programas; hay que separar premio, ayuda y convocatoria.", action: "Clasificar tipo de oportunidad antes de activar." },
    { name: "Fundacion Mutua Madrilena", group: "Privado abierto", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Solo vigilancia", cadence: "Semanal", depth: "Profundizar: edicion anual -> bases -> solicitud", doubt: "Fuente recurrente; no siempre hay convocatoria viva.", action: "Alertar solo nueva edicion abierta." }
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

  function tone(state) {
    return state === "Operativa" || state === "Monitor activo" || state === "Fuente oficial" || state === "En seguimiento" ? "safe" : state === "Critica" || state === "Requiere criterio" || state === "Conector pendiente" ? "warning" : "review";
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

  function renderPanel() {
    return `
      <article class="panel platform-source-panel" data-platform-pane="sources" hidden>
        <div class="panel-heading">
          <div><p class="eyebrow">Mapa de cobertura</p><h2>Fuentes y expansion</h2></div>
          <span class="badge safe">Rol plataforma</span>
        </div>
        <div class="source-coverage-grid">
          <div><strong>Publico estatal</strong><span>BDNS como columna vertebral nacional.</span></div>
          <div><strong>Territorial</strong><span>GVA, DOGV, BOP, LABORA y ampliables.</span></div>
          <div><strong>Privado abierto</strong><span>Fundaciones, bancos, obra social, RSC.</span></div>
          <div><strong>Revision</strong><span>Cola humana antes de activar impacto en tenants.</span></div>
        </div>
        <div class="plain-note source-guidance"><strong>Como leer los estados</strong><span>Fuente oficial valida la entidad emisora. En privadas abiertas, el agente debe profundizar en enlaces internos de convocatorias, bases, PDF, FAQ y solicitud; si solo llega a portada, queda en revision.</span></div>
        <details class="source-optional-intake">
          <summary class="opportunity-topline"><strong>Agregar fuente manual</strong><span>Opcional: el sistema tambien investiga y propone fuentes.</span></summary>
          <div class="inline-form source-intake">
            <label><span>Nombre fuente</span><input data-new-source="name" value="Nueva fuente territorial" /></label>
            <label><span>Tipo</span><select data-new-source="type"><option>Territorial</option><option>Fundacion</option><option>Banco / obra social</option><option>Empresa / RSC</option><option>Federacion</option></select></label>
            <label><span>URL oficial</span><input data-new-source="url" value="https://www.gva.es" /></label>
            <label><span>Territorio</span><input data-new-source="territory" value="Comunitat Valenciana" /></label>
            <button class="primary-action" data-analyze-source type="button">Analizar fuente</button>
          </div>
        </details>
        <div class="plain-note" id="source-analysis-note">
          <strong>Alta guiada opcional</strong><span>Si anades una URL, el agente valida si es oficial, que duda existe, que cadencia propone y si puede reutilizarse por plataforma.</span>
        </div>
        <div class="two-column source-manager-columns">
          <article>
            <div class="panel-heading"><div><p class="eyebrow">Biblioteca</p><h2>Fuentes monitorizadas</h2></div></div>
            <div class="source-library-grid">${sources.map(sourceRow).join("")}</div>
          </article>
          <article>
            <div class="panel-heading"><div><p class="eyebrow">Campanas</p><h2>Ampliacion controlada</h2></div></div>
            <div class="stack-list">${campaigns.map(campaignRow).join("")}</div>
          </article>
        </div>
        <article>
          <div class="panel-heading"><div><p class="eyebrow">Revision humana</p><h2>Cola de fuentes y cambios</h2></div></div>
          <div class="stack-list">${reviews.map(reviewRow).join("")}</div>
        </article>
      </article>`;
  }

  function switchTab(tabName) {
    document.querySelectorAll("[data-platform-tab]").forEach((tab) => tab.classList.toggle("is-selected", tab.dataset.platformTab === tabName));
    document.querySelectorAll("[data-platform-pane]").forEach((pane) => { pane.hidden = pane.dataset.platformPane !== tabName; });
  }

  function install() {
    const tabs = document.querySelector("#platform .segmented");
    if (!tabs || document.querySelector('[data-platform-tab="sources"]')) return;
    tabs.insertAdjacentHTML("beforeend", '<button data-platform-tab="sources">Fuentes</button>');
    document.querySelector("#platform").insertAdjacentHTML("beforeend", renderPanel());
    document.addEventListener("click", (event) => {
      const tab = event.target.closest('[data-platform-tab="sources"]');
      const analyze = event.target.closest("[data-analyze-source]");
      const manage = event.target.closest("[data-source-manage]");
      const review = event.target.closest("[data-review-source]");
      if (tab) switchTab("sources");
      if (analyze) {
        document.querySelector("#source-analysis-note").innerHTML = "<strong>Analisis propuesto</strong><span>Fuente oficial probable. El escaneo profundo seguira enlaces internos hasta profundidad 2 y priorizara convocatorias, bases, PDF, FAQ, solicitud y formulario. Si solo encuentra portada, queda en revision humana.</span>";
      }
      if (manage && typeof showToast === "function") showToast(`Criterio abierto: ${manage.dataset.sourceManage}`);
      if (review && typeof showToast === "function") showToast(review.dataset.reviewSource === "resolve" ? "Duda marcada como resuelta en modo prototipo." : "Fuente pausada sin impacto en tenants.");
    });
    window.lucide?.createIcons();
  }

  install();
  document.addEventListener("DOMContentLoaded", install);
})();
