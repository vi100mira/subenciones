(function () {
  const state = {
    items: [], sourceId: "", page: 1, pageSize: 12, answer: null, agentEnabled: true,
    filters: { text: "", status: "", dataClass: "", type: "", sort: "title:asc" }
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const recommendationLabels = {
    map_before_prefill: "Mapear campos seguros", manual_review: "Revisión necesaria",
    manual_only: "Solo uso manual", reference_only: "Documento de referencia",
    reference_only_filled: "Ejemplar cumplimentado", duplicate_reference: "Duplicado",
    blocked_sensitive: "Bloqueado por sensibilidad"
  };
  const statusLabels = {
    approved: "Aprobado", restricted: "Aprobado · restringido", rejected: "Descartado",
    blocked: "Bloqueado para IA", pending: "Por revisar"
  };

  function normalize(item) {
    const status = item.metadata_json?.review_status || "pending";
    const dataClass = item.data_class || "internal";
    const mime = item.mime_type || "application/octet-stream";
    const type = mime.includes("pdf") ? "pdf" : mime.includes("word") ? "docx"
      : mime.includes("sheet") || mime.includes("excel") ? "xlsx" : mime.startsWith("image/") ? "image" : "other";
    return {
      ...item, title: item.title || "Documento sin nombre", status, dataClass, mime, type,
      recommendation: recommendationLabels[item.metadata_json?.recommendation] || "Clasificación pendiente",
      aiReady: status === "approved" && !["personal", "sensitive", "blocked"].includes(dataClass)
    };
  }

  function tone(item) {
    return ["approved", "restricted"].includes(item.status) ? "safe"
      : ["rejected", "blocked"].includes(item.status) ? "danger" : "warning";
  }

  function filteredItems() {
    const text = state.filters.text.toLocaleLowerCase("es");
    const filtered = state.items.filter((item) =>
      (!text || `${item.title} ${item.recommendation} ${item.mime}`.toLocaleLowerCase("es").includes(text))
      && (!state.filters.status || item.status === state.filters.status)
      && (!state.filters.dataClass || item.dataClass === state.filters.dataClass)
      && (!state.filters.type || item.type === state.filters.type)
    );
    const [key, direction] = state.filters.sort.split(":");
    return filtered.sort((left, right) => {
      const leftValue = key === "status" ? statusLabels[left.status] : key === "type" ? left.type : left.title;
      const rightValue = key === "status" ? statusLabels[right.status] : key === "type" ? right.type : right.title;
      return leftValue.localeCompare(rightValue, "es", { sensitivity: "base" }) * (direction === "desc" ? -1 : 1);
    });
  }

  function annexButton(item, compact = false) {
    const restricted = ["personal", "sensitive"].includes(item.dataClass);
    return `<button class="${compact ? "icon-button" : "primary-action"}" data-annex-open="${escapeHtml(item.id)}"
      data-annex-source="${escapeHtml(state.sourceId)}"
      data-annex-title="${escapeHtml(item.title)}" data-annex-mime="${escapeHtml(item.mime)}"
      data-annex-class="${escapeHtml(item.dataClass)}" data-annex-sha="${escapeHtml(item.source_sha256)}"
      data-annex-status="${escapeHtml(item.status)}" data-annex-recommendation="${escapeHtml(item.recommendation)}"
      data-annex-restricted="${restricted}" data-annex-stored="${Boolean(item.blob_path)}" type="button"
      aria-label="Abrir ${escapeHtml(item.title)}" title="Abrir documento"><i data-lucide="scan-search"></i>${compact ? "" : "Abrir"}</button>`;
  }

  function activeRecommendationId() {
    try {
      return JSON.parse(sessionStorage.getItem("documentary-agent-package-v1") || "null")?.recommendationId || "";
    } catch {
      return "";
    }
  }

  function candidatureButton(source) {
    const recommendationId = activeRecommendationId();
    if (!state.agentEnabled || !recommendationId || !source.item?.id) return "";
    const evidence = [
      source.chunkId ? `chunk:${source.chunkId}` : "",
      source.sha ? `sha256:${source.sha}` : ""
    ].filter(Boolean);
    return `<button class="ghost-action" data-knowledge-propose-document="${escapeHtml(source.item.id)}"
      data-recommendation-id="${escapeHtml(recommendationId)}"
      data-proposal-reason="${escapeHtml(`Relevante para la consulta: ${state.answer?.question || "consulta de Base común"}`)}"
      data-proposal-evidence="${escapeHtml(JSON.stringify(evidence))}" type="button">
      <i data-lucide="file-plus-2"></i>Proponer a candidatura
    </button>`;
  }

  function answerMarkup() {
    if (!state.answer) return `<div data-knowledge-answer hidden></div>`;
    const sources = state.answer.sources?.length
      ? `<div class="knowledge-query-sources"><strong>Fragmentos citados</strong>${state.answer.sources.map((source) =>
        `<article>${source.item ? annexButton(source.item, true) : ""}<div><strong>${escapeHtml(source.title)}</strong><p>${escapeHtml(source.excerpt)}</p><small>Fragmento ${Number(source.ordinal) + 1} · huella ${escapeHtml(String(source.sha || "").slice(0, 12))}</small></div></article>`).join("")}</div>` : "";
    return `<div class="knowledge-query-answer ${state.answer.kind === "warning" ? "is-warning" : ""}" data-knowledge-answer>
      <strong>${escapeHtml(state.answer.title)}</strong><p>${escapeHtml(state.answer.body)}</p>${sources}
    </div>`;
  }

  function documentRow(item) {
    return `<article class="tenant-grid-row master-fact-card" role="row">
      <div role="cell"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.mime)} · Huella ${escapeHtml(String(item.source_sha256 || "").slice(0, 12))}</span></div>
      <div role="cell"><span class="badge ${tone(item)}">${escapeHtml(statusLabels[item.status] || item.status)}</span></div>
      <div role="cell"><strong>${escapeHtml(item.dataClass)}</strong><span>${state.agentEnabled ? (item.aiReady ? "Habilitado para consulta IA" : "No disponible para lectura IA") : "Lectura IA desactivada por plan"}</span></div>
      <div role="cell"><strong>${escapeHtml(item.recommendation)}</strong><span>${item.blob_path ? "Original en Blob privado" : "Ficha de inventario"}</span></div>
      <div class="tenant-actions" role="cell">${annexButton(item, true)}</div>
    </article>`;
  }

  function render(items, options = {}) {
    const host = document.querySelector("[data-common-knowledge-browser]"); if (!host) return;
    if (Array.isArray(items)) { state.items = items.map(normalize); state.page = 1; }
    if (options.sourceId !== undefined) state.sourceId = String(options.sourceId || "");
    if (options.agentEnabled !== undefined) state.agentEnabled = options.agentEnabled === true;
    const filtered = filteredItems();
    const pages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(state.page, pages);
    const visible = filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const aiReady = state.items.filter((item) => item.aiReady).length;
    host.innerHTML = `<section class="knowledge-query-panel" aria-labelledby="knowledge-query-title">
      <div class="panel-heading"><div><p class="eyebrow">Consulta asistida · corpus privado</p><h3 id="knowledge-query-title">Pregunta a la Base común</h3></div>
        <div class="knowledge-heading-tools"><span class="badge ${state.agentEnabled && aiReady ? "safe" : "warning"}">${state.agentEnabled ? `${aiReady} habilitados para IA` : "Consulta IA no incluida"}</span>
          <details class="knowledge-info-point" data-knowledge-query-info>
            <summary class="icon-button" aria-label="Cómo funciona la consulta asistida" title="Cómo funciona"><i data-lucide="info"></i></summary>
            <div class="knowledge-info-card knowledge-query-info-card">
              <p>${state.agentEnabled ? `Busca sobre esta biblioteca y recibe respuestas con documentos citados. Insertia recuperará solo fragmentos aprobados; nunca enviará los ${state.items.length} documentos como un bloque.` : `Explora y descarga el histórico de esta biblioteca. Los ${state.items.length} documentos siguen bajo control del tenant, pero la consulta IA está desactivada por el plan.`}</p>
              <div class="knowledge-query-examples"><span>Prueba:</span><button type="button" data-knowledge-example="¿Qué documentos acreditan nuestra experiencia?" ${state.agentEnabled ? "" : "disabled"}>Experiencia acreditada</button><button type="button" data-knowledge-example="¿Qué metodologías de intervención aparecen en la biblioteca?" ${state.agentEnabled ? "" : "disabled"}>Metodologías</button></div>
              <div class="plain-note compact"><strong>Uso en candidaturas</strong><span>La Base común es el universo de consulta. Cada candidatura recibe solo un subconjunto recomendado por relevancia, con motivo y evidencia, y una persona confirma qué documentos quedan vinculados a su expediente.</span></div>
            </div>
          </details>
        </div>
      </div>
      <form class="knowledge-query-form" data-knowledge-query-form>
        <label><span class="sr-only">Pregunta para la Base común</span><textarea name="question" rows="2" placeholder="Ej.: ¿Qué experiencia tenemos en itinerarios de inserción?"></textarea></label>
        <button class="primary-action" type="submit" ${state.agentEnabled ? "" : "disabled"}><i data-lucide="sparkles"></i>Consultar</button>
      </form>
      ${answerMarkup()}
    </section>
    <section class="knowledge-library-section"><div class="panel-heading"><div><p class="eyebrow">Biblioteca documental</p><h3>Todos los documentos inventariados</h3></div><span class="badge neutral">${filtered.length} de ${state.items.length} documentos</span></div>
      <div class="tenant-grid common-knowledge-grid" role="table" aria-label="Documentos de la Base común">
        <div class="tenant-grid-head" role="row"><span role="columnheader">Documento</span><span role="columnheader">Estado</span><span role="columnheader">Clase</span><span role="columnheader">Uso</span><span role="columnheader">Abrir</span></div>
        <div class="tenant-grid-filters" aria-label="Filtros de documentos">
          <label><span class="sr-only">Filtrar documentos</span><input data-knowledge-filter="text" value="${escapeHtml(state.filters.text)}" placeholder="Buscar por nombre o uso…"></label>
          <label><span class="sr-only">Filtrar estado</span><select data-knowledge-filter="status"><option value="">Todos los estados</option>${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${state.filters.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label><span class="sr-only">Filtrar clase</span><select data-knowledge-filter="dataClass"><option value="">Todas las clases</option>${["internal", "public", "personal", "sensitive"].map((value) => `<option value="${value}" ${state.filters.dataClass === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
          <label><span class="sr-only">Filtrar formato</span><select data-knowledge-filter="type"><option value="">Todos los formatos</option>${["pdf", "docx", "xlsx", "image", "other"].map((value) => `<option value="${value}" ${state.filters.type === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
          <label><span class="sr-only">Ordenar documentos</span><select data-knowledge-filter="sort"><option value="title:asc">Nombre A–Z</option><option value="title:desc">Nombre Z–A</option><option value="status:asc">Estado A–Z</option><option value="type:asc">Formato A–Z</option></select></label>
        </div>
        <div class="tenant-grid-body">${visible.map(documentRow).join("") || '<div class="empty-state compact"><strong>Sin resultados</strong><span>Ajusta o limpia los filtros para volver a ver documentos.</span></div>'}</div>
      </div>
      <nav class="knowledge-pagination" aria-label="Paginación de documentos"><span>Página ${state.page} de ${pages} · ${visible.length} visibles</span><div><button class="icon-button" data-knowledge-page="-1" type="button" aria-label="Página anterior" ${state.page === 1 ? "disabled" : ""}><i data-lucide="chevron-left"></i></button><button class="icon-button" data-knowledge-page="1" type="button" aria-label="Página siguiente" ${state.page === pages ? "disabled" : ""}><i data-lucide="chevron-right"></i></button></div></nav>
    </section>`;
    host.querySelectorAll(".knowledge-query-sources article").forEach((article, index) => {
      const button = candidatureButton(state.answer?.sources?.[index] || {});
      if (button) article.querySelector("div")?.insertAdjacentHTML("beforeend", button);
    });
    const sort = host.querySelector('[data-knowledge-filter="sort"]'); if (sort) sort.value = state.filters.sort;
    window.lucide?.createIcons();
  }

  function localBridgeUrl() {
    const url = new URL(String(window.INSERTIA_PRIVATE_BRIDGE_URL || "http://127.0.0.1:8000"));
    if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) throw new Error("El puente privado debe ejecutarse en este equipo.");
    return `${url.origin}/private-knowledge/query`;
  }

  async function submitQuestion(form) {
    const question = String(new FormData(form).get("question") || "").trim(); if (!question) return;
    if (!state.agentEnabled) {
      state.answer = { kind: "warning", title: "Consulta IA no incluida en el plan", body: "La biblioteca y sus documentos históricos siguen disponibles en modo solo lectura.", sources: [] };
      render(); return;
    }
    const eligible = state.items.filter((item) => item.aiReady);
    if (!eligible.length) {
      state.answer = { kind: "warning", title: "La consulta IA necesita documentos aprobados", body: `Puedes explorar las ${state.items.length} fichas del inventario, pero su contenido no se leerá hasta que una persona apruebe documentos internos no sensibles.`, sources: [] };
      render(); return;
    }
    const session = window.CredentialsAuth?.getSession?.();
    if (!session?.accessToken || !session?.tenantId || !state.sourceId) {
      state.answer = { kind: "warning", title: "No se puede abrir la consulta privada", body: "Falta una sesión válida o una fuente privada activa.", sources: [] };
      render(); return;
    }
    state.answer = { kind: "loading", title: "Consultando el índice local…", body: "Solo se revisan fragmentos de documentos aprobados. Ningún contenido se copia a Supabase.", sources: [] };
    render();
    try {
      const response = await fetch(localBridgeUrl(), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ tenant_id: session.tenantId, source_id: state.sourceId, question })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.detail || "El puente privado no pudo completar la consulta.");
      const citations = Array.isArray(payload.data?.citations) ? payload.data.citations : [];
      const sources = citations.map((citation) => ({
        title: citation.title || "Documento citado", excerpt: citation.excerpt || "",
        ordinal: citation.ordinal || 0, sha: citation.sourceSha256 || "", chunkId: citation.chunkId || "",
        item: state.items.find((item) => item.source_sha256 === citation.sourceSha256 || item.title === citation.title) || null
      }));
      state.answer = citations.length
        ? { kind: "result", title: `${citations.length} ${citations.length === 1 ? "fragmento relevante recuperado" : "fragmentos relevantes recuperados"}`, body: "Resultado local basado exclusivamente en documentos aprobados. Revisa las citas antes de reutilizar cualquier afirmación.", sources }
        : { kind: "warning", title: "No se encontraron fragmentos suficientes", body: "Prueba una pregunta más concreta. El alcance no se ampliará a documentos pendientes o restringidos.", sources: [] };
    } catch (error) {
      const offline = error instanceof TypeError;
      state.answer = { kind: "warning", title: offline ? "El puente privado no está disponible" : "No se pudo completar la consulta",
        body: offline ? "Inicia el servicio local de Insertia para consultar el índice que permanece en este equipo." : error.message, sources: [] };
    }
    render();
  }

  document.addEventListener("submit", (event) => {
    if (!event.target.matches?.("[data-knowledge-query-form]")) return;
    event.preventDefault(); submitQuestion(event.target);
  });
  document.addEventListener("input", (event) => {
    const filter = event.target.closest?.('[data-knowledge-filter="text"]'); if (!filter) return;
    state.filters.text = filter.value; state.page = 1; render();
    const next = document.querySelector('[data-knowledge-filter="text"]'); next?.focus(); next?.setSelectionRange(state.filters.text.length, state.filters.text.length);
  });
  document.addEventListener("change", (event) => {
    const filter = event.target.closest?.("[data-knowledge-filter]"); if (!filter || filter.dataset.knowledgeFilter === "text") return;
    state.filters[filter.dataset.knowledgeFilter] = filter.value; state.page = 1; render();
  });
  document.addEventListener("click", (event) => {
    const proposal = event.target.closest?.("[data-knowledge-propose-document]");
    if (proposal) {
      const propose = window.CandidatureDocuments?.propose;
      if (!propose) return void window.showToast?.("La candidatura no está disponible.");
      proposal.disabled = true;
      propose(proposal.dataset.recommendationId, [{
        documentId: proposal.dataset.knowledgeProposeDocument,
        reason: proposal.dataset.proposalReason,
        evidenceRefs: JSON.parse(proposal.dataset.proposalEvidence || "[]")
      }]).then(() => {
        proposal.textContent = "Propuesto para revisión";
        window.showToast?.("Documento propuesto. Confírmalo desde la candidatura.");
      }).catch((error) => {
        proposal.disabled = false;
        window.showToast?.(error.message || "No se pudo proponer el documento.");
      });
      return;
    }
    const page = event.target.closest?.("[data-knowledge-page]");
    if (page) { state.page += Number(page.dataset.knowledgePage); render(); return; }
    const example = event.target.closest?.("[data-knowledge-example]");
    if (example) { const form = document.querySelector("[data-knowledge-query-form]"); if (form) { form.elements.question.value = example.dataset.knowledgeExample; form.requestSubmit(); } }
  });
  window.CommonKnowledgeBrowser = { render };
})();
