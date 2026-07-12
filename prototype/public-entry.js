(function () {
  const appShell = document.querySelector(".app-shell");
  if (!appShell) return;

  const entry = document.createElement("main");
  entry.className = "public-entry";
  entry.hidden = true;
  entry.innerHTML = `
    <div class="public-entry__grid">
      <section class="public-entry__intro">
        <div class="public-entry__brand"><img src="./assets/subvenciones-rag-logo.svg" alt="" /><strong>Subvenciones con IA</strong></div>
        <p class="eyebrow">Compromiso administrativo</p>
        <h1>Garantia de integridad y privacidad institucional</h1>
        <p>Plataforma para entidades sociales que separa fuentes publicas, datos internos, consentimiento y revision humana antes de usar IA.</p>
        <div class="public-entry__assurance">
          <span><i data-lucide="shield-check"></i><span><strong>Cumplimiento normativo</strong>Arquitectura alineada con RGPD y soberania del dato.</span></span>
          <span><i data-lucide="lock-keyhole"></i><span><strong>Cifrado y control</strong>Acceso por rol, auditoria y consentimiento granular.</span></span>
        </div>
        <figure><img src="./assets/stitch-ngo-grant-hero.png" alt="Ilustracion institucional de gestion segura de subvenciones" /></figure>
      </section>
      <section class="public-entry__access">
        <article class="public-entry__card public-entry__card--login">
          <div class="public-entry__tabs"><span class="is-active">Acceder</span><span>Registrar entidad</span></div>
          <div class="panel-heading"><div><p class="eyebrow">Acceso seguro</p><h2>Acceso institucional</h2></div><span class="badge safe">Credenciales</span></div>
          <form class="inline-form public-entry__actions" id="public-login-form">
            <label><span>Email profesional</span><input name="email" type="email" placeholder="admin@entidad.org" required /></label>
            <label><span>Contrasena</span><span class="password-field"><input name="password" type="password" minlength="6" required /><button class="password-toggle" data-toggle-password type="button" aria-label="Mostrar contrasena" title="Mostrar contrasena"><i data-lucide="eye"></i></button></span></label>
            <button class="primary-action" type="submit">Acceder al panel</button>
          </form>
          <div id="public-login-status" class="plain-note"><strong>Acceso</strong><span>El rol se asigna desde las credenciales validadas, no desde botones publicos.</span></div>
        </article>
        <article class="public-entry__card">
          <div class="panel-heading"><div><p class="eyebrow">Alta segura</p><h2>Solicitar alta de entidad</h2></div><span class="badge review">Sin publicar</span></div>
          <form class="inline-form" id="public-onboarding-form">
            <label><span>Entidad</span><input name="entityName" value="Entidad social demo" required /></label>
            <label><span>Web publica</span><input name="websiteUrl" placeholder="https://entidad.org" /></label>
            <label><span>Email solicitante</span><input name="requesterEmail" type="email" required /></label>
            <label><span>Email admin entidad</span><input name="adminEmail" type="email" required /></label>
            <label><span>Territorio</span><input name="territory" value="Comunitat Valenciana" /></label>
            <label><span><input name="publicWebConsent" type="checkbox" /> Autoriza solo analisis de web publica</span></label>
            <button class="primary-action" type="submit">Registrar solicitud</button>
          </form>
          <div id="public-onboarding-status" class="plain-note"><strong>Estado</strong><span>La solicitud queda pendiente. No activa la entidad, usuario, Drive ni aprobacion automatica.</span></div>
        </article>
      </section>
    </div>`;
  document.body.prepend(entry);
  window.lucide?.createIcons();

  function setRole(session) {
    document.body.dataset.role = session.role;
    sessionStorage.setItem("prototype-role", session.role);
    window.CredentialsAuth?.applySession?.(session);
    window.refreshRoleViews?.();
    window.dispatchEvent(new CustomEvent("role-session-applied"));
    window.PlanAccess?.applyMenuPolicy?.();
    const cta = document.querySelector(".top-actions .primary-action"); if (cta) cta.innerHTML = session.role === "superadmin" ? '<i data-lucide="play"></i>Ejecutar ahora' : '<i data-lucide="plus"></i>Nueva busqueda'; window.lucide?.createIcons();
  }

  function initialScreen(session, requested) {
    if (session.role === "superadmin" && (!requested || ["dashboard", "entity", "workspace"].includes(requested))) return session.screen;
    return requested || session.screen || "dashboard";
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
      status.innerHTML = "<strong>Acceso rechazado</strong><span></span>";
      status.querySelector("span").textContent = message;
      return;
    }

    showApp(session, session.screen);
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
