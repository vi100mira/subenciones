(function () {
  const defaultPlan = {
    code: "mission_full",
    label: "Plan integral piloto",
    billingStatus: "Contratado",
    features: ["dashboard", "opportunities", "entity", "agents", "workspace", "audit", "plan"],
    note: "Todos los agentes habilitados para Novaterra durante el piloto."
  };
  const featureLabels = {
    dashboard: "Panel",
    opportunities: "Radar publico y privado",
    entity: "Perfil de entidad",
    agents: "Asistentes IA",
    workspace: "Candidaturas y checklist",
    audit: "Auditoria y evidencias",
    platform: "Consola superadmin",
    operations: "Operaciones globales",
    plan: "Plan contratado"
  };
  const platformMetrics = [
    ["Ingresos MRR", "0 EUR", "Piloto interno; sin pasarela activa"],
    ["Gasto IA real hoy", "0,00 EUR", "OpenAI sin clave; ninguna llamada"],
    ["Workers alojados", "2", "Radares diario y redactor cada 5 minutos"],
    ["Tenants piloto", "1", "Novaterra; RAG privado no operativo"]
  ];
  const platformRows = [
    ["Novaterra", "Piloto activo", "0 EUR", "0,00 EUR", "Encaje local; IA pendiente"]
  ];

  function session() {
    return window.CredentialsAuth?.getSession?.() || null;
  }

  function plan() {
    return session()?.plan || defaultPlan;
  }

  function canUse(screen) {
    const current = session();
    if (!current) return false;
    if (["platform", "operations"].includes(screen)) return current.role === "superadmin";
    if (current.role === "superadmin") return ["dashboard", "opportunities", "agents", "audit", "platform", "operations", "plan"].includes(screen);
    return (current.plan?.features || defaultPlan.features).includes(screen);
  }

  function ensureNavigation() {
    const nav = document.querySelector(".nav-list");
    if (!nav || nav.querySelector('[data-screen="plan"]')) return;
    const button = document.createElement("button");
    button.className = "nav-item";
    button.dataset.screen = "plan";
    button.innerHTML = '<i data-lucide="credit-card"></i><span>Plan</span>';
    nav.insertBefore(button, nav.querySelector('[data-screen="platform"]'));
    button.addEventListener("click", showPlan);
    window.lucide?.createIcons();
  }

  function relabelNavigation() {
    const item = document.querySelector('.nav-item[data-screen="plan"]');
    if (!item) return;
    item.innerHTML = session()?.role === "superadmin" ? '<i data-lucide="activity"></i><span>Monitorizacion</span>' : '<i data-lucide="credit-card"></i><span>Plan</span>';
    window.lucide?.createIcons();
  }

  function ensureScreen() {
    const footer = document.querySelector(".app-footer");
    const existing = document.querySelector("#plan");
    if (existing) {
      if (footer) footer.parentNode.insertBefore(existing, footer);
      return;
    }
    (footer || document.querySelector(".main")).insertAdjacentHTML(footer ? "beforebegin" : "beforeend", `
      <section class="screen" id="plan" aria-labelledby="screen-title">
        <article class="panel">
          <div class="panel-heading">
            <div><p class="eyebrow">Monetizacion responsable</p><h2>Plan contratado</h2></div>
            <span class="badge safe" data-plan-status>Contratado</span>
          </div>
          <div id="plan-summary" class="source-control-row"></div>
          <div id="plan-features" class="plan-feature-grid"></div>
          <div class="plain-note"><strong>Sin pasarela todavia</strong><span>No se cobra desde esta pantalla. Deja visible que modulos tiene activos cada tenant y prepara la futura facturacion social.</span></div>
        </article>
      </section>
    `);
  }

  function renderPlan() {
    ensureScreen();
    const current = session();
    document.querySelector("#plan .platform-monitor-grid")?.remove();
    document.querySelector("#plan .panel-heading").innerHTML = `
      <div><p class="eyebrow">Monetizacion responsable</p><h2>Plan contratado</h2></div>
      <span class="badge safe" data-plan-status>Contratado</span>
    `;
    if (current?.role === "superadmin") return renderPlatformMonitor(current);
    const currentPlan = plan();
    document.querySelector("[data-plan-status]").textContent = currentPlan.billingStatus;
    document.querySelector("#plan-summary").innerHTML = `
      <div><strong>${current?.role === "superadmin" ? "Superadmin" : current?.label || "Tenant"}</strong><span>${currentPlan.label}</span></div>
      <div><strong>${currentPlan.code}</strong><span>Modelo de producto, no pasarela</span></div>
      <div><strong>${currentPlan.features.length} modulos</strong><span>${currentPlan.note}</span></div>
    `;
    document.querySelector("#plan-features").innerHTML = Object.entries(featureLabels).map(([key, label]) => {
      const enabled = canUse(key);
      return `<article class="plan-feature ${enabled ? "is-enabled" : "is-disabled"}"><strong>${label}</strong><span>${enabled ? "Habilitado" : "No incluido para este rol/plan"}</span></article>`;
    }).join("");
  }

  function renderPlatformMonitor(current) {
    document.querySelector("[data-plan-status]").textContent = "Interno";
    document.querySelector("#plan .panel-heading").innerHTML = `
      <div><p class="eyebrow">Control economico y operativo</p><h2>Monitorizacion plataforma</h2></div>
      <span class="badge safe" data-plan-status>Interno</span>
    `;
    document.querySelector("#plan-summary").innerHTML = platformMetrics.map(([title, value, note]) => `
      <div><strong>${title}</strong><span>${value} - ${note}</span></div>
    `).join("");
    document.querySelector("#plan-features").innerHTML = `
      <article class="plan-feature is-enabled"><strong>Balance operativo</strong><span>Ingresos menos costes IA, blob, ejecuciones y soporte. Pendiente conectar facturacion real.</span></article>
      <article class="plan-feature is-enabled"><strong>Consumo IA</strong><span>Control diario por agente, tenant y motivo de ejecucion. Maximo una IA diaria salvo accion manual auditada.</span></article>
      <article class="plan-feature is-enabled"><strong>Procesos alojados</strong><span>Busqueda de convocatorias y redactor en cola. Investigador de entidad, RAG privado y canales externos no operativos.</span></article>
      <article class="plan-feature is-enabled"><strong>Riesgo economico</strong><span>Bloquea ejecuciones si superan presupuesto o si no hay cambio detectable previo.</span></article>
    `;
    document.querySelector("#plan .plain-note").innerHTML = "<strong>Seguimiento superadmin</strong><span>Esta pantalla no vende planes. Sirve para controlar sostenibilidad: ingresos, costes, consumo IA, tenants, agentes activos y limites de ejecucion.</span>";
    document.querySelector("#plan .panel").insertAdjacentHTML("beforeend", `
      <div class="tenant-grid platform-monitor-grid">
        <div class="tenant-grid-head"><span>Tenant</span><span>Estado</span><span>Ingreso</span><span>Coste IA</span><span>Agentes</span></div>
        ${platformRows.map((row) => `<div class="tenant-grid-row">${row.map((cell) => `<span>${cell}</span>`).join("")}</div>`).join("")}
      </div>
    `);
  }

  function applyMenuPolicy() {
    ensureNavigation();
    relabelNavigation();
    document.querySelectorAll(".nav-item[data-screen]").forEach((item) => {
      item.hidden = !canUse(item.dataset.screen);
    });
  }

  function showPlan() {
    renderPlan();
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("is-visible", screen.id === "plan"));
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.screen === "plan"));
    document.querySelector("#screen-title").textContent = session()?.role === "superadmin" ? "Monitorizacion plataforma" : "Plan y monetizacion";
    history.replaceState(null, "", "#view-plan");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  window.PlanAccess = { applyMenuPolicy, canUse, renderPlan, showPlan };
  ensureNavigation();
  ensureScreen();
  applyMenuPolicy();
  document.addEventListener("DOMContentLoaded", () => { ensureNavigation(); ensureScreen(); applyMenuPolicy(); });
  window.addEventListener("hashchange", () => { if (location.hash === "#view-plan") showPlan(); else applyMenuPolicy(); });
  setTimeout(() => { if (location.hash === "#view-plan") showPlan(); }, 0);
})();
