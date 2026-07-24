(function () {
  const packageKey = "documentary-agent-package-v1";
  const candidateKey = "workspace-candidates-v1";
  let workspacePackageVisible = false;
  let workspaceTargetTab = "summary";
  let workspacePanelTarget = null;
  const basesReviewStates = new Map();
  const basesReviewLoads = new Map();
  const latestDraftRuns = new Map();
  const presets = {
    "labora-empleo-2026": {
      who: ["Entidad sin animo de lucro o social con actuacion en Comunitat Valenciana.", "Capacidad operativa para ejecutar itinerarios de insercion, formacion o acompanamiento.", "Situacion fiscal y Seguridad Social al corriente antes de presentar."],
      documents: ["Formulario oficial de solicitud.", "Memoria tecnica del proyecto: objetivos, colectivos, metodologia, calendario e indicadores.", "Presupuesto desglosado y cofinanciacion si aplica.", "Acreditacion de representacion legal.", "Declaraciones responsables y certificados de estar al corriente.", "Documentacion laboral/equipo tecnico si la linea financia personal."],
      steps: ["Confirmar convocatoria y bases vigentes.", "Validar requisitos juridicos y territoriales de Novaterra.", "Preparar memoria y presupuesto con evidencias internas aprobadas.", "Revisar anexos obligatorios y firma electronica.", "Presentar en sede electronica antes del plazo."],
      criteria: ["Adecuacion al colectivo vulnerable.", "Experiencia previa y capacidad tecnica.", "Coherencia presupuesto-actividades.", "Impacto medible y seguimiento."]
    },
    "irpf-social-2026": {
      who: ["Entidad del tercer sector con fines sociales y capacidad de ejecucion.", "Proyecto alineado con una linea concreta del 0,7% IRPF.", "Documentacion estatutaria, fiscal y de representacion actualizada."],
      documents: ["Solicitud y anexos oficiales.", "Memoria explicativa del programa.", "Presupuesto por conceptos y financiacion complementaria.", "Estatutos, poderes y datos registrales si se exigen.", "Certificados AEAT/Seguridad Social.", "Indicadores de impacto y sistema de evaluacion."],
      steps: ["Elegir linea/programa exacto.", "Cruzar requisitos de bases con perfil validado de Novaterra.", "Construir memoria, presupuesto y anexos.", "Revisar incompatibilidades y obligaciones de justificacion.", "Presentar y guardar resguardo."],
      criteria: ["Interes social y alcance.", "Solvencia tecnica.", "Calidad del programa.", "Viabilidad economica y justificacion."]
    },
    "fundacion-caixa-accion-social": {
      who: ["Entidad social con proyecto territorial elegible.", "Proyecto con impacto social verificable.", "Capacidad de justificar fondos privados y resultados."],
      documents: ["Formulario de convocatoria privada.", "Memoria de proyecto y teoria de cambio.", "Presupuesto y calendario.", "Documentacion legal/registro de entidad.", "Cuentas o informacion economica si la fundacion la pide.", "Evidencias de experiencia y alianzas."],
      steps: ["Verificar bases privadas y ventana territorial vigente.", "Confirmar que Novaterra cumple forma juridica y ambito.", "Preparar narrativa de impacto y presupuesto.", "Subir anexos en plataforma del financiador.", "Revisar confirmacion de envio."],
      criteria: ["Impacto social.", "Innovacion y sostenibilidad.", "Capacidad de gestion.", "Alineacion territorial."]
    }
  };

  const fallback = {
    who: ["Entidad legalmente constituida y habilitada para concurrir.", "Actividad y territorio coherentes con la convocatoria.", "Obligaciones fiscales, laborales y de transparencia al corriente."],
    documents: ["Solicitud oficial.", "Memoria tecnica.", "Presupuesto detallado.", "Acreditacion de representacion.", "Declaraciones responsables/certificados.", "Anexos especificos indicados en las bases."],
    steps: ["Abrir bases oficiales y version vigente.", "Extraer requisitos, documentos y criterios.", "Cruzar requisitos con datos aprobados del tenant.", "Preparar paquete documental.", "Revision humana antes de presentar."],
    criteria: ["Encaje con objeto subvencionable.", "Solvencia tecnica.", "Viabilidad economica.", "Impacto y justificacion."]
  };
  const documentClassLabels = {
    generated_draft: "Contenido que redactará el agente",
    official_form: "Modelo oficial obligatorio",
    declaration: "Declaración con validación humana",
    supporting_evidence: "Documento que aporta la entidad",
    mixed_bundle: "Lista que debe desglosarse",
    other: "Clasificación pendiente"
  };
  const documentAgentContracted = () =>
    (window.CredentialsAuth?.getSession?.()?.plan?.agentKeys || []).includes("draft_agent");
  const coreSectionLabels = { beneficiaries: "Quién puede solicitar", eligibleActivities: "Qué se puede financiar", requiredDocuments: "Qué documentación se presenta", submission: "Cómo se presenta" };

  function allRows() {
    return [
      ...(window.RADAR_PLATFORM_OPPORTUNITIES || []),
      ...(window.RADAR?.opportunities || []),
      ...(window.MUNICIPAL_RADAR?.opportunities || []),
      ...(window.MOCK?.opportunities || []),
      ...(window.PRIVATE_OPEN_OPPORTUNITIES || [])
    ];
  }

  function currentOpportunity() {
    const id = document.querySelector(".opportunity-item.is-selected [data-opportunity]")?.dataset.opportunity;
    return allRows().find((item) => item.id === id) || allRows()[0];
  }

  function list(items) {
    return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function badge(label, tone) {
    return window.badge ? window.badge(label, tone) : `<span class="badge ${tone}">${label}</span>`;
  }

  function scoreLabel(score) {
    return score >= 75 ? "Prioridad alta" : score >= 55 ? "Prioridad media" : "Prioridad baja";
  }

  function checklist() {
    return (window.MOCK?.checklist || []).map((entry, index) => {
      const tone = entry.state === "done" ? "safe" : entry.state === "review" ? "warning" : "review";
      const label = entry.state === "done" ? "Hecho" : entry.state === "review" ? "Revisar" : "Pendiente";
      return `<div class="compact-task"><strong>${entry.item}</strong>
        <details class="candidate-task-inline-info" data-candidate-task-info="${index}">
          <summary class="icon-button" aria-label="Información sobre ${escapeHtml(entry.item)}" title="Información sobre la tarea"><i data-lucide="info"></i></summary>
          <div class="candidate-task-inline-card">
            <p>${escapeHtml(entry.purpose)}</p>
            <dl>
              <div><dt>Qué se comprueba</dt><dd>${escapeHtml(entry.checks)}</dd></div>
              <div><dt>Evidencia necesaria</dt><dd>${escapeHtml(entry.evidence)}</dd></div>
              <div><dt>Cuándo se completa</dt><dd>${escapeHtml(entry.doneWhen)}</dd></div>
            </dl>
            <small>Control humano: Insertia no confirma por sí sola la elegibilidad ni da por válido un documento.</small>
          </div>
        </details>
        ${badge(label, tone)}</div>`;
    }).join("");
  }

  function outline() {
    return (window.MOCK?.outline || []).map((section) => `
      <article class="compact-outline">
        <strong>${section.title}</strong>
        <p>${section.text}</p>
      </article>
    `).join("");
  }

  function packageFor(item) {
    const pack = presets[item?.id] || fallback;
    const recommendation = item?.matchRecommendation
      || allRows().find((row) => row.id === item?.id && row.matchRecommendation)?.matchRecommendation;
    const contract = item?.requirementsContract;
    const clauses = (key) => asArray(contract?.sections?.[key]).map((entry) => entry.text).filter(Boolean);
    const officialDocumentEntries = asArray(contract?.sections?.requiredDocuments);
    const officialDocuments = officialDocumentEntries.map((entry) => entry.text).filter(Boolean);
    const officialWho = [...clauses("beneficiaries"), ...clauses("eligibilityRequirements")];
    const officialCriteria = clauses("evaluationCriteria");
    const officialSteps = [...clauses("submission"), ...clauses("obligations")];
    const officialEvidence = Object.values(contract?.sections || {}).flatMap(asArray)
      .map((entry) => entry.evidenceExcerpt).filter(Boolean).slice(0, 12);
    const confidence = item?.evidenceQuality?.includes("oficial") ? "Alta si las bases son vigentes" : "Requiere validar bases/fecha";
    return {
      id: item?.id || "",
      recommendationId: recommendation?.id || "",
      title: item?.title || "Convocatoria seleccionada",
      source: item?.source || "Fuente pendiente",
      deadline: item?.deadline || "Plazo pendiente",
      deadlineConfidence: item?.deadlineConfidence || "Requiere revision",
      deadlineTrace: window.deadlineTrace?.build(item) || null,
      confidence,
      territory: item?.territory || "Ambito pendiente",
      score: item?.score || 0,
      fit: item?.fit || ["Encaje pendiente de analisis explicable."],
      risks: item?.risks || ["Requiere revisar bases y plazo antes de continuar."],
      evidence: item?.evidence || ["Evidencia pendiente de consolidar."],
      proposalConstraints: item?.proposalConstraints || {
        status: "not_found_requires_review",
        draftingGate: "blocked_pending_constraint_review",
        requiresRenderedValidation: false,
        requiresHumanReview: true,
        limits: [],
        formatRules: []
      },
      ...pack,
      requirementsContract: contract || null,
      documentRequirements: officialDocumentEntries,
      excludedDocumentMentions: asArray(contract?.excludedDocumentMentions),
      who: officialWho.length ? officialWho : pack.who,
      documents: officialDocuments.length ? officialDocuments : pack.documents,
      criteria: officialCriteria.length ? officialCriteria : pack.criteria,
      steps: officialSteps.length ? officialSteps : pack.steps,
      evidence: officialEvidence.length ? officialEvidence : item?.evidence || pack.evidence,
      proposalConstraints: item?.proposalConstraints || pack.proposalConstraints || {
        status: "not_found_requires_review",
        draftingGate: "blocked_pending_constraint_review",
        requiresRenderedValidation: false,
        requiresHumanReview: true,
        limits: [],
        formatRules: []
      }
    };
  }

  function asArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  }

  function firstMatching(text, cases, fallbackCase) {
    const normalized = String(text || "").toLowerCase();
    return cases.find((item) => item.match.some((word) => normalized.includes(word))) || fallbackCase;
  }

  function documentBuildPlan(pack) {
    const fallbackPlan = {
      label: "Documento requerido",
      title: "Documento requerido preconstruido",
      status: "Estructura base",
      possible: "Portada, referencia a convocatoria, indice de evidencias y campos pendientes.",
      pending: "Confirmar modelo oficial exacto y adjuntos obligatorios en las bases.",
      sections: ["Identificacion de convocatoria", "Datos de entidad", "Evidencias", "Pendientes"]
    };
    const cases = [
      { match: ["formulario", "solicitud"], label: "Solicitud oficial", title: "Solicitud oficial - borrador de campos", status: "Pre-rellenada parcialmente", possible: "Datos de convocatoria, fuente, territorio, entidad, representante pendiente, importe pendiente y declaracion de revision humana.", pending: "Volcar en sede electronica o formulario oficial; validar certificado y firma.", sections: ["Datos administrativos", "Linea solicitada", "Declaraciones", "Firma"] },
      { match: ["memoria", "proyecto", "teoria de cambio"], label: "Memoria tecnica", title: "Memoria tecnica - borrador construido", status: "Borrador narrativo", possible: "Autorrelleno genérico con bases, hechos aprobados, cálculos y preguntas para los huecos.", pending: "Validar datos del proyecto, presupuesto, extensión y estructura exigida por el organismo.", sections: ["Resumen del proyecto", "Diagnóstico y necesidad", "Objetivos", "Personas destinatarias", "Metodología y actividades", "Calendario", "Equipo y alianzas", "Indicadores y evaluación", "Presupuesto y sostenibilidad", "Riesgos"] },
      { match: ["presupuesto", "cofinanciacion", "financiacion"], label: "Presupuesto", title: "Presupuesto detallado - esqueleto rellenable", status: "Estructura contable", possible: "Tablas de personal, actividades, servicios externos, cofinanciacion, costes dudosos y controles de elegibilidad.", pending: "Introducir importes reales, limites de bases, IVA y evidencias de coste.", sections: ["Personal", "Costes directos", "Cofinanciacion", "Alertas"] },
      { match: ["representacion", "poder", "registral"], label: "Representacion", title: "Acreditacion de representacion - matriz", status: "Matriz de validacion", possible: "Identificacion del documento, organo, representante, fecha de vigencia y comprobaciones.", pending: "Adjuntar poderes/certificado real emitido por el registro u organo competente.", sections: ["Representante", "Poderes", "Vigencia", "Adjunto"] },
      { match: ["declaracion", "aeat", "seguridad social", "certificado", "corriente"], label: "Declaraciones y certificados", title: "Declaraciones y certificados - paquete de control", status: "Control preconstruido", possible: "Indice de declaraciones responsables, certificados a descargar y comprobacion de caducidad.", pending: "Descargar certificados oficiales vigentes y firmar declaraciones responsables.", sections: ["Declaraciones", "Certificados", "Caducidad", "Firma"] },
      { match: ["laboral", "equipo", "personal", "tecnico"], label: "Equipo tecnico", title: "Equipo tecnico - ficha de dedicaciones", status: "Ficha base", possible: "Roles, funciones, dedicaciones, costes imputables y relacion con actividades.", pending: "Validar datos personales minimos, contratos, dedicacion real y consentimiento si aplica.", sections: ["Roles", "Dedicacion", "Coste", "Privacidad"] },
      { match: ["cuentas", "economica", "estatutos"], label: "Solvencia entidad", title: "Solvencia y datos corporativos - indice", status: "Indice de adjuntos", possible: "Relacion de estatutos, cuentas, memoria anual y datos economicos solicitados.", pending: "Adjuntar documentos firmados o certificados y validar si son publicables.", sections: ["Estatutos", "Cuentas", "Memoria", "Privacidad"] },
      { match: ["indicadores", "impacto", "evaluacion"], label: "Indicadores", title: "Indicadores de impacto - matriz", status: "Matriz construida", possible: "Indicadores de resultado, fuente de verificacion, linea base, meta y periodicidad.", pending: "Confirmar metas reales y metodo de medicion con el equipo tecnico.", sections: ["Indicador", "Linea base", "Meta", "Verificacion"] }
    ];
    const source = pack.documentRequirements?.length ? pack.documentRequirements : asArray(pack.documents);
    return source.map((entry) => {
      const requirement = typeof entry === "string" ? entry : entry.text || entry.evidenceExcerpt || "Documento pendiente de concretar";
      const classification = typeof entry === "object" ? entry.documentClassification : null;
      const selected = firstMatching(requirement, cases, fallbackPlan);
      const classifiedAction = classification?.recommendedCategory === "generated_draft" ? ["El agente preparará un borrador independiente con citas y campos pendientes.", "Revisar contenido, datos internos y límites antes de aprobar."]
        : classification?.recommendedCategory === "official_form" ? ["Se utilizará el modelo oficial; el agente solo propondrá contenido o una guía de cumplimentación.", "Descargar la versión vigente, cumplimentar y firmar."]
        : classification?.recommendedCategory === "declaration" ? ["El agente puede preparar el texto y señalar los campos necesarios.", "Una persona autorizada debe comprobarla, completarla y firmarla."]
        : classification?.recommendedCategory === "supporting_evidence" ? ["Se incluirá en el índice y se comprobará su vigencia.", "La entidad debe aportar el documento auténtico; el agente no puede fabricarlo."]
        : classification?.recommendedCategory === "mixed_bundle" ? ["La lista se separará en documentos individuales antes de redactar.", `Categorías detectadas: ${(classification.detectedCategories || []).map((key) => documentClassLabels[key] || key).join(" · ") || "revisión pendiente"}.`]
        : null;
      return {
        title: selected.title,
        requirement,
        status: classification ? documentClassLabels[classification.recommendedCategory] || "Clasificación pendiente" : `${selected.status} · orientación local`,
        possible: classifiedAction?.[0] || selected.possible,
        pending: classification?.reason || classifiedAction?.[1] || selected.pending,
        sections: selected.sections || fallbackPlan.sections,
        classification,
        requirementRef: typeof entry === "object" ? entry.requirementRef : "",
        sourceUrl: typeof entry === "object" ? entry.sourceUrl : "",
        sourcePage: typeof entry === "object" ? entry.sourcePage : null
      };
    });
  }

  function basesClarityPanel(pack) {
    const contract = pack.requirementsContract;
    if (!contract) return `<div class="plain-note"><strong>Sin lectura estructurada de las bases</strong><span>La lista inferior es orientativa. No habilita redacción ni sustituye la revisión de las bases oficiales.</span></div>`;
    const requirements = pack.documentRequirements || [];
    const ready = requirements.filter((item) => item.documentClassification?.planningReady).length;
    const unclear = requirements.filter((item) => item.documentClassification && !item.documentClassification.planningReady).length;
    const unclassified = requirements.filter((item) => !item.documentClassification).length;
    const excluded = pack.excludedDocumentMentions?.length || 0;
    const missing = asArray(contract.missingCoreSections).map((key) => coreSectionLabels[key] || key);
    const recovery = contract.documentRecovery || {};
    const recoveryText = {
      cross_reference_only: "La fuente remite a otra base, cláusula o anexo sin reproducir la lista. Hay que localizar ese documento oficial.",
      awaiting_official_publication: "La convocatoria anuncia que las bases y modelos se publicarán en canales oficiales, pero la versión vigente aún no se ha localizado. El radar volverá a comprobar su publicación.",
      official_notice_without_application_documents: "El boletín oficial ya confirma la convocatoria, sus destinatarios y el plazo, pero no enumera la documentación de solicitud. Falta localizar las bases completas y el modelo oficial; la redacción sigue bloqueada.",
      context_only: "Solo aparecen menciones de trámite o subsanación; falta la lista concreta de documentos de solicitud.",
      post_award_only: "Solo se ha localizado documentación posterior a la concesión o de justificación.",
      not_found_in_evidence: "El documento capturado no contiene una lista verificable de documentos de solicitud."
    }[recovery.status] || "";
    const approved = contract.documentaryGate === "requirements_approved";
    const title = approved ? "Bases aprobadas para preparar el expediente" : missing.length ? "Bases incompletas: redacción bloqueada" : "Bases extraídas: falta revisión humana";
    const portalNote = contract.officialProcedure?.applicationFormAccess === "requires_portal_interaction"
      ? " La sede publica la relación documental. El modelo oficial debe obtenerlo una persona autorizada desde el portal antes de cerrar el expediente."
      : "";
    const detail = (missing.length ? `No consta de forma verificable: ${missing.join(", ")}. ${recoveryText}` : `${requirements.length} obligaciones de solicitud; ${ready} concretas, ${unclear} referencias por aclarar, ${unclassified} pendientes de clasificación técnica y ${excluded} menciones de contexto o justificación separadas.`) + portalNote;
    const control = approved
      ? "El agente conservará las citas y la aprobación final seguirá siendo humana."
      : "La entidad puede solicitar la revisión, pero la validación corresponde a plataforma porque estas bases se comparten entre tenants.";
    return `<div class="plain-note"><strong>${title}</strong><span>${detail} ${control}</span></div>`;
  }

  function projectStage(pack) {
    const basesApproved = pack.requirementsContract?.documentaryGate === "requirements_approved"
      || basesReviewStates.get(pack?.id)?.draftingAllowed;
    return `
      <div class="project-stage" aria-label="Estado de candidatura">
        <span class="is-done">Preseleccionada</span>
        <span class="is-current">Documentacion</span>
        <span>Proyecto activo</span>
      </div>
      <div class="document-agent-actions">
        ${basesApproved ? `<div><strong>Bases validadas; expediente pendiente</strong><span>Gestiona la generación, las nuevas versiones y la revisión humana desde el nodo Borrador Word.</span></div>` : `<div><strong>Bases pendientes de validación experta</strong><span>Tu equipo revisa las cláusulas con sus citas y decide solo para esta entidad.</span></div>`}
      </div>`;
  }

  function draftActionButtons(pack) {
    if (!(window.CredentialsAuth?.getSession?.()?.plan?.agentKeys || []).includes("draft_agent")) {
      return '<div class="plain-note is-warning"><strong>Histórico en solo lectura</strong><span>Los borradores anteriores siguen disponibles. Preparación documental debe estar contratada para generar una versión nueva.</span></div>';
    }
    const reviewState = basesReviewStates.get(pack?.id);
    const basesApproved = pack.requirementsContract?.documentaryGate === "requirements_approved" || reviewState?.draftingAllowed;
    const limitsVerified = pack.proposalConstraints?.draftingGate === "constraints_verified" || reviewState?.constraintsVerified;
    if (!basesApproved && !reviewState) return `<div class="bases-review-actions"><button class="primary-action" data-bases-review-load="${escapeHtml(pack.id)}" type="button" disabled>Consultando bases...</button></div>`;
    if (!basesApproved && (reviewState?.canAccept || reviewState?.state === "discrepancy_reported")) return `<div class="bases-review-actions"><div class="button-row"><button class="primary-action" data-bases-entity-review="${escapeHtml(pack.id)}" type="button">Revisar y validar bases</button><button class="ghost-action" data-open-bases-status="${escapeHtml(pack.id)}" type="button">Ver qué falta</button></div><small data-bases-review-status="${escapeHtml(pack.id)}">${escapeHtml(reviewState.message)}</small></div>`;
    if (!basesApproved) return `<div class="bases-review-actions"><div class="button-row"><button class="primary-action" data-bases-review-request="${escapeHtml(pack.id)}" type="button">Solicitar lectura o revisión</button><button class="ghost-action" data-open-bases-status="${escapeHtml(pack.id)}" type="button">Ver qué falta</button></div><small data-bases-review-status="${escapeHtml(pack.id)}">${escapeHtml(reviewState?.message || "Todavía no hay citas verificadas que tu equipo pueda validar.")}</small></div>`;
    if (!limitsVerified) return `<div class="button-row"><button class="primary-action" type="button" disabled>Primero: verificar los límites de redacción</button></div>`;
    return `<div class="button-row"><button class="ghost-action" data-draft-agent-start="${pack.id}" data-approved-facts="false" type="button">Generar borrador público</button><button class="primary-action" data-draft-agent-start="${pack.id}" data-approved-facts="true" type="button">Generar borrador personalizado</button></div>`;
  }

  function decisionsPanel() {
    return `<div class="plain-note"><strong>Salida gobernada pendiente</strong><span>El redactor debe mapear todos los documentos exigidos, declarar faltantes y quedar aprobado antes de generar DOCX/PDF privados.</span></div>`;
  }

  function solicitudPhases(pack) {
    const reviewData = basesReviewStates.get(pack?.id) || null;
    const run = latestDraftRuns.get(pack?.id) || null;
    const basesApproved = pack?.requirementsContract?.documentaryGate === "requirements_approved" || reviewData?.draftingAllowed;
    const limitsVerified = pack?.proposalConstraints?.draftingGate === "constraints_verified" || reviewData?.constraintsVerified;
    const state = basesApproved ? "approved" : reviewData?.state || "unknown";
    const requested = Boolean(reviewData?.requestId);
    const review = run?.human_review;
    const reading = ["citations_pending", "ready_for_entity_review", "accepted_by_entity", "discrepancy_reported", "approved"].includes(state) ? "done"
      : state === "processing" ? "current" : state === "failed" ? "blocked" : "pending";
    const validation = ["approved", "accepted_by_entity"].includes(state) ? "done"
      : state === "discrepancy_reported" ? "blocked"
      : state === "ready_for_entity_review" ? "current" : "pending";
    const limits = limitsVerified ? "done" : basesApproved ? "current" : "pending";
    const generating = ["queued", "preparing_context", "generating", "awaiting_provider"].includes(run?.status);
    const draft = review?.status === "approved" ? "done"
      : run?.status === "review_required" || generating ? "current"
      : run?.status === "failed" ? "blocked" : "pending";
    const phases = [
      { title: "Lectura de bases con IA", actor: "Automática", status: reading,
        detail: reading === "done" ? "Las bases están leídas con citas literales."
          : reading === "current" ? "En cola. Se procesará sin acción por tu parte."
          : reading === "blocked" ? "La última lectura falló; plataforma debe intervenir."
          : "La plataforma debe localizar e interpretar las bases oficiales." },
      { title: "Validación experta de tu equipo", actor: "Responsable de la entidad", status: validation,
        detail: validation === "done" ? "Cláusulas aceptadas para esta candidatura."
          : validation === "blocked" ? "Hay una discrepancia registrada; revísala o espera su resolución."
          : state === "ready_for_entity_review" ? "Revisa las cláusulas y sus citas antes de continuar."
          : "Se activará cuando las citas estén verificadas." },
      { title: "Límites de redacción", actor: "Automática tras la validación", status: limits,
        detail: limits === "done" ? "Máximos de páginas y formato confirmados."
          : limits === "current" ? "Bases aprobadas; faltan confirmar los máximos formales."
          : "Se activará con las bases aprobadas." },
      { title: "Borrador con IA y tu revisión", actor: "Tú la inicias y la apruebas", status: draft,
        detail: draft === "done" ? "Borrador aprobado; puedes exportarlo."
          : run?.status === "review_required" ? "El borrador espera tu revisión."
          : generating ? "El redactor está trabajando; esta vista se actualizará sola."
          : draft === "blocked" ? "La generación falló; consulta el detalle inferior."
          : basesApproved && limitsVerified ? "Puedes solicitarlo con los botones inferiores."
          : "Se habilitará al completar los pasos anteriores." }
    ];
    const next = draft === "done" ? "Exporta el DOCX/PDF desde el nodo Borrador Word."
      : run?.status === "review_required" ? "Abre el borrador y apruébalo o recházalo."
      : generating ? "Ninguno: espera a que el redactor termine."
      : draft === "blocked" ? "Lee el motivo del fallo y solicita una nueva versión."
      : basesApproved && limitsVerified ? "Pulsa «Generar borrador personalizado»."
      : basesApproved ? "Revisa el aviso de límites; deben estar verificados antes de redactar."
      : state === "failed" ? "Ninguno: plataforma debe resolver el fallo de lectura."
      : state === "ready_for_entity_review" ? "Pulsa «Revisar y validar bases»."
      : state === "discrepancy_reported" ? "Abre la revisión para consultar o actualizar la discrepancia."
      : ["processing", "citations_pending"].includes(state) ? "Espera a que termine la verificación técnica de las citas."
      : requested ? "Ninguno: tu solicitud está registrada; plataforma debe interpretar las bases."
      : "Pulsa «Solicitar revisión de bases» para registrar tu petición.";
    const stateLabels = { done: "Hecho", current: "En este punto", pending: "Pendiente", blocked: "Con incidencia" };
    return `<strong>¿En qué punto está esta solicitud?</strong>
      <ol>${phases.map((phase) => `<li class="is-${phase.status}"><span class="phase-title">${phase.title}<em>${stateLabels[phase.status]}</em></span><span class="phase-actor">${phase.actor}</span><span class="phase-detail">${phase.detail}</span></li>`).join("")}</ol>
      <span class="phase-next"><b>Tu siguiente paso:</b> ${next}</span>`;
  }

  function updateSolicitudPhases(canonicalKey) {
    if (!canonicalKey) return;
    const pack = readWorkspacePackage();
    if (!pack || pack.id !== canonicalKey) return;
    document.querySelectorAll(`[data-solicitud-phases="${CSS.escape(canonicalKey)}"]`).forEach((node) => {
      node.innerHTML = solicitudPhases(pack);
    });
  }

  async function requestBasesReview(button) {
    const current = window.CredentialsAuth?.getSession?.();
    if (!current?.accessToken || !current?.tenantId) throw new Error("La sesión de la entidad no está disponible.");
    const canonicalKey = button.dataset.basesReviewRequest;
    const response = await fetch("/api/bases-review-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current) },
      body: JSON.stringify({ canonicalKey })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `No se pudo solicitar la revisión (HTTP ${response.status}).`);
    basesReviewStates.set(canonicalKey, payload.data);
    applyBasesReviewState(canonicalKey, payload.data);
    return payload.data;
  }

  async function submitBasesDecision(canonicalKey, action, note = "") {
    const current = window.CredentialsAuth?.getSession?.();
    if (!current?.accessToken || !current?.tenantId) throw new Error("La sesión de la entidad no está disponible.");
    const response = await fetch("/api/bases-review-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current) },
      body: JSON.stringify({ canonicalKey, action, note })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `No se pudo guardar la decisión (HTTP ${response.status}).`);
    basesReviewStates.set(canonicalKey, payload.data);
    applyBasesReviewState(canonicalKey, payload.data);
    return payload.data;
  }

  function closeBasesEntityReview() {
    document.querySelector("[data-bases-entity-modal]")?.remove();
    document.querySelectorAll("[data-hidden-for-bases-review]").forEach((node) => {
      node.hidden = false;
      node.style.removeProperty("display");
      node.removeAttribute("data-hidden-for-bases-review");
    });
  }

  async function openBasesEntityReview(canonicalKey) {
    const state = await loadBasesReviewState(canonicalKey);
    if (!state) throw new Error("No se pudo recuperar la lectura de las bases.");
    document.querySelectorAll("[data-constructed-doc-modal], [data-candidature-panel-modal]").forEach((node) => {
      node.hidden = true;
      node.style.display = "none";
      node.setAttribute("data-hidden-for-bases-review", "true");
    });
    const clauses = (state.reviewItems || []).flatMap((item) => item.sections || []);
    const evidence = clauses.length ? clauses.map((clause) => `
      <article class="plain-note"><strong>${escapeHtml(coreSectionLabels[clause.section] || clause.section)}</strong>
        <span>${escapeHtml(clause.text || "Cláusula sin texto legible")}</span>
        ${clause.evidenceExcerpt ? `<small>Cita: “${escapeHtml(clause.evidenceExcerpt)}”</small>` : ""}
        ${clause.sourceUrl ? `<a href="${escapeHtml(clause.sourceUrl)}" target="_blank" rel="noreferrer">Abrir bases oficiales${clause.sourcePage ? ` · página ${escapeHtml(clause.sourcePage)}` : ""}</a>` : ""}
      </article>`).join("") : `<div class="plain-note"><strong>Sin cláusulas revisables</strong><span>La verificación técnica todavía no ha preparado evidencia suficiente.</span></div>`;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" data-bases-entity-modal data-canonical-key="${escapeHtml(canonicalKey)}">
        <article class="modal candidature-panel-modal action" role="dialog" aria-modal="true" aria-labelledby="bases-entity-title">
          <div class="panel-heading"><div><p class="eyebrow">Decisión experta del tenant</p><h2 id="bases-entity-title">Validar bases para esta candidatura</h2></div><button class="icon-button" data-close-bases-entity type="button" aria-label="Cerrar"><i data-lucide="x"></i></button></div>
          <div class="plain-note"><strong>Qué estás firmando</strong><span>Confirmas que estas cláusulas reflejan las bases para tu entidad. La decisión no afecta a otros tenants y queda auditada.</span></div>
          <div class="bases-entity-evidence">${evidence}</div>
          <label><span>Discrepancia detectada</span><textarea data-bases-discrepancy-note rows="3" maxlength="3000" placeholder="Explica qué cláusula o interpretación debe revisarse..."></textarea></label>
          <div class="button-row"><button class="primary-action" data-confirm-bases-accept type="button" ${state.canAccept ? "" : "disabled"}>Validar para esta candidatura</button><button class="ghost-action" data-confirm-bases-discrepancy type="button" ${state.canReportDiscrepancy ? "" : "disabled"}>Señalar discrepancia</button></div>
        </article>
      </div>`);
    window.lucide?.createIcons();
  }

  function formatReviewDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function applyBasesReviewState(canonicalKey, state) {
    const hasRequest = Boolean(state?.requestId);
    const approved = ["approved", "accepted_by_entity"].includes(state?.state);
    document.querySelectorAll(`[data-bases-review-status="${CSS.escape(canonicalKey)}"]`).forEach((node) => {
      const requested = hasRequest ? `Solicitada el ${formatReviewDate(state.requestedAt)}. ` : "";
      node.textContent = `${requested}${state?.message || ""}`.trim();
    });
    document.querySelectorAll(`[data-bases-review-request="${CSS.escape(canonicalKey)}"]`).forEach((node) => {
      node.disabled = approved || (hasRequest && !state.canRequestAgain);
      node.textContent = approved ? "Bases aprobadas" : hasRequest ? state.canRequestAgain ? "Recordar revisión" : "Revisión solicitada" : "Solicitar revisión de bases";
    });
    const pack = readWorkspacePackage();
    if (pack?.id === canonicalKey) document.querySelectorAll(".constructed-doc-generation").forEach((node) => {
      node.innerHTML = `${draftActionButtons(pack)}<div data-draft-agent-status="${escapeHtml(canonicalKey)}"></div>`;
    });
    updateSolicitudPhases(canonicalKey);
  }

  async function loadBasesReviewState(canonicalKey) {
    const cached = basesReviewStates.get(canonicalKey);
    if (cached) {
      applyBasesReviewState(canonicalKey, cached);
      return cached;
    }
    if (basesReviewLoads.has(canonicalKey)) return basesReviewLoads.get(canonicalKey);
    const current = window.CredentialsAuth?.getSession?.();
    if (!current?.accessToken || !current?.tenantId) return null;
    const loading = fetch(`/api/bases-review-request?canonicalKey=${encodeURIComponent(canonicalKey)}`, {
      headers: { "x-tenant-id": current.tenantId, ...window.CredentialsAuth.authHeaders(current) }
    }).then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo consultar la revisión de bases.");
      basesReviewStates.set(canonicalKey, payload.data);
      applyBasesReviewState(canonicalKey, payload.data);
      return payload.data;
    }).catch(() => null).finally(() => basesReviewLoads.delete(canonicalKey));
    basesReviewLoads.set(canonicalKey, loading);
    return loading;
  }

  function refreshVisibleBasesReviewStates() {
    const selectors = "[data-bases-review-request], [data-bases-review-load], [data-bases-entity-review], [data-solicitud-phases]";
    const keys = new Set([...document.querySelectorAll(selectors)].map((node) => node.dataset.basesReviewRequest
      || node.dataset.basesReviewLoad || node.dataset.basesEntityReview || node.dataset.solicitudPhases).filter(Boolean));
    keys.forEach(loadBasesReviewState);
  }

  function constructedDocsSummary(pack) {
    const builtDocs = documentBuildPlan(pack);
    return `<div class="constructed-doc-list">
      ${builtDocs.map((doc, index) => `
        <article>
           <div><strong>${escapeHtml(doc.title)}</strong><span>${escapeHtml(doc.requirement)}</span></div>
           <div class="constructed-doc-actions">${badge(escapeHtml(doc.status), "warning")}<button class="ghost-action" data-constructed-doc-view="${index}" type="button"><i data-lucide="file-text"></i> Ver plantilla</button></div>
           <p><b>Qué hará la app:</b> ${escapeHtml(doc.possible)}</p>
           <p><b>Control necesario:</b> ${escapeHtml(doc.pending)}</p>
           ${doc.sourceUrl ? `<p><a href="${escapeHtml(doc.sourceUrl)}" target="_blank" rel="noreferrer">Abrir evidencia${doc.sourcePage ? ` · página ${escapeHtml(doc.sourcePage)}` : ""}</a></p>` : ""}
        </article>
      `).join("")}
    </div>`;
  }

  function constructedDocumentHtml(doc, pack, generatedDocument = null) {
    const preparedSections = window.ConstructedDocumentPrefill?.sections(doc, pack, generatedDocument) || [];
    const coverage = window.ConstructedDocumentPrefill?.summary(preparedSections) || { verified: 0, proposed: 0, missing: preparedSections.length, humanOnly: 0 };
    const sections = preparedSections.map((section) => `
      <section>
        <h2>${escapeHtml(section.title)}</h2>
        <div class="template-field is-${escapeHtml(section.state)}"><span>${escapeHtml(section.label)}</span>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${section.evidence.length ? `<small>Procedencia: ${section.evidence.map(escapeHtml).join(" · ")}</small>` : ""}${section.questions?.length ? `<small>Pregunta pendiente: ${section.questions.map(escapeHtml).join(" · ")}</small>` : ""}</div>
      </section>`).join("");
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title><style>
      *{box-sizing:border-box}body{margin:0;padding:28px;background:#edf2f0;color:#202438;font-family:Arial,sans-serif}article{width:min(780px,100%);min-height:980px;margin:auto;padding:58px 64px;background:#fff;box-shadow:0 8px 28px rgba(25,35,32,.12)}.stamp{display:inline-block;margin:0 0 24px;padding:7px 10px;border:1px solid #b87720;color:#7c5015;font-size:11px;font-weight:700;letter-spacing:.08em}h1{margin:0 0 12px;font-size:30px;line-height:1.2}header>p{margin:0;color:#5b6073;line-height:1.55}.document-meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:28px 0;padding:18px;border:1px solid #cfd8d5;background:#f7faf9}.document-meta div:last-child{grid-column:1/-1}.document-meta strong,.document-meta span{display:block}.document-meta span{margin-top:5px;color:#5b6073;line-height:1.45}section{margin-top:28px}h2{margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #a8d8bd;font-size:19px}.template-field{min-height:110px;padding:14px;border:1px dashed #9da9a5;background:#fbfdfc}.template-field.is-verified,.template-field.is-proposed{border-style:solid;border-color:#9bc9b0;background:#f3faf6}.template-field.is-missing,.template-field.is-human_only{border-color:#d5a93d;background:#fffaf0}.template-field span{color:#3a7f63;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.template-field p{margin:10px 0;color:#4f5568;line-height:1.55}.template-field small{display:block;margin-top:12px;padding-top:9px;border-top:1px solid #dce7e2;color:#667268}.control{margin-top:34px;padding:16px;border-left:4px solid #b87720;background:#fff8ec}.control strong,.control span{display:block}.control span{margin-top:5px;color:#5b6073;line-height:1.5}footer{margin-top:42px;padding-top:14px;border-top:1px solid #dce3e1;color:#737889;font-size:11px}@media(max-width:600px){body{padding:10px}article{min-height:0;padding:30px 24px}.document-meta{grid-template-columns:1fr}.document-meta div:last-child{grid-column:auto}}
    </style></head><body><article><p class="stamp">BORRADOR ORIENTATIVO · NO ES DOCUMENTO FINAL</p><header><h1>${escapeHtml(doc.title)}</h1><p>${escapeHtml(doc.requirement)}</p></header><div class="document-meta"><div><strong>Estado</strong><span>${generatedDocument ? "Versión generada pendiente de revisión" : escapeHtml(doc.status)}</span></div><div><strong>Cobertura trazable</strong><span>${coverage.verified} verificados · ${coverage.proposed} propuestos · ${coverage.missing} pendientes · ${coverage.humanOnly} humanos</span></div><div><strong>Contenido que puede preparar la app</strong><span>${escapeHtml(doc.possible)}</span></div></div>${sections}<div class="control"><strong>Control pendiente antes de uso</strong><span>${escapeHtml(doc.pending)}</span></div><footer>Insertia · Documento de trabajo sujeto a validación humana · No presentar ni firmar automáticamente</footer></article></body></html>`;
  }

  function generatedDocumentFor(pack, doc) {
    const run = latestDraftRuns.get(pack?.id);
    return window.ConstructedDocumentPrefill?.matchGeneratedDocument(doc, run?.output_json) || null;
  }

  function openConstructedDocument(index) {
    const pack = readWorkspacePackage();
    const doc = documentBuildPlan(pack || {})[Number(index)];
    if (!doc) return;
    const run = latestDraftRuns.get(pack?.id) || null;
    const generatedDocument = generatedDocumentFor(pack, doc);
    document.querySelector("[data-candidature-panel-modal]")?.remove();
    document.querySelector("[data-constructed-doc-modal]")?.remove();
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" data-constructed-doc-modal data-canonical-key="${escapeHtml(pack?.id)}" data-document-index="${Number(index)}">
        <article class="modal constructed-doc-modal" role="dialog" aria-modal="true" aria-labelledby="constructed-doc-title">
          <div class="panel-heading constructed-doc-heading">
            <button class="ghost-action" data-return-constructed-doc type="button"><i data-lucide="arrow-left"></i> Documentos</button>
            <div><p class="eyebrow">Plantilla preconstruida</p><h2 id="constructed-doc-title">${escapeHtml(doc.title)}</h2></div>
            <button class="icon-button" data-close-constructed-doc type="button" aria-label="Cerrar visor"><i data-lucide="x"></i></button>
          </div>
          <div class="constructed-doc-workspace">
            <iframe class="constructed-doc-frame" title="Vista previa de ${escapeHtml(doc.title)}" sandbox srcdoc="${escapeHtml(constructedDocumentHtml(doc, pack, generatedDocument))}"></iframe>
            <aside class="constructed-doc-sidebar" aria-label="Controles de la plantilla">
              <div class="solicitud-phases" data-solicitud-phases="${escapeHtml(pack?.id)}">${solicitudPhases(pack)}</div>
              <div class="plain-note"><strong>Este borrador no es la base común</strong><span>La candidatura usa datos reutilizables de la entidad, pero conserva aquí solo su versión específica. Firma, importes y datos sin evidencia siguen pendientes.</span></div>
              <details class="constructed-doc-help"><summary>¿Solo aparece el esqueleto?</summary><p>Genera una nueva versión para completar los documentos redactables, incluido este, usando solo bases verificadas y hechos aprobados.</p></details>
              <button class="ghost-action" data-private-knowledge-open type="button"><i data-lucide="library-big"></i> Ir a Base común</button>
              ${generatedDocument && run?.id && documentAgentContracted() ? `<button class="primary-action" data-document-version-edit data-run-id="${escapeHtml(run.id)}" data-canonical-key="${escapeHtml(pack?.id)}" data-document-ref="${escapeHtml(generatedDocument.documentRef)}" type="button"><i data-lucide="file-pen-line"></i> Editar borrador</button>` : ""}
              <div class="constructed-doc-generation">${draftActionButtons(pack)}<div data-draft-agent-status="${escapeHtml(pack?.id)}"></div></div>
            </aside>
          </div>
          <div class="constructed-doc-footer"><span>Revisión humana obligatoria antes de usar, exportar o presentar.</span><div class="button-row"><button class="ghost-action" data-download-constructed-doc="${Number(index)}" type="button"><i data-lucide="download"></i> Descargar esqueleto</button><button class="primary-action" data-return-constructed-doc type="button"><i data-lucide="arrow-left"></i> Volver a Documentos</button></div></div>
        </article>
      </div>`);
    window.lucide?.createIcons();
    window.dispatchEvent(new CustomEvent("draft-agent-hosts-rendered"));
  }

  function downloadConstructedDocument(index) {
    const pack = readWorkspacePackage();
    const doc = documentBuildPlan(pack || {})[Number(index)];
    if (!doc) return;
    const html = constructedDocumentHtml(doc, pack, generatedDocumentFor(pack, doc));
    const url = URL.createObjectURL(new Blob([html], { type: "application/msword;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plantilla-documental"}.doc`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (typeof showToast === "function") showToast("Plantilla descargada. Sigue pendiente de revision humana.");
  }

  function updateOpenConstructedDocument(canonicalKey) {
    const modal = document.querySelector(`[data-constructed-doc-modal][data-canonical-key="${CSS.escape(canonicalKey)}"]`);
    if (!modal) return;
    const pack = readWorkspacePackage();
    const doc = documentBuildPlan(pack || {})[Number(modal.dataset.documentIndex)];
    const frame = modal.querySelector(".constructed-doc-frame");
    if (!doc || !frame) return;
    const run = latestDraftRuns.get(canonicalKey);
    const generatedDocument = generatedDocumentFor(pack, doc);
    frame.srcdoc = constructedDocumentHtml(doc, pack, generatedDocument);
    const editorButton = modal.querySelector("[data-document-version-edit]");
    if (generatedDocument && run?.id && documentAgentContracted() && !editorButton) {
      modal.querySelector("[data-private-knowledge-open]")?.insertAdjacentHTML("afterend",
        `<button class="primary-action" data-document-version-edit data-run-id="${escapeHtml(run.id)}" data-canonical-key="${escapeHtml(canonicalKey)}" data-document-ref="${escapeHtml(generatedDocument.documentRef)}" type="button"><i data-lucide="file-pen-line"></i> Editar borrador</button>`);
      window.lucide?.createIcons();
    }
  }

  function recommendationFor(item) {
    return item?.matchRecommendation || allRows().find((entry) => String(entry.id) === String(item?.id) && entry.matchRecommendation)?.matchRecommendation || null;
  }

  function preselectionControl(item) {
    const recommendation = recommendationFor(item);
    if (!recommendation) return `<div class="plain-note"><strong>Preseleccion no disponible</strong><span>Esta oportunidad no tiene todavia una recomendacion persistida para la entidad. Recupera o calcula el encaje antes de tomar una decision.</span></div>`;
    if (recommendation.decision_status === "preselected") return `<div class="plain-note"><strong>Ya esta preseleccionada</strong><span>La gestion documental continua exclusivamente desde la seccion Candidatura.</span></div>`;
    const label = recommendation.decision_status === "dismissed" ? "Reconsiderar y preseleccionar" : "Preseleccionar oportunidad";
    return `<div class="opportunity-preselection-step"><div><strong>Siguiente paso: preseleccion</strong><span>Si te interesa, guardala para que aparezca en Candidatura. Abrir esta lectura no crea expedientes ni inicia documentacion.</span></div><button class="primary-action" data-requirement-preselect data-recommendation-id="${escapeHtml(recommendation.id)}" type="button"><i data-lucide="bookmark-plus"></i> ${label}</button></div>`;
  }

  function renderPackage(item) {
    const pack = packageFor(item);
    return `
      <div class="detail-section requirements-package">
        <div class="opportunity-topline">
          <div><p class="eyebrow">Paquete de presentacion</p><h2>Que exige esta convocatoria</h2></div>
          ${badge(pack.confidence, pack.confidence.startsWith("Alta") ? "safe" : "warning")}
        </div>
        ${basesClarityPanel(pack)}
        <div class="requirements-grid">
          <article><strong>Requisitos de entidad</strong>${list(pack.who)}</article>
          <article><strong>Documentacion a preparar</strong>${list(pack.documents)}</article>
          <article><strong>Pasos de presentacion</strong>${list(pack.steps)}</article>
          <article><strong>Criterios que debe cubrir la memoria</strong>${list(pack.criteria)}</article>
        </div>
        <div class="plain-note">
          <strong>Antes del agente documental</strong>
          <span>La entidad debe revisar esta lista contra las bases oficiales. El agente puede redactar la memoria y clasificar todos los anexos, pero no presenta ni envia nada sin aprobacion humana.</span>
        </div>
        ${preselectionControl(item)}
      </div>
    `;
  }

  function saveWorkspacePackage(item) {
    try {
      const pack = { ...packageFor(item), preparedAt: new Date().toISOString() };
      sessionStorage.setItem(packageKey, JSON.stringify(pack));
      const current = JSON.parse(localStorage.getItem(candidateKey) || "{}");
      const selectedIds = [pack.id, ...(current.selectedIds || []).filter((id) => id !== pack.id)].slice(0, 4);
      localStorage.setItem(candidateKey, JSON.stringify({ ...current, activeId: pack.id, selectedIds }));
      window.dispatchEvent(new CustomEvent("workspace-candidates-changed"));
    } catch {
      return false;
    }
    return true;
  }

  function readWorkspacePackage() {
    try {
      return JSON.parse(sessionStorage.getItem(packageKey) || "null");
    } catch {
      return null;
    }
  }

  function mapNode(id, label, detail, icon, kind, active = false) {
    const interaction = `data-candidature-${kind === "information" ? "info" : "action"}="${id}" aria-haspopup="dialog"`;
    return `<button class="candidature-map-node ${kind} ${active ? "is-active" : ""}" ${interaction} type="button">
      <i data-lucide="${icon}"></i><span><strong>${label}</strong><small>${detail}</small></span>
    </button>`;
  }

  function candidatureMap() {
    const information = [
      ["summary", "Resumen", "Qué debe quedar preparado", "layout-list"],
      ["analysis", "Análisis", "Encaje, riesgos y evidencias", "scan-search"],
      ["dates", "Fechas", "Plazo, fuente y confianza", "calendar-clock"],
      ["requirements", "Requisitos", "Quién puede optar", "badge-check"],
      ["steps", "Pasos", "Secuencia de presentación", "list-ordered"],
      ["project", "Control", "Límites y aprobación final", "shield-check"]
    ];
    const actions = [
      ["documents", "Documentos", "Revisar plantillas y anexos", "files"],
      ["checklist", "Checklist", "Resolver comprobaciones", "list-checks"],
      ["draft", "Borrador Word", "Generar y versionar la memoria", "file-pen-line"]
    ];
    const nodes = (items, kind) => items.map(([id, label, detail, icon]) => mapNode(id, label, detail, icon, kind, workspaceTargetTab === id)).join("");
    return `<section class="candidature-map" aria-label="Mapa interactivo de la candidatura">
      <div class="candidature-map-intro"><div><p class="eyebrow">Mapa de candidatura</p><h3>Entiende la convocatoria y continúa por la acción necesaria</h3></div><p>Selecciona un nodo. Los verdes explican; los azules abren el área donde debes trabajar.</p></div>
      <div class="candidature-map-lanes" aria-label="Áreas del expediente">
        <div class="candidature-map-lane information"><div class="candidature-map-lane-title"><i data-lucide="search-check"></i><span><strong>1. Entender</strong><small>Información para decidir y comprobar</small></span></div><div class="candidature-map-nodes">${nodes(information, "information")}</div></div>
        <div class="candidature-map-bridge" aria-hidden="true"><i data-lucide="arrow-right"></i><span>Pasar a preparar</span></div>
        <div class="candidature-map-lane action"><div class="candidature-map-lane-title"><i data-lucide="square-pen"></i><span><strong>2. Preparar</strong><small>Acciones sobre el expediente</small></span></div><div class="candidature-map-nodes">${nodes(actions, "action")}</div></div>
      </div>
    </section>`;
  }

  function panel(id, html, active = false) {
    return `<div class="requirements-tab-panel ${active ? "is-active" : ""}" data-requirements-panel="${id}">${html}</div>`;
  }

  function openWorkspacePanel(tabId, kind = "information") {
    const card = document.querySelector("#documentary-agent-package");
    const trigger = card?.querySelector(`[data-candidature-${kind === "information" ? "info" : "action"}="${CSS.escape(tabId)}"]`);
    const source = card?.querySelector(`[data-requirements-panel="${CSS.escape(tabId)}"]`);
    if (!trigger || !source) return false;
    document.querySelector("[data-candidature-panel-modal]")?.remove();
    const information = kind === "information";
    const title = trigger.querySelector("strong")?.textContent || (information ? "Información" : "Preparar");
    const purpose = trigger.querySelector("small")?.textContent || (information ? "Información verificable de la convocatoria." : "Acciones revisables sobre el expediente.");
    const eyebrow = information ? "Entender la convocatoria" : "Preparar la candidatura";
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-candidature-panel-modal data-close-candidature-panel><article class="modal candidature-panel-modal ${information ? "information" : "action"}" role="dialog" aria-modal="true" aria-labelledby="candidature-panel-title"><div class="panel-heading"><div><p class="eyebrow">${eyebrow}</p><h2 id="candidature-panel-title">${title}</h2></div><button class="icon-button" data-close-candidature-panel type="button" aria-label="Cerrar ${information ? "información" : "formulario"}"><i data-lucide="x"></i></button></div><p class="candidature-panel-purpose">${purpose}</p><div class="candidature-panel-content">${source.innerHTML}</div></article></div>`);
    window.lucide?.createIcons();
    window.dispatchEvent(new CustomEvent("candidature-document-hosts-rendered"));
    return true;
  }

  function renderWorkspacePackage() {
    const screen = document.querySelector("#workspace");
    if (!screen || !screen.dataset.flowReady) return;
    screen.querySelector("#documentary-agent-package")?.remove();
    if (!workspacePackageVisible) {
      screen.classList.remove("has-documentary-package");
      return;
    }
    const pack = readWorkspacePackage();
    if (!pack) {
      workspacePackageVisible = false;
      screen.classList.remove("has-documentary-package");
      return;
    }
    screen.classList.add("has-documentary-package");
    const flow = screen.querySelector(".workspace-flow");
    if (!flow) return;
    const packageMarkup = `
      <article class="panel requirements-workspace" id="documentary-agent-package">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Expediente seleccionado</p>
            <h2>${pack.title}</h2>
          </div>
          <div class="requirements-heading-actions"><button class="ghost-action" data-workspace-back type="button"><i data-lucide="arrow-left"></i> Volver a candidaturas</button>${badge("Preseleccionada", "review")}</div>
        </div>
        ${projectStage(pack)}
        <div class="requirements-summary">
          <div><strong>Fuente</strong><span>${pack.source}</span></div>
          <div><strong>Plazo operativo</strong>${pack.deadlineTrace ? window.deadlineTrace.summary(pack.deadlineTrace) : `<span>${pack.deadline} - ${pack.deadlineConfidence}</span>`}</div>
          <div><strong>Confianza</strong><span>${pack.confidence}</span></div>
        </div>
        <div data-candidature-document-summary data-recommendation-id="${escapeHtml(pack.recommendationId)}"></div>
        ${candidatureMap()}
        <div class="requirements-tab-panels">
          ${panel("summary", `
            <div class="requirements-brief">
              <div><strong>Salida esperada</strong><span>Memoria, anexos y checklist revisables a partir de requisitos oficiales y hechos aprobados del tenant.</span></div>
              <div><strong>Control humano</strong><span>Revision obligatoria antes de exportar, enviar o presentar.</span></div>
              <div><strong>Siguiente paso</strong><span>Solicitar el redactor y revisar la memoria junto con el plan documental completo.</span></div>
            </div>
          `, workspaceTargetTab === "summary")}
          ${panel("project", decisionsPanel(), workspaceTargetTab === "project")}
          ${panel("analysis", `
            <div class="requirements-brief">
              <div><strong>Lectura del radar</strong><span>${pack.source} - ${pack.territory}. ${scoreLabel(pack.score)} (${pack.score}/100 estimado, no elegibilidad).</span></div>
              <div><strong>Decision</strong><span>Usar como recomendacion explicable; no sustituye la comprobacion de beneficiario ni bases.</span></div>
              <div><strong>Revision</strong><span>Contrastar riesgos y evidencias antes de preparar anexos o exportar borrador.</span></div>
            </div>
            <div class="analysis-columns">
              <article><strong>Por que puede encajar</strong>${list(pack.fit)}</article>
              <article><strong>Riesgos</strong>${list(pack.risks)}</article>
              <article><strong>Evidencia</strong>${list(pack.evidence)}</article>
            </div>
          `, workspaceTargetTab === "analysis")}
          ${panel("dates", pack.deadlineTrace ? window.deadlineTrace.panelFromTrace(pack.deadlineTrace) : `<div class="plain-note"><strong>Sin traza de plazo</strong><span>El agente aun no ha podido consolidar una fecha o evidencia de plazo.</span></div>`, workspaceTargetTab === "dates")}
          ${panel("requirements", `<div class="compact-list">${list(pack.who)}</div>`, workspaceTargetTab === "requirements")}
          ${panel("documents", `<div data-candidature-document-selection data-recommendation-id="${escapeHtml(pack.recommendationId)}"></div>${basesClarityPanel(pack)}${constructedDocsSummary(pack)}`, workspaceTargetTab === "documents")}
          ${panel("steps", `<div class="compact-list">${list(pack.steps)}</div>`, workspaceTargetTab === "steps")}
          ${panel("checklist", `<div class="compact-tasks">${checklist()}</div>`, workspaceTargetTab === "checklist")}
          ${panel("draft", `<div class="plain-note"><strong>Esquema orientativo, no generado por IA</strong><span>Genera aquí una versión pública o personalizada. Cada ejecución crea una versión nueva y conserva la anterior para revisión y auditoría.</span></div><div class="constructed-doc-generation">${draftActionButtons(pack)}<div data-draft-agent-status="${pack.id}"></div></div><div class="compact-draft">${outline()}</div>`, workspaceTargetTab === "draft")}
        </div>
      </article>
    `;
    const anchor = flow.querySelector("#workspace-detail-anchor");
    if (anchor) anchor.innerHTML = packageMarkup;
    else flow.insertAdjacentHTML("afterbegin", packageMarkup);
    window.lucide?.createIcons();
    window.dispatchEvent(new CustomEvent("candidature-document-hosts-rendered"));
    window.dispatchEvent(new CustomEvent("draft-agent-hosts-rendered"));
    if (workspacePanelTarget) {
      openWorkspacePanel(workspacePanelTarget.id, workspacePanelTarget.kind);
      workspacePanelTarget = null;
    }
  }

  function renderWorkspacePackageSoon() {
    [0, 80, 300].forEach((delay) => setTimeout(renderWorkspacePackage, delay));
  }

  function showWorkspaceCandidateList({ scroll = false } = {}) {
    workspacePackageVisible = false;
    workspaceTargetTab = "summary";
    workspacePanelTarget = null;
    document.querySelector("[data-candidature-panel-modal]")?.remove();
    const screen = document.querySelector("#workspace");
    screen?.querySelector("#documentary-agent-package")?.remove();
    screen?.classList.remove("has-documentary-package");
    if (scroll) screen?.querySelector(".candidate-list-heading")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function openWorkspaceAnalysis(id, initialTab = "analysis") {
    const item = allRows().find((entry) => entry.id === id) || currentOpportunity();
    if (!item) return false;
    const informationIds = ["summary", "project", "analysis", "dates", "requirements", "steps"];
    const overview = initialTab === "overview";
    const targetTab = [...informationIds, "documents", "checklist", "draft"].includes(initialTab) ? initialTab : "analysis";
    workspacePackageVisible = true;
    workspacePanelTarget = overview ? null : { id: targetTab, kind: informationIds.includes(targetTab) ? "information" : "action" };
    workspaceTargetTab = "";
    document.querySelector("#workspace")?.classList.add("has-documentary-package");
    if (!saveWorkspacePackage(item)) {
      showWorkspaceCandidateList();
      return false;
    }
    window.showScreen?.("workspace");
    renderWorkspacePackageSoon();
    return true;
  }

  function enhanceDetail() {
    const detail = document.querySelector("#opportunity-detail");
    if (!detail || detail.querySelector(".requirements-package")) return;
    const item = currentOpportunity();
    const facts = detail.querySelector(".detail-section:last-of-type");
    (facts || detail).insertAdjacentHTML(facts ? "beforebegin" : "beforeend", renderPackage(item));
    window.lucide?.createIcons();
  }

  function enhanceModal(id) {
    const modal = document.querySelector(".modal-backdrop .modal:not(.radar-chat-modal)");
    if (!modal || modal.querySelector(".requirements-package")) return;
    const item = allRows().find((entry) => entry.id === id) || currentOpportunity();
    modal.insertAdjacentHTML("beforeend", renderPackage(item));
    window.lucide?.createIcons();
  }

  document.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return;
    const closeBasesReview = event.target.closest("[data-close-bases-entity]");
    const basesBackdrop = event.target.closest("[data-bases-entity-modal]");
    if (closeBasesReview || (basesBackdrop && event.target === basesBackdrop)) {
      closeBasesEntityReview();
      return;
    }
    const basesEntityReview = event.target.closest("[data-bases-entity-review]");
    if (basesEntityReview) {
      try { await openBasesEntityReview(basesEntityReview.dataset.basesEntityReview); }
      catch (error) { if (typeof showToast === "function") showToast(error?.message || "No se pudo abrir la validación de bases."); }
      return;
    }
    const basesDecision = event.target.closest("[data-confirm-bases-accept], [data-confirm-bases-discrepancy]");
    if (basesDecision) {
      const modal = basesDecision.closest("[data-bases-entity-modal]");
      const action = basesDecision.hasAttribute("data-confirm-bases-accept") ? "accept" : "report_discrepancy";
      const note = modal?.querySelector("[data-bases-discrepancy-note]")?.value || "";
      basesDecision.disabled = true;
      try {
        const result = await submitBasesDecision(modal?.dataset.canonicalKey, action, note);
        closeBasesEntityReview();
        if (typeof showToast === "function") showToast(result.message);
      } catch (error) {
        basesDecision.disabled = false;
        if (typeof showToast === "function") showToast(error?.message || "No se pudo guardar la decisión.");
      }
      return;
    }
    const closePanel = event.target.closest("[data-close-candidature-panel]");
    if (closePanel && (!closePanel.classList.contains("modal-backdrop") || event.target === closePanel)) {
      document.querySelector("[data-candidature-panel-modal]")?.remove();
      return;
    }
    const information = event.target.closest("[data-candidature-info]");
    if (information) {
      openWorkspacePanel(information.dataset.candidatureInfo, "information");
      return;
    }
    const action = event.target.closest("[data-candidature-action]");
    if (action) {
      openWorkspacePanel(action.dataset.candidatureAction, "action");
      return;
    }
    const closeConstructedDoc = event.target.closest("[data-close-constructed-doc]");
    if (closeConstructedDoc) {
      document.querySelector("[data-constructed-doc-modal]")?.remove();
      return;
    }
    const returnConstructedDoc = event.target.closest("[data-return-constructed-doc]");
    if (returnConstructedDoc) {
      document.querySelector("[data-constructed-doc-modal]")?.remove();
      openWorkspacePanel("documents", "action");
      return;
    }
    const constructedBackdrop = event.target.closest("[data-constructed-doc-modal]");
    if (constructedBackdrop && event.target === constructedBackdrop) {
      constructedBackdrop.remove();
      return;
    }
    const viewConstructedDoc = event.target.closest("[data-constructed-doc-view]");
    if (viewConstructedDoc) {
      openConstructedDocument(viewConstructedDoc.dataset.constructedDocView);
      return;
    }
    const downloadConstructedDoc = event.target.closest("[data-download-constructed-doc]");
    if (downloadConstructedDoc) {
      downloadConstructedDocument(downloadConstructedDoc.dataset.downloadConstructedDoc);
      return;
    }
    const basesReviewRequest = event.target.closest("[data-bases-review-request]");
    if (basesReviewRequest) {
      const originalText = basesReviewRequest.textContent;
      basesReviewRequest.disabled = true;
      basesReviewRequest.textContent = "Consultando estado...";
      try {
        const result = await requestBasesReview(basesReviewRequest);
        if (typeof showToast === "function") showToast(result.message);
      } catch (error) {
        basesReviewRequest.disabled = false;
        basesReviewRequest.textContent = originalText;
        if (typeof showToast === "function") showToast(error?.message || "No se pudo solicitar la revisión de bases.");
      }
      return;
    }
    const openBasesStatus = event.target.closest("[data-open-bases-status]");
    if (openBasesStatus) {
      document.querySelector("[data-constructed-doc-modal]")?.remove();
      if (!openWorkspacePanel("documents", "action")) openWorkspaceAnalysis(openBasesStatus.dataset.openBasesStatus, "documents");
      return;
    }
    const backToCandidates = event.target.closest("[data-workspace-back]");
    if (backToCandidates) {
      showWorkspaceCandidateList({ scroll: true });
      return;
    }
    const preselect = event.target.closest("[data-requirement-preselect]");
    if (preselect) {
      preselect.disabled = true;
      const originalText = preselect.textContent;
      preselect.textContent = "Guardando preseleccion...";
      try {
        if (!window.TenantMatchReview?.decide) throw new Error("La revision del encaje no esta disponible.");
        await window.TenantMatchReview.decide(preselect.dataset.recommendationId, "preselected");
        preselect.closest(".modal-backdrop")?.remove();
        if (typeof showToast === "function") showToast("Oportunidad preseleccionada. Continúa su gestion desde Candidatura.");
      } catch (error) {
        preselect.disabled = false;
        preselect.textContent = originalText;
        if (typeof showToast === "function") showToast(error?.message || "No se pudo guardar la preseleccion.");
      }
      return;
    }
    if (event.target.closest("[data-opportunity], [data-text-opportunity]")) setTimeout(enhanceDetail, 0);
    const modalTrigger = event.target.closest("[data-grid-opportunity], [data-opportunity]");
    if (modalTrigger) setTimeout(() => enhanceModal(modalTrigger.dataset.gridOpportunity || modalTrigger.dataset.opportunity), 0);
  });

  window.addEventListener("hashchange", () => {
    setTimeout(enhanceDetail, 0);
    renderWorkspacePackageSoon();
  });
  window.addEventListener("workspace-candidates-changed", renderWorkspacePackageSoon);
  window.addEventListener("draft-agent-hosts-rendered", refreshVisibleBasesReviewStates);
  window.addEventListener("draft-agent-run-updated", (event) => {
    const canonicalKey = event.detail?.canonicalKey;
    if (!canonicalKey) return;
    latestDraftRuns.set(canonicalKey, event.detail.run || null);
    updateOpenConstructedDocument(canonicalKey);
    updateSolicitudPhases(canonicalKey);
  });
  window.addEventListener("draft-document-version-updated", (event) => {
    const canonicalKey = event.detail?.canonicalKey;
    const run = latestDraftRuns.get(canonicalKey);
    if (!canonicalKey || !run || run.id !== event.detail?.runId) return;
    latestDraftRuns.set(canonicalKey, { ...run, output_json: event.detail.content || run.output_json,
      human_review: Object.prototype.hasOwnProperty.call(event.detail, "review") ? event.detail.review : run.human_review });
    updateOpenConstructedDocument(canonicalKey);
    updateSolicitudPhases(canonicalKey);
  });
  window.addEventListener("role-session-applied", () => {
    latestDraftRuns.clear();
    basesReviewStates.clear();
    basesReviewLoads.clear();
    document.querySelector("[data-constructed-doc-modal]")?.remove();
  });
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(enhanceDetail, 0);
    renderWorkspacePackageSoon();
    setTimeout(refreshVisibleBasesReviewStates, 0);
  });
  document.addEventListener("click", (event) => {
    const workspaceNavigation = event.target.closest?.('.nav-item[data-screen="workspace"]');
    if (workspaceNavigation) showWorkspaceCandidateList();
    const trigger = event.target.closest?.("[data-workspace-open]");
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openWorkspaceAnalysis(trigger.dataset.workspaceOpen, "overview");
  }, true);
  window.openWorkspaceAnalysis = openWorkspaceAnalysis;
  setTimeout(enhanceDetail, 0);
})();
