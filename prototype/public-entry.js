(function () {
  const appShell = document.querySelector(".app-shell");
  if (!appShell) return;

  const entry = document.createElement("main");
  entry.className = "public-entry";
  entry.hidden = true;
  entry.innerHTML = `
    <div class="public-entry__grid">
      <section class="public-entry__intro">
        <div class="public-entry__brand"><img src="./assets/insertia/icon-192.png" alt="" /><strong>INSERTIA</strong></div>
        <div class="public-entry__product-summary"><strong>De la convocatoria a la candidatura.</strong><span>Encuentra ayudas, entiende por qué encajan y prepara la documentación con fuentes verificables y revisión humana.</span></div>
        <p class="eyebrow">Compromiso administrativo</p>
        <h1>Garantia de integridad y privacidad institucional</h1>
        <p>Plataforma para entidades sociales que separa fuentes publicas, datos internos, consentimiento y revision humana antes de usar IA.</p>
        <div class="public-entry__assurance">
          <span><i data-lucide="shield-check"></i><span><strong>Cumplimiento normativo</strong>Arquitectura alineada con RGPD y soberania del dato.</span></span>
          <span><i data-lucide="lock-keyhole"></i><span><strong>Cifrado y control</strong>Cada uso de datos privados requiere un permiso explícito y queda registrado.</span></span>
        </div>
        <figure><img src="./assets/stitch-ngo-grant-hero.png" alt="Ilustracion institucional de gestion segura de subvenciones" /></figure>
      </section>
      <section class="public-entry__access">
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
    return requested || "dashboard";
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
  if (mode === "public-entry" || hash === "#view-welcome" || !session || !window.CredentialsAuth.canAccess(target || "dashboard", session)) {
    showPublic();
  } else {
    showApp(session, target);
  }
})();
