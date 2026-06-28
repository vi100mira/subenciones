(function () {
  const state = { messages: [], lastMatches: [] };
  const candidateKey = "workspace-candidates-v1";

  function opportunities() {
    return window.RADAR?.opportunities || [];
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[char]));
  }

  function plain(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function words(text) {
    const stop = new Set(["para", "con", "que", "por", "una", "los", "las", "del", "este", "esta", "tengo", "quiero"]);
    return plain(text).split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stop.has(word));
  }

  function itemText(item) {
    return plain([
      item.title, item.organism, item.source, item.theme, item.territory,
      item.deadlineStatus, item.deadlineConfidence, item.amount,
      ...(item.fit || []), ...(item.risks || []), ...(item.evidence || [])
    ].join(" "));
  }

  function selection() {
    try {
      return JSON.parse(localStorage.getItem(candidateKey) || "{}");
    } catch {
      return {};
    }
  }

  function saveSelection(next) {
    localStorage.setItem(candidateKey, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("workspace-candidates-changed"));
  }

  function updateCandidate(id, action) {
    const current = selection();
    const selectedIds = current.selectedIds?.includes(id) ? current.selectedIds : [id, ...(current.selectedIds || [])];
    saveSelection(action === "activate" ? { activeId: id, selectedIds } : { ...current, selectedIds });
  }

  function intent(query) {
    const q = plain(query);
    return {
      wantsHelp: /ayuda|puedo preguntar|ejemplo|como/.test(q),
      wantsCompare: /compara|comparar|diferencia|frente/.test(q),
      wantsBest: /mejor|conviene|prioriza|recomienda|cual/.test(q),
      wantsRisk: /riesgo|inciert|duda|baja|revisar/.test(q),
      wantsOpen: /abiert|viva|plazo|urgente|fecha/.test(q),
      wantsMoney: /importe|dinero|presupuesto|cuantia/.test(q),
      wantsWorkspace: /preseleccion|activa|seleccionada|seleccionadas|workspace/.test(q)
    };
  }

  function scoreItem(item, query) {
    const tokens = words(query);
    const q = intent(query);
    const text = itemText(item);
    const tokenScore = tokens.reduce((sum, token) => sum + (text.includes(token) ? 9 : 0), 0);
    const base = Number(item.score || 0) / 8;
    const open = q.wantsOpen && item.deadlineStatus === "open" ? 18 : 0;
    const risk = q.wantsRisk && item.deadlineConfidence !== "Alta" ? 16 : 0;
    const money = q.wantsMoney && /eur|presupuesto|hasta/.test(plain(item.amount)) ? 8 : 0;
    return tokenScore + base + open + risk + money;
  }

  function ranked(query, limit = 4) {
    return opportunities()
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  function reason(item) {
    const fit = item.fit?.[0] || item.evidence?.[0] || "Tiene evidencia publica relacionada con el perfil activo.";
    return escapeHtml(fit);
  }

  function risk(item) {
    return escapeHtml(item.risks?.[0] || (item.deadlineConfidence === "Alta" ? "Riesgo bajo en plazo; revisar bases." : "Plazo o requisito requiere lectura humana."));
  }

  function resultCard(item) {
    return `
      <article>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.theme)} - ${escapeHtml(item.deadline)} - ${escapeHtml(item.deadlineConfidence)} - ${escapeHtml(item.amount)}</span>
        <p><b>Por que:</b> ${reason(item)}</p>
        <p><b>Revisar:</b> ${risk(item)}</p>
        <div class="chat-actions">
          <button class="ghost-action" data-chat-open-opportunity="${escapeHtml(item.id)}" type="button">Ver</button>
          <button class="ghost-action" data-chat-candidate="select" data-chat-id="${escapeHtml(item.id)}" type="button">Preseleccionar</button>
          <button class="ghost-action" data-chat-candidate="activate" data-chat-id="${escapeHtml(item.id)}" type="button">Activar</button>
        </div>
      </article>`;
  }

  function helpAnswer() {
    return `
      <p>Puedo razonar sobre las convocatorias activas de esta entidad, no sobre todo internet. Algunas preguntas utiles:</p>
      <div class="prompt-chips">
        <button data-chat-prompt="Que candidaturas convienen mas para Novaterra?">Que conviene mas</button>
        <button data-chat-prompt="Cuales tienen plazo abierto y buen encaje?">Plazo abierto</button>
        <button data-chat-prompt="Que riesgos debo revisar antes de activar candidatura?">Riesgos</button>
        <button data-chat-prompt="Compara las tres mejores candidatas">Comparar mejores</button>
      </div>`;
  }

  function workspaceAnswer() {
    const current = selection();
    const rows = opportunities();
    const selected = (current.selectedIds || []).map((id) => rows.find((item) => item.id === id)).filter(Boolean);
    const active = rows.find((item) => item.id === current.activeId);
    return `
      <p>Ahora mismo hay ${selected.length || 0} oportunidades preseleccionadas y ${active ? "1 candidatura activa" : "ninguna candidatura activa"}.</p>
      ${active ? `<p><b>Activa:</b> ${escapeHtml(active.title)}</p>` : ""}
      <p>La activacion se hace desde la columna Candidatura del grid o desde los botones de esta conversacion.</p>`;
  }

  function comparison(matches) {
    return `
      <p>Comparo las mejores candidatas segun encaje, plazo y riesgo. No es elegibilidad automatica.</p>
      <div class="chat-compare">
        ${matches.map(({ item }) => `
          <article>
            <strong>${escapeHtml(item.title)}</strong>
            <span>Prioridad ${item.score}/100 - ${escapeHtml(item.deadlineConfidence)} - ${escapeHtml(item.amount)}</span>
            <p>${risk(item)}</p>
          </article>`).join("")}
      </div>`;
  }

  function answer(query) {
    const q = intent(query);
    if (q.wantsHelp) return helpAnswer();
    if (q.wantsWorkspace) return workspaceAnswer();
    const matches = ranked(query, q.wantsCompare ? 3 : 4);
    state.lastMatches = matches.map((entry) => entry.item.id);
    if (!matches.length) {
      return `<p>No veo una candidata clara con esos criterios dentro del radar activo. Prueba con colectivo, territorio, plazo, importe o riesgo.</p>${helpAnswer()}`;
    }
    if (q.wantsCompare) return comparison(matches);
    const lead = q.wantsBest
      ? "Mi recomendacion inicial seria revisar estas candidatas en este orden."
      : q.wantsRisk
        ? "Estas son las candidatas donde veo mas puntos a revisar."
        : "He encontrado estas candidatas en el radar activo.";
    return `
      <p>${lead} Trabajo solo con convocatorias vivas o revisables, filtradas por el perfil de la entidad.</p>
      <div class="chat-results">${matches.map(({ item }) => resultCard(item)).join("")}</div>`;
  }

  function renderMessages() {
    const log = document.querySelector("#radar-chat-log");
    if (!log) return;
    log.innerHTML = state.messages.map((message) => `
      <div class="chat-message ${message.role}">
        <strong>${message.role === "user" ? "Tu" : "Radar"}</strong>
        <div>${message.html}</div>
      </div>
    `).join("");
    log.scrollTop = log.scrollHeight;
  }

  function ask(query) {
    const text = query.trim();
    if (!text) return;
    state.messages.push({ role: "user", html: escapeHtml(text) });
    state.messages.push({ role: "assistant", html: answer(text) });
    renderMessages();
  }

  function assistantSays(html) {
    state.messages.push({ role: "assistant", html });
    renderMessages();
  }

  function openChat() {
    state.messages = [{
      role: "assistant",
      html: `<p>Soy tu radar de subvenciones para ${escapeHtml(window.RADAR_ENTITY_CONTEXT?.name || "la entidad")}. Estoy leyendo ${opportunities().length} convocatorias activas, ya filtradas por territorio y plazo.</p>${helpAnswer()}`
    }];
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" data-close-modal>
        <article class="modal radar-chat-modal" role="dialog" aria-modal="true">
          <div class="panel-heading"><h2>Radar conversacional</h2><button class="icon-button" data-close-modal>X</button></div>
          <div class="chat-log" id="radar-chat-log"></div>
          <form class="chat-form" data-radar-chat-form>
            <textarea name="query" autocomplete="off" rows="2" placeholder="Preguntame: que conviene mas, compara, riesgos, plazos abiertos..."></textarea>
            <button class="primary-action" type="submit">Enviar</button>
          </form>
        </article>
      </div>`);
    renderMessages();
    document.querySelector("[data-radar-chat-form] textarea")?.focus();
  }

  document.addEventListener("click", (event) => {
    const chat = event.target.closest("[data-open-opportunity-chat]");
    const opportunity = event.target.closest("[data-chat-open-opportunity]");
    const prompt = event.target.closest("[data-chat-prompt]");
    const candidate = event.target.closest("[data-chat-candidate]");
    if (chat) openChat();
    if (prompt) ask(prompt.dataset.chatPrompt);
    if (candidate) {
      updateCandidate(candidate.dataset.chatId, candidate.dataset.chatCandidate);
      assistantSays(`<p>${candidate.dataset.chatCandidate === "activate" ? "He activado esta candidatura." : "La dejo preseleccionada para estudio."}</p>${workspaceAnswer()}`);
    }
    if (opportunity) {
      document.querySelector(".radar-chat-modal")?.closest(".modal-backdrop")?.remove();
      window.openOpportunityModal?.(opportunity.dataset.chatOpenOpportunity, "analysis");
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-radar-chat-form]");
    if (!form) return;
    event.preventDefault();
    const input = form.elements.query;
    ask(input.value);
    input.value = "";
  });
})();
