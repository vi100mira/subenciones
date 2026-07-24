(function () {
  const topics = Array.isArray(window.INSERTIA_HELP_TOPICS) ? window.INSERTIA_HELP_TOPICS : [];
  const state = { messages: [] };
  const stopWords = new Set(["para", "como", "esta", "esto", "tengo", "quiero", "puedo", "donde", "cual", "cuando", "porque", "sobre"]);

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  }

  function plain(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function currentScreen() {
    return location.hash.replace(/^#view-/, "") || "welcome";
  }

  function tokens(value) {
    return plain(value).split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !stopWords.has(token));
  }

  function rankedTopics(query) {
    const queryTokens = tokens(query);
    const screen = currentScreen();
    return topics.map((topic) => {
      const haystack = plain([topic.title, topic.summary, ...(topic.keywords || [])].join(" "));
      const matches = queryTokens.filter((token) => haystack.includes(token)).length;
      const exact = (topic.keywords || []).some((keyword) => plain(query).includes(plain(keyword))) ? 4 : 0;
      const contextual = topic.screens?.includes(screen) ? 1 : 0;
      return { topic, score: matches * 3 + exact + contextual };
    }).filter((entry) => entry.score > 1).sort((a, b) => b.score - a.score).slice(0, 2);
  }

  function topicAnswer(topic) {
    return `<div class="help-answer"><strong>${escapeHtml(topic.title)}</strong><p>${escapeHtml(topic.summary)}</p><ol>${topic.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol><p class="help-caution"><i data-lucide="shield-check"></i>${escapeHtml(topic.caution)}</p></div>`;
  }

  function noAnswer() {
    return `<div class="help-answer"><strong>No encuentro una respuesta suficientemente clara</strong><p>Prueba preguntando por alta, perfil, radar, encaje, bases, candidatura, documentos, estados, cambios, privacidad o auditoría.</p><p class="help-caution"><i data-lucide="user-check"></i>Si la duda afecta a elegibilidad o a una base concreta, debe revisarla una persona responsable.</p></div>`;
  }

  function answer(query) {
    const matches = rankedTopics(query);
    return matches.length ? matches.map(({ topic }) => topicAnswer(topic)).join("") : noAnswer();
  }

  function renderMessages() {
    const log = document.querySelector("#help-assistant-log");
    if (!log) return;
    log.innerHTML = state.messages.map((message) => `<div class="help-message ${message.role}"><span>${message.role === "user" ? "Tú" : "Guía INSERTIA"}</span><div>${message.html}</div></div>`).join("");
    log.scrollTop = log.scrollHeight;
    window.lucide?.createIcons();
  }

  function contextTopics() {
    const screen = currentScreen();
    const contextual = topics.filter((topic) => topic.screens?.includes(screen)).slice(0, 3);
    return contextual.length ? contextual : topics.slice(0, 3);
  }

  function renderChips() {
    const container = document.querySelector("#help-assistant-prompts");
    if (!container) return;
    container.innerHTML = contextTopics().map((topic) => `<button type="button" data-help-topic="${escapeHtml(topic.id)}">${escapeHtml(topic.title)}</button>`).join("");
  }

  function ask(query) {
    const text = String(query || "").trim();
    if (!text) return;
    state.messages.push({ role: "user", html: escapeHtml(text) }, { role: "assistant", html: answer(text) });
    renderMessages();
  }

  function setOpen(open) {
    const panel = document.querySelector("#help-assistant-panel");
    const launcher = document.querySelector("#help-assistant-launcher");
    if (!panel || !launcher) return;
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("help-assistant-open", open);
    if (open) {
      renderChips();
      if (!state.messages.length) {
        state.messages.push({ role: "assistant", html: `<div class="help-answer"><strong>¿En qué te ayudo?</strong><p>Te explico la aplicación paso a paso. Estoy en modo guía local: no consulto datos privados ni sustituyo una revisión humana.</p></div>` });
        renderMessages();
      }
      document.querySelector("#help-assistant-input")?.focus();
    } else {
      launcher.focus();
    }
  }

  function mount() {
    if (document.querySelector("#help-assistant-launcher")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <button class="help-assistant-launcher" id="help-assistant-launcher" type="button" aria-expanded="false" aria-controls="help-assistant-panel"><i data-lucide="life-buoy"></i><span>Guía</span></button>
      <aside class="help-assistant-panel" id="help-assistant-panel" role="dialog" aria-modal="false" aria-labelledby="help-assistant-title" hidden>
        <header><div><span class="help-mode">Ayuda para empezar</span><h2 id="help-assistant-title">Guía INSERTIA</h2></div><button class="icon-button" type="button" data-help-close aria-label="Cerrar guía"><i data-lucide="x"></i></button></header>
        <p class="help-privacy"><i data-lucide="lock-keyhole"></i>No escribas credenciales ni datos personales o sensibles.</p>
        <div class="help-assistant-log" id="help-assistant-log" aria-live="polite"></div>
        <div class="help-prompt-chips" id="help-assistant-prompts"></div>
        <form class="help-assistant-form" data-help-form><label class="sr-only" for="help-assistant-input">Pregunta sobre INSERTIA</label><textarea id="help-assistant-input" name="question" rows="2" placeholder="Pregunta: ¿qué significa preseleccionada?"></textarea><button class="primary-action" type="submit" aria-label="Enviar pregunta"><i data-lucide="send"></i></button></form>
      </aside>`);
    window.lucide?.createIcons();
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("#help-assistant-launcher")) setOpen(true);
    if (event.target.closest("[data-help-close]")) setOpen(false);
    const topicButton = event.target.closest("[data-help-topic]");
    if (topicButton) {
      const topic = topics.find((item) => item.id === topicButton.dataset.helpTopic);
      if (topic) ask(topic.title);
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-help-form]");
    if (!form) return;
    event.preventDefault();
    ask(form.elements.question.value);
    form.reset();
  });

  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
  window.addEventListener("hashchange", renderChips);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mount, { once: true }) : mount();
})();
