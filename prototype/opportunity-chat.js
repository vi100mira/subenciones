(function () {
  const state = { messages: [] };

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
    return plain(text).split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  }

  function searchable(item) {
    return plain([
      item.title,
      item.organism,
      item.source,
      item.theme,
      item.territory,
      item.deadlineStatus,
      item.deadlineConfidence,
      item.amount,
      ...(item.fit || []),
      ...(item.risks || []),
      ...(item.evidence || [])
    ].join(" "));
  }

  function rank(query) {
    const tokens = words(query);
    const wantsOpen = /abiert|viva|plazo|urgente/.test(plain(query));
    const wantsRisk = /riesgo|inciert|duda|baja/.test(plain(query));
    return opportunities()
      .map((item) => {
        const text = searchable(item);
        const tokenScore = tokens.reduce((sum, token) => sum + (text.includes(token) ? 8 : 0), 0);
        const urgency = wantsOpen && item.deadlineStatus === "open" ? 10 : 0;
        const risk = wantsRisk && item.deadlineConfidence !== "Alta" ? 8 : 0;
        return { item, score: tokenScore + urgency + risk + Number(item.score || 0) / 10 };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  function answer(query) {
    const matches = rank(query);
    if (!matches.length) {
      return `<p>No veo una candidata clara con esos criterios dentro del radar activo de la entidad.</p>`;
    }
    return `
      <p>He encontrado ${matches.length} posible${matches.length === 1 ? "" : "s"} encaje${matches.length === 1 ? "" : "s"} en las convocatorias vivas o revisables.</p>
      <div class="chat-results">
        ${matches.map(({ item }) => `
          <article>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.theme)} - ${escapeHtml(item.deadline)} - ${escapeHtml(item.deadlineConfidence)}</span>
            <button class="ghost-action" data-chat-open-opportunity="${escapeHtml(item.id)}" type="button">Ver</button>
          </article>
        `).join("")}
      </div>`;
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

  function openChat() {
    state.messages = [{
      role: "assistant",
      html: `<p>Estoy leyendo las ${opportunities().length} convocatorias activas de la entidad. Pregunta por colectivo, plazo, tema, importe o riesgo.</p>`
    }];
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" data-close-modal>
        <article class="modal radar-chat-modal" role="dialog" aria-modal="true">
          <div class="panel-heading"><h2>Radar conversacional</h2><button class="icon-button" data-close-modal>X</button></div>
          <div class="chat-log" id="radar-chat-log"></div>
          <form class="chat-form" data-radar-chat-form>
            <input name="query" autocomplete="off" placeholder="Empleo, mayores, plazo abierto, riesgo..." />
            <button class="primary-action" type="submit">Consultar</button>
          </form>
        </article>
      </div>`);
    renderMessages();
    document.querySelector("[data-radar-chat-form] input")?.focus();
  }

  document.addEventListener("click", (event) => {
    const chat = event.target.closest("[data-open-opportunity-chat]");
    const opportunity = event.target.closest("[data-chat-open-opportunity]");
    if (chat) openChat();
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
