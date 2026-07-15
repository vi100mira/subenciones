(function () {
  const defaultPlan = {
    code: "mission_full", label: "Misión integral", billingMode: "sponsored", billingStatus: "Piloto patrocinado",
    currentMonthlyEur: 0, referenceMonthlyEur: 79,
    features: ["dashboard", "opportunities", "entity", "agents", "workspace", "audit", "plan"],
    agentKeys: ["grant_search", "entity_research", "match_agent", "document_review", "draft_agent", "alert_agent"]
  };
  const areas = [
    ["grant_search", "search", "Radar de convocatorias", "Fuentes públicas y financiadores privados curados"],
    ["entity_research", "globe-2", "Conocimiento de la entidad", "Perfil propuesto desde la web pública autorizada"],
    ["match_agent", "git-compare-arrows", "Encaje explicable", "Comparación con evidencias y revisión humana"],
    ["document_review", "file-search", "Revisión de bases", "Requisitos, fechas y documentos obligatorios"],
    ["draft_agent", "files", "Preparación documental", "Borradores solo con autorización expresa"],
    ["alert_agent", "bell", "Avisos y recordatorios", "Canales externos cuando estén conectados"]
  ];
  const offers = [
    { code: "public", name: "Radar público", price: "0 €", suffix: "siempre", icon: "radar", features: ["Convocatorias oficiales", "Fuentes y evidencias", "Sin datos privados"] },
    { code: "social_team", name: "Equipo social", price: "29 €", suffix: "/ mes", icon: "users", features: ["Hasta 3 personas", "Perfil y encaje explicable", "Alertas dentro de la aplicación"] },
    { code: "mission_full", name: "Misión integral", price: "79 €", suffix: "/ mes", icon: "shield-check", features: ["Hasta 10 personas", "Revisión y borradores", "Auditoría y control de datos"] }
  ];
  let runtimeAgents = [];

  function session() { return window.CredentialsAuth?.getSession?.() || null; }
  function plan() {
    const supplied = session()?.plan || {};
    const legacyPilot = supplied.code === "mission_full" && supplied.label === "Plan integral piloto";
    return { ...defaultPlan, ...supplied, ...(legacyPilot ? {
      label: "Misión integral", billingMode: "sponsored", billingStatus: "Piloto patrocinado",
      currentMonthlyEur: 0, referenceMonthlyEur: 79, agentKeys: defaultPlan.agentKeys
    } : {}) };
  }
  function money(value) { return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(Number(value || 0))} €`; }
  function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function canUse(screen) {
    const current = session();
    if (!current) return false;
    if (["platform", "operations"].includes(screen)) return current.role === "superadmin";
    if (current.role === "superadmin") return ["dashboard", "opportunities", "agents", "audit", "platform", "operations", "plan"].includes(screen);
    return (current.plan?.features || defaultPlan.features).includes(screen);
  }

  function ensureMonitorNavigation() {
    const nav = document.querySelector(".nav-list");
    const existing = nav?.querySelector('[data-screen="plan"]');
    if (session()?.role !== "superadmin") { existing?.remove(); return; }
    if (existing) return;
    const button = document.createElement("button");
    button.className = "nav-item"; button.dataset.screen = "plan";
    button.innerHTML = '<i data-lucide="activity"></i><span>Monitorización</span>';
    nav.insertBefore(button, nav.querySelector('[data-screen="platform"]'));
    button.addEventListener("click", showPlan);
  }

  function ensureMonitorScreen() {
    if (document.querySelector("#plan")) return;
    document.querySelector(".app-footer")?.insertAdjacentHTML("beforebegin", '<section class="screen" id="plan" aria-labelledby="screen-title"><article class="panel"><div class="panel-heading"><div><p class="eyebrow">Control económico y operativo</p><h2>Monitorización de plataforma</h2></div><span class="badge safe">Interno</span></div><div class="source-control-row"><div><strong>Ingresos recurrentes</strong><span>0 EUR · piloto sin pasarela</span></div><div><strong>Gasto IA real hoy</strong><span>0,00 EUR · ninguna llamada facturada</span></div><div><strong>Entidades piloto</strong><span>1 · aislamiento por entidad</span></div></div><div class="plain-note"><strong>Seguimiento interno</strong><span>Esta vista controla sostenibilidad, consumo y límites; no modifica el plan de una entidad.</span></div></article></section>');
  }

  function agentState(key) {
    const item = runtimeAgents.find((agent) => agent.agent_key === key);
    if (!item) return ["Contratado", "review"];
    if (item.enabled && item.status === "ready") return ["Operativo", "safe"];
    if (item.status === "paused") return ["Pausado", "review"];
    return ["Requiere acción", "warning"];
  }

  function pricingCards(currentCode = "", publicView = false) {
    return offers.map((offer) => {
      const active = !publicView && offer.code === currentCode;
      const actionLabel = publicView
        ? offer.code === "public" ? "Disponible sin coste" : "Contratación próximamente"
        : active ? "Incluido para esta entidad" : offer.code === "public" ? "Incluido siempre" : "Cambio online pendiente";
      return `<article class="pricing-card ${active ? "is-current" : ""}">${active ? '<span class="pricing-ribbon">Plan actual</span>' : ""}<i data-lucide="${offer.icon}"></i><h3>${offer.name}</h3><p class="pricing-price"><strong>${offer.price}</strong><span>${offer.suffix}</span></p><ul>${offer.features.map((feature) => `<li><i data-lucide="check"></i>${feature}</li>`).join("")}</ul><button class="${active ? "primary-action" : "ghost-action"}" data-plan-code="${offer.code}" type="button" disabled>${actionLabel}</button></article>`;
    }).join("");
  }

  function renderPublicPricing() {
    const grid = document.querySelector("#public-pricing-grid");
    if (!grid) return;
    grid.innerHTML = pricingCards("", true);
    window.lucide?.createIcons();
  }

  function renderEntityPlan() {
    const screen = document.querySelector("#entity");
    screen?.querySelector("#entity-plan")?.remove();
    if (!screen || session()?.role !== "entity") return;
    const current = plan();
    const entityName = (session()?.label || "Entidad").replace(/\s+demo$/i, "");
    const contracted = new Set(current.agentKeys || defaultPlan.agentKeys);
    const areaCards = areas.map(([key, icon, title, detail]) => {
      const included = contracted.has(key); const [status, tone] = included ? agentState(key) : ["No incluido", "neutral"];
      return `<article class="contracted-area ${included ? "is-contracted" : "is-unavailable"}"><i data-lucide="${icon}"></i><div><strong>${title}</strong><span>${detail}</span></div><span class="badge ${tone}">${status}</span></article>`;
    }).join("");
    const offerCards = pricingCards(current.code);
    screen.insertAdjacentHTML("beforeend", `<article class="panel entity-plan" id="entity-plan"><div class="panel-heading"><div><p class="eyebrow">Plan y servicios</p><h2>Contratación de ${escapeHtml(entityName)}</h2></div><span class="badge safe">${escapeHtml(current.billingStatus || "Contratado")}</span></div><div class="plan-contract-summary"><div><span>Plan actual</span><strong>${escapeHtml(current.label || "Misión integral")}</strong></div><div><span>Cuota actual</span><strong>${money(current.currentMonthlyEur)}</strong><small>Referencia: ${money(current.referenceMonthlyEur)} / mes</small></div><div><span>Facturación</span><strong>Sin cobros activados</strong></div></div><details class="contracted-areas" open><summary><span><strong>Áreas y asistentes incluidos</strong><small>El plan concede acceso; los permisos y consentimientos determinan si cada asistente puede operar.</small></span><i data-lucide="chevron-down"></i></summary><div class="contracted-area-grid">${areaCards}</div></details><div class="pricing-heading"><div><p class="eyebrow">Modelo solidario</p><h3>Planes sencillos y comparables</h3></div><p>La información oficial sigue siendo gratuita. Se cobra por el trabajo operativo, nunca por datos sensibles ni por mejorar artificialmente una recomendación.</p></div><div class="pricing-grid">${offerCards}</div><div class="plain-note"><strong>Preparado para una futura pasarela</strong><span>Los importes son la propuesta de tarifa social, sin impuestos ni cobro activo. Antes de contratar se mostrarán condiciones, ayuda patrocinada y coste total; ninguna acción enviará datos o documentos sin revisión humana.</span></div></article>`);
    window.lucide?.createIcons();
  }

  function applyMenuPolicy() {
    ensureMonitorNavigation(); ensureMonitorScreen();
    document.querySelectorAll(".nav-item[data-screen]").forEach((item) => { item.hidden = !canUse(item.dataset.screen); });
    renderEntityPlan(); window.lucide?.createIcons();
  }
  function renderPlan() { if (session()?.role === "superadmin") ensureMonitorScreen(); else renderEntityPlan(); }
  function showPlan() {
    if (session()?.role !== "superadmin") { document.querySelector('[data-screen="entity"]')?.click(); return; }
    ensureMonitorScreen();
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("is-visible", screen.id === "plan"));
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.screen === "plan"));
    document.querySelector("#screen-title").textContent = "Monitorización plataforma";
    history.replaceState(null, "", "#view-plan"); window.scrollTo({ top: 0, behavior: "auto" });
  }

  window.PlanAccess = { applyMenuPolicy, canUse, renderPlan, renderEntityPlan, renderPublicPricing, showPlan };
  document.addEventListener("DOMContentLoaded", applyMenuPolicy);
  window.addEventListener("role-session-applied", () => setTimeout(applyMenuPolicy, 0));
  window.addEventListener("tenant-agent-governance-loaded", (event) => { runtimeAgents = event.detail?.agents || []; renderEntityPlan(); });
  window.addEventListener("hashchange", () => { if (location.hash === "#view-plan") showPlan(); });
  setTimeout(applyMenuPolicy, 0);
})();
