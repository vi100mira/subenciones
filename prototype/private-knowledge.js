(function () {
  const sourceOptions = {
    local: { consent: "manual_upload", kind: "local_simulation", connector: "local_folder", label: "Carpeta local autorizada" },
    drive: { consent: "drive_connection", kind: "google_drive", connector: "google_drive", label: "Google Drive autorizado" },
    sharepoint: { consent: "sharepoint_connection", kind: "microsoft_graph", connector: "microsoft_graph", label: "SharePoint autorizado" }
  };
  let governance = null;
  let localFolderSelection = null;
  const localFormSelections = new WeakMap();

  function session() { return window.CredentialsAuth?.getSession?.(); }
  function key() { return `insertia.private-knowledge.v1:${session()?.tenantId || "anonymous"}`; }
  function state() { try { return JSON.parse(sessionStorage.getItem(key()) || '{"phase":"source"}'); } catch { return { phase: "source" }; } }
  function save(next) { sessionStorage.setItem(key(), JSON.stringify({ ...state(), ...next })); render(); }
  function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function contracted() { return (session()?.plan?.agentKeys || []).includes("draft_agent"); }
  function source() { return governance?.privateSources?.find((item) => item.scope === "tenant_private") || null; }
  function sourceChoice(current) {
    if (current?.kind === "google_drive") return sourceOptions.drive;
    if (current?.kind === "microsoft_graph") return sourceOptions.sharepoint;
    return sourceOptions.local;
  }
  function hasCompatibleConsent(current) {
    const required = sourceChoice(current).consent;
    return governance?.consents?.some((item) => item.consent_type === required && item.status === "granted") || false;
  }
  function localSelectionMatches(current) {
    return current?.kind === "local_simulation" && localFolderSelection?.tenantId === session()?.tenantId
      && localFolderSelection?.sourceId === current.id;
  }
  function preflight(current) { return current?.config_json?.preflight || null; }
  function preflightReady(current) { return ["ready", "ready_limited"].includes(preflight(current)?.status); }
  function selectedFolder(input) {
    const summary = window.PrivateSourcePreflight?.summarizeFiles(input);
    return summary ? { tenantId: session()?.tenantId, sourceId: null, ...summary } : null;
  }
  function rememberLocalSelection(form, summary) {
    const selection = summary ? { tenantId: session()?.tenantId, sourceId: null, ...summary } : null;
    if (selection) localFormSelections.set(form, selection);
    localFolderSelection = selection;
    return selection;
  }
  function selectionForForm(form) {
    return localFormSelections.get(form) || rememberLocalSelection(form, window.PrivateSourcePreflight?.summarizeFiles(form.elements["local-folder"]));
  }
  function updateLocalSelection(form, selection) {
    const summary = form.querySelector("[data-local-folder-summary]");
    if (!selection || !summary) return;
    const assessment = localAssessment(form, selection);
    summary.textContent = `${selection.rootName}: ${selection.totalFiles} archivos · ${selection.supportedFiles} compatibles · ${assessment.reason}`;
    const label = form.elements["root-label"];
    if (label) label.value = selection.rootName;
    const status = form.querySelector("[data-private-status]");
    if (status) status.textContent = "Carpeta revisada localmente. Ningún archivo se ha enviado todavía.";
  }
  function localAssessment(form, selection) {
    const accepted = form.elements["accept-limited"]?.checked === true;
    const assessment = window.PrivateSourcePreflight.assess(selection, accepted);
    const warning = form.querySelector("[data-local-limited]");
    if (warning) warning.hidden = assessment.status !== "review";
    return assessment;
  }

  function localPicker() {
    return `<div class="local-folder-picker">
      <button class="ghost-action local-folder-browse" data-local-folder-browse type="button"><i data-lucide="folder-open"></i><span>Carpeta del equipo</span></button>
      <input class="local-folder-input" type="file" name="local-folder" webkitdirectory directory multiple aria-label="Selector compatible de carpeta">
      <button class="ghost-action local-folder-fallback" data-local-folder-fallback type="button"><i data-lucide="cloud"></i><span>OneDrive o carpeta sincronizada</span></button>
    </div><small>Usa la segunda opción para OneDrive, SharePoint sincronizado o carpetas que el navegador marque como sistema. Puede aparecer una confirmación de seguridad nativa. La ruta completa no se guarda ni se envía a la API.</small>`;
  }

  async function chooseLocalFolder(button) {
    const form = button.closest("form"); const input = form?.elements["local-folder"];
    if (!form || !input) return;
    if (typeof window.showDirectoryPicker !== "function") { input.click(); return; }
    const status = form.querySelector("[data-private-status]");
    try {
      const handle = await window.showDirectoryPicker({ id: "insertia-private-projects", mode: "read" });
      if (status) status.textContent = "Revisando la carpeta sin IA…";
      const summary = await window.PrivateSourcePreflight.summarizeDirectoryHandle(handle);
      updateLocalSelection(form, rememberLocalSelection(form, summary));
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (status) status.textContent = "El navegador no pudo abrir esa carpeta. Prueba «OneDrive o carpeta sincronizada».";
    }
  }

  async function request(path, options = {}) {
    const current = session();
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", "x-tenant-id": current?.tenantId || "", ...window.CredentialsAuth.authHeaders(current), ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo completar la operación");
    return payload.data;
  }

  function render() {
    document.querySelector("#private-knowledge-panel")?.remove();
  }

  function inventorySummary() {
    const current = source();
    return current?.config_json?.lastInventory || {};
  }

  function workflowStep(number, title, detail, stateName = "") {
    return `<li class="${stateName}"><span>${number}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div></li>`;
  }

  async function knowledgeStatusModal() {
    const inventory = inventorySummary();
    const chunks = Number(inventory.quarantineIndex?.chunks || 0);
    const documents = Number(inventory.documentsScanned || 0);
    openModal(`<div class="panel-heading"><div><p class="eyebrow">Preparación documental</p><h2>Estado y uso del conocimiento</h2></div><button class="icon-button" data-private-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note"><strong>Cargando el estado real…</strong><span>Insertia está contando las propuestas revisadas sin abrir ni enviar los documentos de la carpeta.</span></div>`);
    try {
      const facts = await request("/api/tenant-profile-review?scope=private");
      const pending = facts.filter((fact) => fact.status === "pending").length;
      const approved = facts.filter((fact) => fact.status === "approved").length;
      const rejected = facts.filter((fact) => fact.status === "rejected").length;
      const reviewState = pending ? "is-current" : facts.length ? "is-done" : "";
      const useState = approved ? "is-done" : "";
      openModal(`<div class="panel-heading"><div><p class="eyebrow">Preparación documental</p><h2>Estado y uso del conocimiento</h2></div><button class="icon-button" data-private-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
        <p class="preparation-route-intro">No necesitas entender cómo funciona el RAG. Esta pantalla indica qué información ha preparado Insertia, qué decisión necesita y qué puede utilizar ya.</p>
        <ol class="private-knowledge-steps">
          ${workflowStep(1, "Leer los documentos", `${documents} documentos analizados en el equipo`, documents ? "is-done" : "")}
          ${workflowStep(2, "Preparar propuestas", `${facts.length} datos institucionales encontrados`, facts.length ? "is-done" : "")}
          ${workflowStep(3, "Revisión humana", pending ? `${pending} propuestas esperan tu decisión` : "No quedan propuestas pendientes", reviewState)}
          ${workflowStep(4, "Usar en candidaturas", approved ? `${approved} hechos aprobados disponibles` : "Todavía no hay hechos disponibles", useState)}
        </ol>
        <div class="master-fact-groups knowledge-availability-grid">
          <article><div><strong>Información disponible</strong><span>${approved} hechos aprobados pueden recuperarse al preparar una candidatura.</span></div><span class="badge ${approved ? "safe" : "warning"}">${approved ? "Operativa" : "Pendiente"}</span></article>
          <article><div><strong>Archivo histórico</strong><span>${chunks} fragmentos están preparados localmente, pero todavía no se consultan al redactar.</span></div><span class="badge neutral">No activo</span></article>
        </div>
        <div class="knowledge-operation-list">
          <article><span>1</span><div><strong>Revisar propuestas</strong><p>Lee cada dato sugerido y decide si es correcto. Descartar una propuesta impide que se use.</p></div></article>
          <article><span>2</span><div><strong>Guardar decisiones</strong><p>Los datos aprobados quedan disponibles para futuras candidaturas del mismo tenant. No se envían a una IA por esta acción.</p></div></article>
          <article><span>3</span><div><strong>Preparar una candidatura</strong><p>Insertia buscará entre los hechos aprobados y mostrará cuáles utilizó. La revisión final sigue siendo humana.</p></div></article>
        </div>
        <div class="plain-note is-warning"><strong>¿Qué ocurre con los ${chunks} fragmentos?</strong><span>El análisis ya está hecho y no necesitas repetirlo. El archivo completo permanece en cuarentena hasta incorporar el recuperador histórico; hoy Insertia solo utiliza los hechos que apruebes.</span></div>
        <div class="button-row"><button class="primary-action" data-private-review type="button">${pending ? `Revisar ${pending} propuestas` : "Ver hechos revisados"}</button><button class="ghost-action" data-private-update-analysis type="button">Volver a analizar la carpeta</button><button class="ghost-action" data-private-close type="button">Cerrar</button></div>
        <p class="form-status">${approved} aprobados · ${rejected} descartados · ${pending} pendientes</p>`);
    } catch (error) {
      openModal(`<div class="panel-heading"><div><p class="eyebrow">Preparación documental</p><h2>Estado y uso del conocimiento</h2></div><button class="icon-button" data-private-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
        <div class="plain-note is-warning"><strong>No se pudo cargar el estado</strong><span>${escapeHtml(error.message)}</span></div><div class="button-row"><button class="ghost-action" data-private-close type="button">Cerrar</button></div>`);
    }
  }

  function preparationModal() {
    const current = source();
    const analysis = window.PrivateAnalysisState?.view(governance);
    const completed = analysis?.run?.status === "completed";
    const projectStatus = !current
      ? "Primero registrarás y autorizarás una carpeta o conexión privada."
      : !hasCompatibleConsent(current)
        ? "La fuente está registrada, pero debes renovar su permiso antes de inventariarla."
      : !preflightReady(current)
        ? preflight(current)?.reason || "Falta el preanálisis sin IA de la fuente; todavía no puede encolarse."
      : current.status === "pending_approval"
        ? "La fuente está registrada y necesita aprobación antes de inventariarla."
        : analysis?.run
          ? analysis.detail
        : state().ingestionQueued
          ? "El inventario está en curso; podrás revisar sus propuestas cuando finalice."
          : "La fuente autorizada está lista para inventariar proyectos anteriores.";
    openModal(`<div class="panel-heading"><div><p class="eyebrow">Preparación documental</p><h2>¿Cómo quieres aportar conocimiento?</h2></div><button class="icon-button" data-private-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <p class="preparation-route-intro">Elige una sola vía para esta preparación. Ambas generan propuestas privadas que deben revisarse antes de convertirse en hechos reutilizables.</p>
      <form data-private-preparation-form><fieldset class="preparation-route-options"><legend>Método de preparación</legend>
        <label><input type="radio" name="preparation-route" value="projects" ${contracted() ? "checked" : ""}><i data-lucide="folder-search-2"></i><span><strong>Analizar proyectos autorizados</strong><small>${escapeHtml(projectStatus)}</small></span></label>
        <label><input type="radio" name="preparation-route" value="guided" ${contracted() ? "" : "checked"}><i data-lucide="clipboard-list"></i><span><strong>Completar formulario guiado</strong><small>Responde solo los bloques necesarios; evita datos personales y casos individuales.</small></span></label>
      </fieldset>
      <div class="plain-note"><strong>Privacidad y control</strong><span>Las vías son excluyentes en este paso. El agente no mezcla tenants, no aprueba sus propuestas y no presenta documentos.</span></div>
      <div class="button-row"><button class="primary-action" type="submit">${completed ? "Gestionar conocimiento" : "Continuar con el método elegido"}</button>${completed ? '<button class="ghost-action" data-private-update-analysis type="button">Actualizar análisis</button>' : ""}<button class="ghost-action" data-private-close type="button">Cancelar</button></div><p class="form-status" data-private-status></p></form>`);
  }

  function sourceModal() {
    openModal(`<div class="panel-heading"><div><p class="eyebrow">Permiso de datos privados</p><h2>Autorizar una fuente</h2></div><button class="icon-button" data-private-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note"><strong>Alcance limitado</strong><span>Se registra la fuente, no contraseñas ni rutas locales completas. El acceso es de solo lectura; datos personales y sensibles quedan fuera.</span></div>
      <form data-private-source-form><fieldset class="private-source-options"><legend>Origen</legend>${[["local","folder","Carpeta local","La carpeta se procesa en el equipo o puente local autorizado."],["drive","hard-drive","Google Drive","Solo la carpeta elegida, nunca todo el Drive."],["sharepoint","cloud","SharePoint","Solo el sitio o biblioteca seleccionados."]].map(([value,icon,title,copy], index) => `<label><input type="radio" name="private-source" value="${value}" ${index === 0 ? "checked" : ""}><i data-lucide="${icon}"></i><span><strong>${title}</strong><small>${copy}</small></span></label>`).join("")}</fieldset>
        <div data-local-folder-picker><label class="field"><span>Carpeta local que autorizas</span>${localPicker()}</label><p class="local-folder-summary" data-local-folder-summary>Ninguna carpeta seleccionada.</p>${limitedWarning()}</div>
        <label class="field"><span>Nombre reconocible de la fuente</span><input name="root-label" maxlength="120" value="Proyectos presentados" required><small>No escribas aquí la ruta completa ni credenciales.</small></label>
        <label class="private-consent-check"><input type="checkbox" name="confirm" required><span>Autorizo el inventario en modo lectura para este tenant. Entiendo que usar IA externa exigiría un permiso separado.</span></label>
        <div class="button-row"><button class="primary-action" type="submit">Registrar permiso y fuente</button><button class="ghost-action" data-private-close type="button">Cancelar</button></div><p class="form-status" data-private-status></p></form>`);
  }

  function localFolderModal(current) {
    openModal(`<div class="panel-heading"><div><p class="eyebrow">Fuente local</p><h2>Seleccionar la carpeta que se va a inventariar</h2></div><button class="icon-button" data-private-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note"><strong>${escapeHtml(current.label || "Proyectos presentados")}</strong><span>Antes de encolar el inventario debes elegir la carpeta en este dispositivo. Esta selección se pierde al recargar por seguridad.</span></div>
      <form data-local-folder-form data-source-id="${escapeHtml(current.id)}"><label class="field"><span>Carpeta local autorizada</span>${localPicker()}</label>
        <p class="local-folder-summary" data-local-folder-summary>Ninguna carpeta seleccionada.</p>${limitedWarning()}
        <div class="button-row"><button class="primary-action" type="submit">Usar esta carpeta</button><button class="ghost-action" data-private-close type="button">Cancelar</button></div><p class="form-status" data-private-status></p></form>`);
  }

  function limitedWarning() {
    return `<label class="private-consent-check is-warning" data-local-limited hidden><input type="checkbox" name="accept-limited"><span><strong>Fuente poco sustancial</strong><small>Hay menos de 3 documentos compatibles o menos de 100 KB. Confirma que quieres probarla igualmente; la IA continúa desactivada.</small></span></label>`;
  }

  function consentRenewalModal(current) {
    const choice = sourceChoice(current);
    openModal(`<div class="panel-heading"><div><p class="eyebrow">Permiso de datos privados</p><h2>Renovar permiso de la fuente</h2></div><button class="icon-button" data-private-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note"><strong>${escapeHtml(current.label || choice.label)}</strong><span>La fuente ya está registrada. Solo se renovará el permiso de lectura para este tenant; no se creará otra conexión.</span></div>
      <form data-private-consent-renewal data-consent-type="${choice.consent}" data-consent-connector="${choice.connector}">
        <label class="private-consent-check"><input type="checkbox" name="confirm" required><span>Autorizo de nuevo el inventario en modo lectura. Se excluyen datos personales y sensibles, y no se autoriza ningún envío externo.</span></label>
        <div class="button-row"><button class="primary-action" type="submit">Renovar permiso y continuar</button><button class="ghost-action" data-private-close type="button">Cancelar</button></div><p class="form-status" data-private-status></p></form>`);
  }

  function formModal() {
    const sections = [
      ["legal_name", "Razón social"], ["tax_id", "NIF"], ["registered_address", "Domicilio social"],
      ["mission", "Misión y fines"], ["trajectory", "Trayectoria"], ["territory", "Territorio"],
      ["collectives", "Colectivos"], ["methodology", "Metodología"], ["team", "Equipo agregado"],
      ["evaluation", "Evaluación e indicadores"], ["alliances", "Alianzas"]
    ];
    openModal(`<div class="panel-heading"><div><p class="eyebrow">Alternativa sin repositorio</p><h2>Formulario de conocimiento maestro</h2></div><button class="icon-button" data-private-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note"><strong>Mismo control, otra entrada</strong><span>La entidad responde por bloques, adjunta evidencia cuando exista y revisa cada propuesta antes de aprobarla.</span></div>
      <form data-private-guided-form><div class="guided-knowledge-grid">${sections.map(([key, label]) => `<label><span>${label}</span><textarea name="${key}" rows="3" placeholder="Dato institucional verificable, vigencia y fuente..."></textarea><small>No incluyas nombres de personas, participantes ni casos individuales.</small></label>`).join("")}</div>
        <label class="private-consent-check"><input type="checkbox" name="privacy-confirm" required><span>Confirmo que las respuestas no contienen datos personales, expedientes individuales ni datos sensibles.</span></label>
        <div class="button-row"><button class="primary-action" type="submit">Crear propuestas para revisión</button><button class="ghost-action" data-private-close type="button">Cancelar</button></div><p class="form-status" data-private-status></p></form>`);
  }

  function openModal(html) {
    document.querySelector("[data-private-modal]")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-private-modal><article class="modal private-knowledge-modal" role="dialog" aria-modal="true">${html}</article></div>`);
    window.lucide?.createIcons();
  }
  function closeModal() { document.querySelector("[data-private-modal]")?.remove(); }
  function toast(message) { if (typeof window.showToast === "function") window.showToast(message); }

  async function refresh() { try { governance = await request("/api/tenant-agent-governance"); render(); } catch { render(); } }
  async function submitSource(form) {
    const status = form.querySelector("[data-private-status]"); const choice = sourceOptions[new FormData(form).get("private-source")];
    if (choice === sourceOptions.local) {
      localFolderSelection = selectionForForm(form);
      if (!localFolderSelection) return void (status.textContent = "Selecciona primero la carpeta local que autorizas.");
      const assessment = localAssessment(form, localFolderSelection);
      if (assessment.status === "blocked" || assessment.status === "review") return void (status.textContent = assessment.reason);
    } else {
      localFolderSelection = null;
    }
    status.textContent = "Registrando autorización…";
    try {
      await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "grant_consent", consentType: choice.consent, scope: { connector: choice.connector, readOnly: true, externalTransfer: false, includePersonalData: false, includeSensitiveData: false } }) });
      const created = await request("/api/source-connections", { method: "POST", body: JSON.stringify({ label: String(new FormData(form).get("root-label") || choice.label), kind: choice.kind, scope: "tenant_private", config: { connector: choice.connector, rootLabel: String(new FormData(form).get("root-label") || choice.label), readOnly: true } }) });
      if (localFolderSelection) {
        localFolderSelection.sourceId = created.id;
        await request("/api/private-source-preflight", { method: "POST", body: JSON.stringify({ sourceConnectionId: created.id, manifest: window.PrivateSourcePreflight.manifest(localFolderSelection), acceptLimited: form.elements["accept-limited"]?.checked === true }) });
      }
      closeModal(); await refresh(); preparationModal(); toast("Permiso registrado. Revisa y continúa desde Preparación documental.");
    } catch (error) { status.textContent = error.message; }
  }

  async function submitLocalFolder(form) {
    const status = form.querySelector("[data-private-status]");
    localFolderSelection = selectionForForm(form);
    if (!localFolderSelection) return void (status.textContent = "Selecciona la carpeta antes de continuar.");
    const assessment = localAssessment(form, localFolderSelection);
    if (assessment.status === "blocked" || assessment.status === "review") return void (status.textContent = assessment.reason);
    localFolderSelection.sourceId = form.dataset.sourceId;
    status.textContent = "Guardando el preanálisis sin IA…";
    try {
      await request("/api/private-source-preflight", { method: "POST", body: JSON.stringify({ sourceConnectionId: form.dataset.sourceId, manifest: window.PrivateSourcePreflight.manifest(localFolderSelection), acceptLimited: form.elements["accept-limited"]?.checked === true }) });
      await refresh(); closeModal(); preparationModal();
      toast(`Criba completada sin IA: ${localFolderSelection.supportedFiles} de ${localFolderSelection.totalFiles} archivos compatibles.`);
    } catch (error) { status.textContent = error.message; }
  }

  async function submitConsentRenewal(form) {
    const status = form.querySelector("[data-private-status]");
    status.textContent = "Renovando permiso…";
    try {
      await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({
        action: "grant_consent", consentType: form.dataset.consentType,
        scope: { connector: form.dataset.consentConnector, readOnly: true, externalTransfer: false, includePersonalData: false, includeSensitiveData: false }
      }) });
      await refresh(); closeModal(); preparationModal();
      toast("Permiso renovado. Revisa la fuente y continúa cuando quieras.");
    } catch (error) { status.textContent = error.message; }
  }

  async function submitGuidedForm(form) {
    const status = form.querySelector("[data-private-status]");
    const data = new FormData(form);
    const proposals = [...form.querySelectorAll("textarea[name]")]
      .map((field) => ({ fieldKey: field.name, value: String(data.get(field.name) || "").trim() }))
      .filter((item) => item.value);
    if (!proposals.length) return void (status.textContent = "Completa al menos un bloque.");
    status.textContent = "Guardando propuestas privadas…";
    try {
      await request("/api/tenant-profile-review", { method: "POST", body: JSON.stringify({ proposals, noPersonalData: true, noSensitiveData: true }) });
      save({ phase: "proposals" }); closeModal(); window.MasterFactReview?.open("Propuestas creadas; revísalas antes de usarlas.");
    } catch (error) { status.textContent = error.message; }
  }

  async function submitPreparation(form) {
    const status = form.querySelector("[data-private-status]");
    const route = new FormData(form).get("preparation-route");
    if (route === "guided") { closeModal(); formModal(); return; }
    const analysis = window.PrivateAnalysisState?.view(governance);
    if (analysis?.active) return void (status.textContent = analysis.detail);
    if (analysis?.run?.status === "completed") {
      knowledgeStatusModal(); return;
    }
    if (!contracted()) return void (status.textContent = "El análisis de proyectos requiere que Preparación documental esté incluido en el plan.");
    const current = source();
    if (!current) { closeModal(); sourceModal(); return; }
    if (!hasCompatibleConsent(current)) { closeModal(); consentRenewalModal(current); return; }
    if (current.kind === "local_simulation" && !localSelectionMatches(current)) { closeModal(); localFolderModal(current); return; }
    if (!preflightReady(current)) return void (status.textContent = preflight(current)?.reason || "La fuente debe superar primero el preanálisis sin IA.");
    status.textContent = current.status === "pending_approval" ? "Aprobando la fuente en Asistentes…" : "Iniciando inventario privado…";
    try {
      if (current.status === "pending_approval") {
        await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "approve_private_source", sourceId: current.id }) });
        status.textContent = "Fuente aprobada. Iniciando inventario privado…";
        await refresh();
      }
      await request("/api/ingestion-dispatch", { method: "POST", body: JSON.stringify({ sourceConnectionId: current.id }) });
      save({ phase: "inventory", ingestionQueued: true }); closeModal(); await refresh();
      toast("Inventario encolado. Las propuestas requerirán revisión humana antes de utilizarse.");
    } catch (error) {
      await refresh();
      const approved = source()?.id === current.id && source()?.status === "active";
      status.textContent = approved ? `La fuente está aprobada, pero no se pudo iniciar el inventario: ${error.message}` : error.message;
    }
  }

  function goToAssistantsAndOpen() {
    document.querySelector('[data-screen="agents"]')?.click();
    setTimeout(preparationModal, 0);
  }

  async function downloadDocumentContext(button) {
    const current = source();
    if (!current?.id) return void toast("No hay una fuente privada activa para preparar documentos.");
    button.disabled = true;
    try {
      const context = await request(`/api/private-document-context?sourceId=${encodeURIComponent(current.id)}`);
      const blob = new Blob([JSON.stringify({ ok: true, data: context }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = "insertia-contexto-documental.json"; link.click(); URL.revokeObjectURL(url);
      toast("Contexto autorizado preparado. Caduca en 15 minutos y no contiene el corpus.");
    } catch (error) { toast(error.message); } finally { button.disabled = false; }
  }

  document.addEventListener("submit", (event) => {
    if (event.target.matches("[data-private-preparation-form]")) { event.preventDefault(); submitPreparation(event.target); }
    if (event.target.matches("[data-private-source-form]")) { event.preventDefault(); submitSource(event.target); }
    if (event.target.matches("[data-local-folder-form]")) { event.preventDefault(); submitLocalFolder(event.target); }
    if (event.target.matches("[data-private-consent-renewal]")) { event.preventDefault(); submitConsentRenewal(event.target); }
    if (event.target.matches("[data-private-guided-form]")) { event.preventDefault(); submitGuidedForm(event.target); }
  });
  document.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null; if (!target) return;
    if (target.matches("[data-private-source]")) sourceModal();
    if (target.matches("[data-private-knowledge-open]")) goToAssistantsAndOpen();
    if (target.matches("[data-private-form]")) formModal();
    if (target.matches("[data-private-review]")) { closeModal(); window.MasterFactReview?.open("Aprueba solo información institucional que puedas verificar."); }
    if (target.matches("[data-private-update-analysis]")) {
      const current = source(); closeModal();
      if (current?.kind === "local_simulation") localFolderModal(current);
      else preparationModal();
    }
    if (target.matches("[data-private-document-context]")) downloadDocumentContext(target);
    if (target.matches("[data-private-close]")) closeModal();
    if (target.matches("[data-local-folder-browse]")) chooseLocalFolder(target);
    if (target.matches("[data-local-folder-fallback]")) target.closest("form")?.elements["local-folder"]?.click();
    if (target.matches("[data-private-approve]")) { target.disabled = true; try { await request("/api/tenant-agent-governance", { method: "PATCH", body: JSON.stringify({ action: "approve_private_source", sourceId: target.dataset.privateApprove }) }); save({ phase: "inventory" }); await refresh(); } catch (error) { toast(error.message); target.disabled = false; } }
    if (target.matches("[data-private-inventory]")) { target.disabled = true; try { await request("/api/ingestion-dispatch", { method: "POST", body: JSON.stringify({ sourceConnectionId: target.dataset.privateInventory }) }); save({ phase: "inventory", ingestionQueued: true }); toast("Inventario encolado. La vista no avanzará hasta recibir el resultado."); } catch (error) { toast(error.message); target.disabled = false; } }
  });
  document.addEventListener("change", (event) => {
    const form = event.target.closest?.("[data-private-source-form], [data-local-folder-form]");
    if (!form) return;
    if (event.target.matches('input[name="private-source"]')) {
      const isLocal = event.target.value === "local";
      const picker = form.querySelector("[data-local-folder-picker]"); const input = form.elements["local-folder"];
      if (picker) picker.hidden = !isLocal;
      if (input) { input.required = false; input.disabled = !isLocal; }
    }
    if (event.target.matches('input[name="local-folder"]')) {
      updateLocalSelection(form, rememberLocalSelection(form, window.PrivateSourcePreflight?.summarizeFiles(event.target)));
    }
  });
  window.addEventListener("tenant-agent-governance-loaded", (event) => { governance = event.detail; render(); });
  window.addEventListener("master-facts-updated", (event) => save({ phase: event.detail?.finalized ? "approved" : "proposals" }));
  window.addEventListener("role-session-applied", () => setTimeout(refresh, 0));
  window.PrivateKnowledge = { open: preparationModal, openPreparation: preparationModal, goToAssistants: goToAssistantsAndOpen, render };
  document.addEventListener("DOMContentLoaded", refresh);
})();
