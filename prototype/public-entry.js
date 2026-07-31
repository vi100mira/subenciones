(function () {
  const appShell = document.querySelector(".app-shell");
  if (!appShell) return;

  const entry = document.createElement("main");
  entry.className = "public-entry";
  entry.hidden = true;
  entry.innerHTML = `
    <div class="public-entry__grid">
      <section class="public-entry__intro">
        <div class="public-entry__brand"><div class="public-entry__insertia-lockup"><img src="./assets/insertia/insertia-mark.svg" alt="" /><span><strong>INSERTIA</strong><small>Una aplicación de <b>Novaterra Software</b></small></span></div><span class="public-entry__brand-divider" aria-hidden="true"></span><img class="public-entry__novaterra-logo" src="./assets/novaterra-foundation-logo-transparent.png" alt="Fundación Novaterra" /></div>
        <div class="public-entry__product-summary"><strong>De la convocatoria a la candidatura.</strong><span>Encuentra ayudas, entiende por qué encajan y prepara la documentación con fuentes verificables y revisión humana.</span></div>
        <p class="eyebrow">Una plataforma con control</p>
        <h1>Ayudas fiables, decisiones humanas.</h1>
        <p>Encuentra convocatorias y prepara candidaturas sin mezclar los datos de cada entidad.</p>
        <details class="public-entry__disclosure">
          <summary><i data-lucide="shield-check"></i><span><strong>Privacidad y control</strong><small>Cómo protegemos la información.</small></span><i class="public-entry__chevron" data-lucide="chevron-down"></i></summary>
          <div class="public-entry__assurance">
          <span><i data-lucide="shield-check"></i><span><strong>Cumplimiento normativo</strong>Arquitectura alineada con RGPD y soberania del dato.</span></span>
          <span><i data-lucide="lock-keyhole"></i><span><strong>Cifrado y control</strong>Cada uso de datos privados requiere un permiso explícito y queda registrado.</span></span>
          </div>
        </details>
        <details class="public-entry__disclosure">
          <summary><i data-lucide="radar"></i><span><strong>Cómo funciona la búsqueda</strong><small>Tres radares, una búsqueda explicable.</small></span><i class="public-entry__chevron" data-lucide="chevron-down"></i></summary>
        <section class="public-entry__radars" aria-labelledby="public-radars-title">
          <p class="eyebrow">Como funciona la busqueda</p>
          <h2 id="public-radars-title">Tres radares, una busqueda explicable</h2>
          <div class="public-entry__radar-list">
            <article><strong>Municipal y social</strong><span>Consulta convocatorias locales y sociales publicadas en BDNS.</span></article>
            <article><strong>Publico general</strong><span>Amplia la cobertura con convocatorias publicas de ambito general.</span></article>
            <article><strong>Financiacion privada</strong><span>Localiza fundaciones y programas corporativos, verifica su web y bases, y solo conserva candidatas con procedencia clara.</span></article>
          </div>
          <p class="public-entry__radar-note">El radar privado amplía sus fuentes de forma continua, deduplica entidades y separa una candidata descubierta de una convocatoria verificable. Las fuentes y sus bases se documentan primero; el encaje con cada entidad se analiza después, con revisión humana cuando corresponde.</p>
        </section>
        </details>
      </section>
      <section class="public-entry__access">
        <figure class="public-entry__access-visual" aria-hidden="true"><img src="./assets/stitch-ngo-grant-hero.png" alt="" /></figure>
        <article class="public-entry__card public-entry__card--login">
          <div class="public-entry__tabs" role="tablist" aria-label="Acceso, registro y precios"><button class="is-active" type="button" role="tab" aria-selected="true" aria-controls="public-login-panel" data-entry-tab="login">Acceder</button><button type="button" role="tab" aria-selected="false" aria-controls="public-register-panel" data-entry-tab="register">Registrar entidad</button><button type="button" role="tab" aria-selected="false" aria-controls="public-plans-panel" data-entry-tab="plans">Planes y precios</button></div>
          <section id="public-login-panel" role="tabpanel">
          <div class="panel-heading"><div><p class="eyebrow">Acceso seguro</p><h2>Acceso institucional <button class="info-tip" type="button" aria-label="Cómo se asigna el acceso"><i data-lucide="info"></i><span class="info-tip__content">El sistema valida las credenciales y muestra solo las áreas autorizadas para cada persona y entidad. El rol no se elige desde esta pantalla.</span></button></h2></div><span class="badge safe">Credenciales</span></div>
          <form class="inline-form public-entry__actions" id="public-login-form">
            <label><span>Email profesional</span><input name="email" type="email" placeholder="admin@entidad.org" required /></label>
            <label><span>Contrasena</span><span class="password-field"><input name="password" type="password" minlength="6" required /><button class="password-toggle" data-toggle-password type="button" aria-label="Mostrar contrasena" title="Mostrar contrasena"><i data-lucide="eye"></i></button></span></label>
            <button class="primary-action" type="submit">Acceder al panel</button>
          </form>
          <div id="public-login-status" class="plain-note" hidden aria-live="polite"></div>
          </section>
          <section id="public-invite-panel" role="tabpanel" hidden>
            <div class="panel-heading"><div><p class="eyebrow">Acceso inicial</p><h2>Crea tu contrasena</h2></div><span class="badge safe">Invitacion segura</span></div>
            <p class="plain-note"><strong>Cuenta activada</strong><span>Elige una contrasena para completar el acceso. Este enlace solo puede usarse una vez.</span></p>
            <form class="inline-form public-entry__actions" id="public-invite-form">
              <label><span>Nueva contrasena</span><input name="password" type="password" minlength="12" autocomplete="new-password" required /></label>
              <label><span>Repite la contrasena</span><input name="passwordConfirm" type="password" minlength="12" autocomplete="new-password" required /></label>
              <button class="primary-action" type="submit">Activar acceso</button>
            </form>
            <div id="public-invite-status" class="plain-note" hidden aria-live="polite"></div>
          </section>
          <section id="public-register-panel" role="tabpanel" hidden>
          <div class="panel-heading"><div><p class="eyebrow">Alta segura</p><h2>Solicitar alta de entidad <button class="info-tip" type="button" aria-label="Qué ocurre al enviar la solicitud"><i data-lucide="info"></i><span class="info-tip__content">La solicitud queda pendiente de revisión. No crea usuarios, no conecta Drive y no usa información privada hasta que una persona responsable la apruebe.</span></button></h2></div><span class="badge review">Sin publicar</span></div>
          <p class="plain-note"><strong>Decision de consentimiento</strong><span>Si no autorizas el analisis de web publica, la entidad se registra igualmente. No se consulta la web ni se generan sugerencias; podras autorizarlo mas adelante desde Asistentes.</span></p>
          <form class="inline-form" id="public-onboarding-form">
            <label><span>Entidad</span><input name="entityName" value="Entidad social" required /></label>
            <label><span>Web publica</span><input name="websiteUrl" placeholder="https://entidad.org" /></label>
            <label><span>Email solicitante</span><input name="requesterEmail" type="email" required /></label>
            <label><span>Email admin entidad</span><input name="adminEmail" type="email" required /></label>
            <label><span>Territorio</span><select name="territory"><option>Ámbito estatal</option><option>Andalucía</option><option>Aragón</option><option>Asturias</option><option>Illes Balears</option><option>Canarias</option><option>Cantabria</option><option>Castilla-La Mancha</option><option>Castilla y León</option><option selected>Comunitat Valenciana</option><option>Cataluña</option><option>Extremadura</option><option>Galicia</option><option>Comunidad de Madrid</option><option>Región de Murcia</option><option>Comunidad Foral de Navarra</option><option>País Vasco</option><option>La Rioja</option><option>Ceuta</option><option>Melilla</option><option>Otro o por definir</option></select></label>
            <label><span><input name="publicWebConsent" type="checkbox" /> Autoriza solo analisis de web publica</span></label>
            <button class="primary-action" type="submit">Registrar solicitud</button>
          </form>
          <div id="public-onboarding-status" class="plain-note" hidden aria-live="polite"></div>
          </section>
          <section id="public-plans-panel" role="tabpanel" hidden>
            <div class="panel-heading"><div><p class="eyebrow">Precios transparentes</p><h2>Elige según el trabajo que necesitas</h2></div><span class="badge safe">Tarifa social</span></div>
            <p class="public-entry__pricing-intro">El radar público y las fuentes oficiales son siempre gratuitos. Los planes de pago cubren el trabajo operativo; nunca compran prioridad ni decisiones automáticas.</p>
            <div class="pricing-grid public-pricing-grid" id="public-pricing-grid"></div>
            <div class="plain-note"><strong>Consulta sin compromiso</strong><span>La contratación online todavía no está activa. El alta de una entidad no genera ningún cobro y toda candidatura conserva sus puntos de revisión humana.</span></div>
          </section>
        </article>
      </section>
    </div>`;
  document.body.prepend(entry);
  window.PlanAccess?.renderPublicPricing?.();
  window.lucide?.createIcons();

  function selectEntryTab(tab) {
    const panels = { login: "#public-login-panel", register: "#public-register-panel", plans: "#public-plans-panel" };
    Object.entries(panels).forEach(([key, selector]) => { entry.querySelector(selector).hidden = key !== tab; });
    entry.querySelectorAll("[data-entry-tab]").forEach((button) => {
      const selected = button.dataset.entryTab === tab;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  }

  entry.querySelectorAll("[data-entry-tab]").forEach((button) => {
    button.addEventListener("click", () => selectEntryTab(button.dataset.entryTab));
  });

  function setRole(session) {
    document.body.dataset.role = session.role;
    sessionStorage.setItem("prototype-role", session.role);
    window.CredentialsAuth?.applySession?.(session);
    window.refreshRoleViews?.();
    window.dispatchEvent(new CustomEvent("role-session-applied"));
    window.PlanAccess?.applyMenuPolicy?.();
    window.lucide?.createIcons();
  }

  function initialScreen(session, requested) {
    if (requested && requested !== "welcome") return requested;
    return window.CredentialsAuth.consumeReturnScreen?.() || "dashboard";
  }

  function showPublic() {
    entry.hidden = false;
    appShell.hidden = true;
    history.replaceState(null, "", "#view-welcome");
  }

  function showApp(session, screen) {
    setRole(session);
    entry.hidden = true;
    appShell.hidden = false;
    document.querySelector(`[data-screen="${screen}"]`)?.click();
  }
  function showSessionNotice() {
    const message = window.CredentialsAuth.consumeNotice?.();
    if (!message) return;
    const status = entry.querySelector("#public-login-status");
    status.hidden = false;
    status.innerHTML = "<strong>Sesión caducada</strong><span></span>";
    status.querySelector("span").textContent = message;
  }

  function invitationTokens() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const type = hash.get("type") || query.get("type") || "recovery";
    if (!["invite", "recovery"].includes(type)) return null;
    const accessToken = hash.get("access_token") || "";
    const refreshToken = hash.get("refresh_token") || "";
    const code = query.get("code") || "";
    const tokenHash = query.get("token_hash") || "";
    return (accessToken && refreshToken) || code || tokenHash ? { accessToken, refreshToken, code, tokenHash, type } : null;
  }

  function showInvitation(tokens) {
    if (!tokens) return false;
    entry.querySelector(".public-entry__tabs").hidden = true;
    entry.querySelector("#public-login-panel").hidden = true;
    entry.querySelector("#public-register-panel").hidden = true;
    entry.querySelector("#public-plans-panel").hidden = true;
    entry.querySelector("#public-invite-panel").hidden = false;
    entry.querySelector("#public-invite-form").dataset.accessToken = tokens.accessToken;
    entry.querySelector("#public-invite-form").dataset.refreshToken = tokens.refreshToken;
    entry.querySelector("#public-invite-form").dataset.code = tokens.code;
    entry.querySelector("#public-invite-form").dataset.tokenHash = tokens.tokenHash;
    entry.querySelector("#public-invite-form").dataset.type = tokens.type;
    return true;
  }
  window.addEventListener("auth-session-expired", () => {
    document.querySelectorAll(".modal-backdrop").forEach((modal) => modal.remove());
    showPublic();
    showSessionNotice();
  });

  function loginHelp(email, fallback) {
    if (email.endsWith("@novatera.org.es")) return "Revisa el email: Novaterra lleva doble r. Usa pmira@novaterra.org.es.";
    return fallback;
  }

  entry.querySelector("#public-login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const status = entry.querySelector("#public-login-status");

    const session = await window.CredentialsAuth.login(email, password);
    if (!session) {
      const message = loginHelp(email, window.CredentialsAuth.getLastError?.() || "Usuario o contrasena no validos.");
      status.hidden = false;
      status.innerHTML = "<strong>Acceso rechazado</strong><span></span>";
      status.querySelector("span").textContent = message;
      return;
    }

    showApp(session, initialScreen(session, ""));
  });

  entry.querySelector("#public-invite-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.elements.password.value;
    const confirmation = form.elements.passwordConfirm.value;
    const status = entry.querySelector("#public-invite-status");
    if (password !== confirmation) {
      status.hidden = false;
      status.innerHTML = "<strong>Revisa la contrasena</strong><span>Los dos campos deben coincidir.</span>";
      return;
    }
    status.hidden = false;
    status.innerHTML = "<strong>Activando acceso</strong><span>Guardando la contrasena de forma segura.</span>";
    const response = await fetch("/api/auth-invite-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: form.dataset.accessToken, refreshToken: form.dataset.refreshToken, code: form.dataset.code, tokenHash: form.dataset.tokenHash, type: form.dataset.type, password })
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || !payload?.ok) {
      status.innerHTML = `<strong>No se pudo activar</strong><span>${payload?.error || "El enlace puede haber caducado. Solicita una invitacion nueva."}</span>`;
      return;
    }
    history.replaceState(null, "", "#view-welcome");
    const session = await window.CredentialsAuth.login(payload.data.email, password);
    if (session) return showApp(session, initialScreen(session, ""));
    status.innerHTML = "<strong>Contrasena creada</strong><span>Vuelve a acceder con tu correo y la nueva contrasena.</span>";
  });

  entry.querySelector("[data-toggle-password]").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const input = entry.querySelector("#public-login-form input[name='password']");
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.setAttribute("aria-label", visible ? "Mostrar contrasena" : "Ocultar contrasena");
    button.title = visible ? "Mostrar contrasena" : "Ocultar contrasena";
    button.innerHTML = `<i data-lucide="${visible ? "eye" : "eye-off"}"></i>`;
    window.lucide?.createIcons();
  });

  entry.querySelector("#public-onboarding-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = entry.querySelector("#public-onboarding-status");
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());
    payload.publicWebConsent = data.get("publicWebConsent") === "on";
    status.hidden = false;
    status.innerHTML = "<strong>Registrando</strong><span>Guardando solicitud en Supabase.</span>";
    try {
      const response = await fetch("/api/onboarding-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo registrar la solicitud");
      status.innerHTML = `<strong>Solicitud registrada</strong><span>Estado ${result.data.request.status}. Falta verificacion por email del admin.</span>`;
    } catch (error) {
      status.innerHTML = `<strong>No conectado</strong><span>${error.message}. Usa Vercel dev para probar la API.</span>`;
    }
  });

  const hash = window.location.hash;
  const mode = new URLSearchParams(window.location.search).get("v");
  const session = window.CredentialsAuth.getSession();
  const requested = hash.startsWith("#view-") ? hash.replace("#view-", "") : "";
  const target = session ? initialScreen(session, requested) : "";
  if (showInvitation(invitationTokens()) || mode === "public-entry" || hash === "#view-welcome" || !session || !window.CredentialsAuth.canAccess(target || "dashboard", session)) {
    showPublic();
    showSessionNotice();
  } else {
    showApp(session, target);
  }
})();
