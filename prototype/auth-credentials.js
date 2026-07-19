(function () {
  const sessionKey = "subvenciones.auth.session.v1";
  const protectedScreens = new Set(["platform", "operations"]);
  let lastError = "";

  function saveSession(session) {
    const cleanSession = { ...session, issuedAt: new Date().toISOString() };
    sessionStorage.setItem(sessionKey, JSON.stringify(cleanSession));
    sessionStorage.setItem("prototype-role", cleanSession.role);
    return cleanSession;
  }

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(sessionKey) || "null"); } catch { return null; }
  }

  function canAccess(screen, session = getSession()) {
    if (!protectedScreens.has(screen)) return Boolean(session);
    return session?.role === "superadmin";
  }

  function applySession(session = getSession()) {
    if (!session) return null;
    document.body.dataset.role = session.role;
    sessionStorage.setItem("prototype-role", session.role);
    const note = document.querySelector(".sidebar-note");
    if (!note) return session;
    note.querySelector(".auth-session")?.remove();
    const item = document.createElement("div");
    const logo = document.createElement("img");
    const label = document.createElement("span");
    const role = document.createElement("strong");
    const button = document.createElement("button");
    item.className = "auth-session";
    const tenantName = String(session.label || "").replace(/\s+demo$/i, "");
    const tenantLogoUrl = session.tenantLogoUrl || (/novaterra/i.test(tenantName) ? "./assets/novaterra-foundation-logo-transparent.png" : "");
    role.textContent = session.role === "superadmin" ? "Administración" : "Entidad";
    label.textContent = tenantName;
    button.type = "button";
    button.dataset.authLogout = "";
    button.textContent = "Salir";
    if (session.role === "entity" && tenantLogoUrl) {
      logo.className = "auth-session__tenant-logo";
      logo.src = tenantLogoUrl;
      logo.alt = `Logo de ${tenantName}`;
      item.classList.add("has-tenant-logo");
      item.append(logo);
    }
    item.append(role, label, button);
    note.append(item);
    window.PlanAccess?.applyMenuPolicy?.();
    return session;
  }

  function authHeaders(session = getSession()) {
    return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-auth-logout]")) return;
    window.CredentialsAuth.logout();
  });

  window.CredentialsAuth = {
    getSession,
    getLastError: () => lastError,
    canAccess,
    applySession,
    authHeaders,
    async login(email, password) {
      lastError = "";
      try {
        const response = await fetch("/api/auth-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          lastError = payload?.error || "No se pudo validar la sesion en servidor.";
          return null;
        }
        return applySession(saveSession(payload.data));
      } catch {
        lastError = "Servidor de autenticacion no disponible.";
        return null;
      }
    },
    logout() {
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem("prototype-role");
      document.body.dataset.role = "";
      location.href = "#view-welcome";
      location.reload();
    }
  };
})();
