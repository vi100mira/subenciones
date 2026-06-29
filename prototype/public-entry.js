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
          <div class="panel-heading"><div><p class="eyebrow">Acceso seguro</p><h2>Acceso institucional</h2></div><span class="badge review">Demo</span></div>
          <form class="inline-form public-entry__actions" id="public-login-form">
            <label><span>Email profesional</span><input name="email" type="email" placeholder="admin@entidad.org" required /></label>
            <label><span>Contrasena</span><input name="password" type="password" minlength="6" required /></label>
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

  document.querySelector(".sidebar-note")?.insertAdjacentHTML(
    "beforeend",
    `<div class="role-chip role-chip--entity">Rol Novaterra: docente/gestor</div><div class="role-chip role-chip--superadmin">Rol plataforma</div>`
  );

  const demoAccounts = {
    "pmira@novaterra.org.es": { role: "entity", screen: "entity" },
    "superadmin@subvenciones-rag.local": { role: "superadmin", screen: "platform" }
  };

  function setRole(role) {
    document.body.dataset.role = role;
    sessionStorage.setItem("prototype-role", role);
  }

  function showPublic() {
    entry.hidden = false;
    appShell.hidden = true;
    history.replaceState(null, "", "#view-welcome");
  }

  function showApp(role, screen) {
    setRole(role);
    entry.hidden = true;
    appShell.hidden = false;
    document.querySelector(`[data-screen="${screen}"]`)?.click();
  }

  entry.querySelector("#public-login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const status = entry.querySelector("#public-login-status");

    // Prototype-only credential gate; replace with Supabase Auth before production.
    if (!email.includes("@") || password.length < 6) {
      status.innerHTML = "<strong>Acceso rechazado</strong><span>Credenciales incompletas o no validas.</span>";
      return;
    }

    const account = demoAccounts[email];
    if (!account) {
      status.innerHTML = "<strong>Acceso rechazado</strong><span>Usuario no autorizado en esta demo.</span>";
      return;
    }

    showApp(account.role, account.screen);
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
  if (mode === "public-entry" || hash === "#view-welcome" || (hash === "#view-dashboard" && !sessionStorage.getItem("prototype-role"))) {
    showPublic();
  } else {
    const role = hash.includes("platform") || hash.includes("operations") ? "superadmin" : sessionStorage.getItem("prototype-role") || "entity";
    setRole(role);
    entry.hidden = true;
    appShell.hidden = false;
  }
})();
