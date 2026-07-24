(function () {
  const labels = {
    legal_name: "Razón social", tax_id: "Identificador fiscal", registered_address: "Domicilio social",
    mission: "Misión y fines", trajectory: "Trayectoria", territory: "Territorio", collective: "Colectivos", collectives: "Colectivos",
    methodology: "Metodología", team: "Equipo", evaluation: "Evaluación e indicadores", alliances: "Alianzas"
  };

  function session() { return window.CredentialsAuth?.getSession?.(); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function close() { document.querySelector("[data-master-fact-modal]")?.remove(); }
  function toast(message) { window.showToast?.(message); }

  async function request(options = {}, privateOnly = false) {
    const current = session();
    const response = await fetch(`/api/tenant-profile-review${privateOnly ? "?scope=private" : ""}`, {
      ...options,
      headers: { "Content-Type": "application/json", "x-tenant-id": current?.tenantId || "", ...window.CredentialsAuth.authHeaders(current) }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo cargar la revisión");
    return payload.data;
  }

  function dataClass(fact) {
    const declared = String(fact.metadata_json?.data_class || "");
    if (["public", "internal", "personal", "sensitive"].includes(declared)) return declared;
    return fact.source_type === "public_web" ? "public" : "internal";
  }

  function conflictKeys(facts) {
    const grouped = new Map();
    facts.filter((fact) => fact.status === "pending").forEach((fact) => {
      const values = grouped.get(fact.field_key) || new Set();
      values.add(String(fact.suggested_value || "").trim().toLowerCase());
      grouped.set(fact.field_key, values);
    });
    return new Set([...grouped.entries()].filter(([, values]) => values.size > 1).map(([key]) => key));
  }

  function factCard(fact, conflicts) {
    const pending = fact.status === "pending";
    const conflict = conflicts.has(fact.field_key);
    const evidence = fact.evidence_excerpt || fact.source_ref || "Evidencia no resumida";
    const classification = dataClass(fact);
    const stateLabel = fact.status === "approved" ? "Aprobado" : fact.status === "rejected" ? "Descartado" : "Revisar";
    const stateTone = fact.status === "approved" ? "safe" : fact.status === "rejected" ? "neutral" : "warning";
    return `<article class="master-fact-card${conflict ? " has-conflict" : ""}">
      <div class="master-fact-card-head"><div><span class="master-fact-label">${escapeHtml(labels[fact.field_key] || fact.field_key)}</span><strong>${escapeHtml(fact.suggested_value)}</strong></div><span class="badge ${stateTone}">${stateLabel}</span></div>
      <p class="master-fact-evidence"><b>Evidencia:</b> ${escapeHtml(evidence)}</p>
      <div class="master-fact-meta"><span>${classification === "public" ? "Público" : "Interno privado"}</span><span>Confianza ${escapeHtml(fact.confidence || "sin valorar")}</span>${conflict ? '<span class="conflict">Valores en conflicto</span>' : ""}</div>
      ${pending ? `<label class="master-fact-decision"><span>Decisión humana</span><select data-master-decision="${escapeHtml(fact.id)}"><option value="">Sin decidir</option><option value="approved">Aprobar</option><option value="rejected">Descartar</option></select></label>` : ""}
    </article>`;
  }

  function render(facts, message = "") {
    const pending = facts.filter((fact) => fact.status === "pending").length;
    const approved = facts.filter((fact) => fact.status === "approved").length;
    const conflicts = conflictKeys(facts);
    const body = facts.length ? `<div class="master-fact-review-grid">${facts.map((fact) => factCard(fact, conflicts)).join("")}</div>`
      : '<div class="empty-state compact"><strong>Aún no hay propuestas</strong><span>Primero debe finalizar el inventario privado o completarse el formulario guiado.</span></div>';
    return `<div class="modal-backdrop" data-master-fact-modal><article class="modal private-knowledge-modal" role="dialog" aria-modal="true" aria-labelledby="master-fact-title">
      <div class="panel-heading"><div><p class="eyebrow">Revisión humana</p><h2 id="master-fact-title">Plantilla maestra propuesta</h2></div><button class="icon-button" data-master-close type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
      <div class="plain-note"><strong>${pending} pendientes · ${approved} aprobados · ${conflicts.size} conflictos</strong><span>Los hechos internos permanecen en este tenant. Aprobarlos no autoriza su envío a IA externa.</span></div>
      <form data-master-fact-form>${body}<p class="form-status" data-master-status>${escapeHtml(message)}</p>
        <div class="button-row"><button class="primary-action" name="review-action" value="save" type="submit" ${facts.length ? "" : "disabled"}>Guardar decisiones</button><button class="ghost-action" name="review-action" value="finalize" type="submit" ${facts.length ? "" : "disabled"}>Finalizar revisión</button><button class="ghost-action" data-master-close type="button">Continuar después</button></div>
      </form></article></div>`;
  }

  async function open(message = "") {
    close();
    document.body.insertAdjacentHTML("beforeend", render([], "Cargando propuestas…"));
    try {
      const facts = await request({}, true);
      close();
      document.body.insertAdjacentHTML("beforeend", render(facts, message));
    } catch (error) {
      close();
      document.body.insertAdjacentHTML("beforeend", render([], error.message));
    }
    window.lucide?.createIcons();
  }

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-master-close]")) close();
  });
  document.addEventListener("submit", async (event) => {
    if (!(event.target instanceof HTMLFormElement) || !event.target.matches("[data-master-fact-form]")) return;
    event.preventDefault();
    const action = event.submitter?.value || "save";
    const reviews = [...event.target.querySelectorAll("[data-master-decision]")]
      .filter((select) => select.value)
      .map((select) => ({ id: select.dataset.masterDecision, status: select.value }));
    const status = event.target.querySelector("[data-master-status]");
    if (!reviews.length && action !== "finalize") return void (status.textContent = "Selecciona al menos una decisión.");
    status.textContent = "Guardando decisiones…";
    try {
      await request({ method: "PATCH", body: JSON.stringify({ reviews, approveMaster: action === "finalize", reviewScope: "private" }) });
      const finalized = action === "finalize";
      window.dispatchEvent(new CustomEvent("master-facts-updated", { detail: { finalized } }));
      toast(finalized ? "Plantilla maestra aprobada y auditada." : "Decisiones guardadas.");
      finalized ? close() : await open("Decisiones guardadas correctamente.");
    } catch (error) { status.textContent = error.message; }
  });

  window.MasterFactReview = { open };
})();
