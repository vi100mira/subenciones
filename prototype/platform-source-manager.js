(function () {
  const sources = [
    { name: "BDNS/SNPSAP", group: "Publico estatal", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Operativa", cadence: "Diaria", doubt: "Sin duda bloqueante. La paginacion completa sigue pendiente de ejecutar por lotes.", action: "Continuar paginacion y normalizacion." },
    { name: "DOGV / GVA", group: "Territorial", territory: "Comunitat Valenciana", sourceStatus: "Fuente oficial", connectorStatus: "Conector pendiente", cadence: "Diaria tras conector", doubt: "Falta confirmar pagina indice, campos de plazo y si la oportunidad vive en HTML o PDF.", action: "Resolver regla de extraccion antes de activar alertas." },
    { name: "BOP Valencia", group: "Territorial", territory: "Valencia", sourceStatus: "Fuente oficial", connectorStatus: "Conector pendiente", cadence: "Semanal tras conector", doubt: "Fuente aceptada, pero falta patron estable para detectar ayudas entre boletines.", action: "Definir regla territorial y prueba con evidencia." },
    { name: "LABORA", group: "Territorial", territory: "Comunitat Valenciana", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria", doubt: "Sin duda bloqueante para empleo e insercion; requiere versionar cambios de bases.", action: "Mantener deteccion barata y revision humana si cambia." },
    { name: "Fundacion la Caixa", group: "Privado abierto", territory: "Espana por CCAA", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria si abre", normalization: "Patron aprendido", basis: "Bases oficiales localizadas", output: "Archivar cerradas y vigilar nuevas territoriales", depth: "Profundizar: indice territorial -> ficha -> bases/PDF", doubt: "La fuente es valida; cada linea territorial exige comprobar bases y plazo vigente.", action: "No alertar tenants sin evidencia de convocatoria abierta." },
    { name: "Fundacion ONCE", group: "Privado abierto", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Diaria", normalization: "En normalizacion", basis: "Convocatorias separadas por linea", output: "Versionar cada convocatoria antes de recomendar", depth: "Profundizar: convocatorias -> entidades -> documentacion", doubt: "La fuente es valida; el encaje depende de colectivo, discapacidad y tipo de proyecto.", action: "Versionar cada convocatoria antes de recomendar." },
    { name: "Fundacion MAPFRE", group: "Privado abierto", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Monitor activo", cadence: "Semanal", normalization: "En normalizacion", basis: "Pendiente separar programas y ayudas", output: "Crear oportunidad solo por linea con bases", depth: "Profundizar: programas -> ayuda concreta -> bases", doubt: "Puede publicar por programas; hay que separar premio, ayuda y convocatoria.", action: "Clasificar tipo de oportunidad antes de activar." },
    { name: "Fundacion Mutua Madrilena", group: "Privado abierto", territory: "Espana", sourceStatus: "Fuente oficial", connectorStatus: "Solo vigilancia", cadence: "Semanal", normalization: "Vigilancia", basis: "Fuente recurrente cerrada o entre ediciones", output: "Alertar solo nueva edicion abierta", depth: "Profundizar: edicion anual -> bases -> solicitud", doubt: "Fuente recurrente; no siempre hay convocatoria viva.", action: "Alertar solo nueva edicion abierta." },
    { name: "Ford Espana", group: "Privado relacional", territory: "Comunitat Valenciana / Espana", sourceStatus: "Fuente candidata", connectorStatus: "Revision manual", cadence: "Mensual", normalization: "Requiere humano", basis: "Sin bases publicas localizadas", output: "No crear oportunidad sin aportacion manual", depth: "Profundizar: noticia -> programa RSC -> contacto/bases manuales", doubt: "Novaterra acredita apoyo de Centimos Solidarios, pero no hay bases publicas localizadas.", action: "Aceptar solo con aportacion manual o evidencia directa de Ford." }
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
    { title: "1. Identificar fuente", detail: "Confirmar web oficial, tipo de financiador, territorio y si es indice o convocatoria concreta." },
    { title: "2. Encontrar bases", detail: "Seguir navegacion interna hasta ficha, documentos, PDF, FAQ, solicitud o formulario verificable." },
    { title: "3. Decidir estado", detail: "Viva, cerrada, archivada, descartada o revision humana; nunca viva sin bases claras." },
    { title: "4. Publicar al radar", detail: "Solo tras evidencia, ruta de navegacion y aprobacion humana de plataforma." }
  ];

  function tone(state) {
    return state === "Operativa" || state === "Monitor activo" || state === "Fuente oficial" || state === "En seguimiento" || state === "Patron aprendido" ? "safe" : state === "Critica" || state === "Requiere criterio" || state === "Conector pendiente" || state === "Requiere humano" ? "warning" : "review";
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

  function normalizationRow(source) {
    const status = source.normalization || "Sin analizar";
    return `
      <div class="source-control-row">
        <div><strong>${source.name}</strong><span>${source.group} - ${source.territory}</span></div>
        <div><strong>Normalizacion</strong><span>${status}</span></div>
        <div><strong>Bases / evidencia</strong><span>${source.basis || "Pendiente de localizar"}</span></div>
        <div><strong>Salida al tenant</strong><span>${source.output || source.action}</span></div>
        ${badge(status)}
        <div><strong>Accion</strong><span><button class="primary-action" data-normalize-source="${source.name}" type="button">Normalizar fuente</button></span></div>
      </div>`;
  }

  function stepRow(step) {
    return `<div><strong>${step.title}</strong><span>${step.detail}</span></div>`;
  }

  function privateSources() {
    return sources.filter((source) => source.group.includes("Privado"));
  }

  function normalizationDetail(source = privateSources()[0]) {
    return `
      <div class="plain-note">
        <strong>Ficha de normalizacion abierta: ${source.name}</strong>
        <span>Revisa estos cuatro puntos. Si falta uno, la fuente no debe salir como oportunidad viva para ningun tenant.</span>
      </div>
      <div class="source-control-row">
        <div><strong>Fuente</strong><span>${source.territory}</span></div>
        <div><strong>1. Entrada oficial</strong><span>Confirmar que la pagina pertenece al financiador y no es una noticia secundaria.</span></div>
        <div><strong>2. Bases claras</strong><span>${source.basis || "Localizar PDF, ficha o formulario con requisitos verificables."}</span></div>
        <div><strong>3. Estado operativo</strong><span>${source.doubt}</span></div>
        <div><strong>4. Decision humana</strong><span>${source.output || source.action}</span></div>
      </div>
      <div class="plain-note"><strong>Resultado de normalizar</strong><span>No se crea una oportunidad viva hasta tener fuente oficial, bases o URL de verificacion, plazo/estado y aprobacion humana de plataforma.</span></div>`;
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
          <div><strong>Normalizacion</strong><span>Patrones aprendidos antes de activar impacto en tenants.</span></div>
        </div>
        <div class="source-control-row">
          ${normalizationSteps.map(stepRow).join("")}
        </div>
        <div class="plain-note source-guidance"><strong>Como leer los estados</strong><span>Fuente oficial valida la entidad emisora. En privadas abiertas, el agente debe profundizar en enlaces internos de convocatorias, bases, PDF, FAQ y solicitud; si solo llega a portada, queda en revision.</span></div>
        <div class="plain-note source-guidance"><strong>Descartada vs archivada</strong><span>Descartada: no encaja, es duplicada o no tiene evidencia suficiente. Archivada: fue candidata o convocatoria real, pero esta cerrada, resuelta o caducada y se conserva como historico.</span></div>
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
        <details class="source-optional-intake">
          <summary class="opportunity-topline"><strong>Aportacion manual de bases</strong><span>Subsidiaria si el escaneo no encuentra bases o la web bloquea lectura.</span></summary>
          <div class="inline-form source-intake">
            <label><span>Fuente</span><input data-manual-source="name" value="Ford Espana - Centimos Solidarios" /></label>
            <label><span>URL o PDF</span><input data-manual-source="url" value="https://www.novaterra.org.es/ford-espana-y-sus-empleados-impulsan-la-transformacion-digital-de-fundacion-novaterra-a-traves-de-centimos-solidarios/" /></label>
            <label><span>Resumen de bases</span><input data-manual-source="summary" value="Aportacion relacional; faltan bases publicas y plazo." /></label>
            <label><span>Responsable</span><input data-manual-source="owner" value="Revision plataforma" /></label>
            <button class="primary-action" data-manual-evidence type="button">Registrar para revision</button>
          </div>
        </details>
        <div class="plain-note" id="source-analysis-note">
          <strong>Alta guiada opcional</strong><span>Si anades una URL, el agente valida si es oficial, que duda existe, que cadencia propone y si puede reutilizarse por plataforma.</span>
        </div>
        <article>
          <div class="panel-heading"><div><p class="eyebrow">Privadas abiertas</p><h2>Normalizacion de fuentes</h2></div><span class="badge review">No publica tenants automaticamente</span></div>
          <div class="source-control-list">${privateSources().map(normalizationRow).join("")}</div>
          <div id="source-normalization-detail">${normalizationDetail()}</div>
        </article>
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
    tabs.insertAdjacentHTML("beforeend", '<button data-platform-tab="sources">Normalizacion</button>');
    document.querySelector("#platform").insertAdjacentHTML("beforeend", renderPanel());
    document.addEventListener("click", (event) => {
      const tab = event.target.closest('[data-platform-tab="sources"]');
      const analyze = event.target.closest("[data-analyze-source]");
      const manualEvidence = event.target.closest("[data-manual-evidence]");
      const normalize = event.target.closest("[data-normalize-source]");
      const manage = event.target.closest("[data-source-manage]");
      const review = event.target.closest("[data-review-source]");
      if (tab) switchTab("sources");
      if (analyze) {
        document.querySelector("#source-analysis-note").innerHTML = "<strong>Analisis propuesto</strong><span>Fuente oficial probable. El escaneo profundo seguira enlaces internos hasta profundidad 2 y priorizara convocatorias, bases, PDF, FAQ, solicitud y formulario. Si solo encuentra portada, queda en revision humana.</span>";
      }
      if (manualEvidence) {
        document.querySelector("#source-analysis-note").innerHTML = "<strong>Aportacion registrada</strong><span>Queda como candidato manual: sirve para que una persona revise bases, plazo y legitimidad antes de crear oportunidad o alertar tenants.</span>";
      }
      if (normalize) {
        const source = sources.find((item) => item.name === normalize.dataset.normalizeSource);
        document.querySelector("#source-normalization-detail").innerHTML = normalizationDetail(source);
        if (typeof showToast === "function") showToast(`Ficha de normalizacion abierta: ${normalize.dataset.normalizeSource}`);
      }
      if (manage && typeof showToast === "function") showToast(`Criterio abierto: ${manage.dataset.sourceManage}`);
      if (review && typeof showToast === "function") showToast(review.dataset.reviewSource === "resolve" ? "Duda marcada como resuelta en modo prototipo." : "Fuente pausada sin impacto en tenants.");
    });
    window.lucide?.createIcons();
  }

  install();
  document.addEventListener("DOMContentLoaded", install);
})();
