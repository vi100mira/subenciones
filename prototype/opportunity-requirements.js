(function () {
  const packageKey = "documentary-agent-package-v1";
  const candidateKey = "workspace-candidates-v1";
  let workspacePackageVisible = true;
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
    return (window.MOCK?.checklist || []).map((entry) => {
      const tone = entry.state === "done" ? "safe" : entry.state === "review" ? "warning" : "review";
      const label = entry.state === "done" ? "Hecho" : entry.state === "review" ? "Revisar" : "Pendiente";
      return `<div class="compact-task"><strong>${entry.item}</strong>${badge(label, tone)}</div>`;
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
      { match: ["memoria", "proyecto", "teoria de cambio"], label: "Memoria tecnica", title: "Memoria tecnica - borrador construido", status: "Borrador narrativo", possible: "Resumen ejecutivo, problema, objetivos, actividades, calendario, indicadores, evidencias y riesgos.", pending: "Completar datos internos aprobados, cifras de beneficiarios, presupuesto final y extension exigida.", sections: ["Diagnostico", "Objetivos", "Actividades", "Impacto"] },
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
    return `<div class="plain-note"><strong>${title}</strong><span>${detail} ${approved ? "El agente conservará las citas y la aprobación final seguirá siendo humana." : "No se presentará como completo hasta aprobar sus citas."}</span></div>`;
  }

  function projectStage(pack) {
    const basesApproved = pack.requirementsContract?.documentaryGate === "requirements_approved";
    return `
      <div class="project-stage" aria-label="Estado de candidatura">
        <span class="is-done">Preseleccionada</span>
        <span class="is-current">Documentacion</span>
        <span>Proyecto activo</span>
      </div>
      <div class="document-agent-actions">
        ${basesApproved ? `<div><strong>Bases aprobadas; expediente pendiente</strong><span>El agente generará el documento principal y los anexos redactables, y separará modelos oficiales y evidencias de entidad.</span></div>` : `<div><strong>Bases pendientes de revisión</strong><span>Bloqueado hasta aprobar quién puede solicitar, actuaciones, documentos obligatorios y forma de presentación con sus citas.</span></div>`}
        <div class="button-row">
          ${pack.proposalConstraints?.draftingGate === "constraints_verified" && basesApproved ? `<button class="ghost-action" data-draft-agent-start="${pack.id}" data-approved-facts="false" type="button">Borrador base (solo publico)</button><button class="primary-action" data-draft-agent-start="${pack.id}" data-approved-facts="true" type="button">Borrador personalizado</button>` : ""}
          ${!basesApproved ? `<button class="primary-action" type="button" disabled>Esperando revision de bases</button>` : ""}
        </div>
        <div class="plain-note" data-draft-agent-status="${pack.id}"><strong>Agente redactor</strong><span>El modo base usa solo evidencia publica. El personalizado requiere consentimiento IA y envia solo hechos del perfil previamente aprobados; nunca documentos privados completos.</span></div>
      </div>`;
  }

  function decisionsPanel() {
    return `<div class="plain-note"><strong>Salida gobernada pendiente</strong><span>El redactor debe mapear todos los documentos exigidos, declarar faltantes y quedar aprobado antes de generar DOCX/PDF privados.</span></div>`;
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

  function openConstructedDocument(index) {
    const pack = readWorkspacePackage();
    const doc = documentBuildPlan(pack || {})[Number(index)];
    if (!doc) return;
    document.querySelector("[data-constructed-doc-modal]")?.remove();
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" data-constructed-doc-modal>
        <article class="modal constructed-doc-modal" role="dialog" aria-modal="true" aria-labelledby="constructed-doc-title">
          <div class="panel-heading">
            <div><p class="eyebrow">Plantilla preconstruida</p><h2 id="constructed-doc-title">${escapeHtml(doc.title)}</h2></div>
            <button class="icon-button" data-close-constructed-doc type="button" aria-label="Cerrar visor"><i data-lucide="x"></i></button>
          </div>
          <div class="plain-note"><strong>No es el documento final</strong><span>Esta vista permite revisar la estructura prevista. Las bases, los datos internos y la firma siguen pendientes de validacion humana.</span></div>
          <div class="constructed-doc-preview">
            <section><strong>Documento exigido</strong><p>${escapeHtml(doc.requirement)}</p></section>
            <section><strong>Contenido que puede preparar la app</strong><p>${escapeHtml(doc.possible)}</p></section>
            <section><strong>Control pendiente</strong><p>${escapeHtml(doc.pending)}</p></section>
            <section class="constructed-doc-sections"><strong>Secciones previstas</strong><ol>${doc.sections.map((section) => `<li><b>${escapeHtml(section)}</b><span>Contenido pendiente de completar y revisar.</span></li>`).join("")}</ol></section>
          </div>
          <div class="button-row"><button class="primary-action" data-download-constructed-doc="${Number(index)}" type="button"><i data-lucide="download"></i> Descargar plantilla</button><button class="ghost-action" data-close-constructed-doc type="button">Cerrar</button></div>
        </article>
      </div>`);
    window.lucide?.createIcons();
  }

  function downloadConstructedDocument(index) {
    const pack = readWorkspacePackage();
    const doc = documentBuildPlan(pack || {})[Number(index)];
    if (!doc) return;
    const sections = doc.sections.map((section) => `<h2>${escapeHtml(section)}</h2><p><em>Contenido pendiente de completar y revisar.</em></p>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title></head><body><h1>${escapeHtml(doc.title)}</h1><p><strong>PLANTILLA ORIENTATIVA - NO ES DOCUMENTO FINAL</strong></p><p>${escapeHtml(doc.requirement)}</p>${sections}<hr><p><strong>Control pendiente:</strong> ${escapeHtml(doc.pending)}</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "application/msword;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plantilla-documental"}.doc`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (typeof showToast === "function") showToast("Plantilla descargada. Sigue pendiente de revision humana.");
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

  function tabButton(id, label, active = false) {
    return `<button class="${active ? "is-active" : ""}" data-requirements-tab="${id}" type="button">${label}</button>`;
  }

  function panel(id, html, active = false) {
    return `<div class="requirements-tab-panel ${active ? "is-active" : ""}" data-requirements-panel="${id}">${html}</div>`;
  }

  function switchWorkspaceTab(tabId) {
    const card = document.querySelector("#documentary-agent-package");
    if (!card) return false;
    card.querySelectorAll("[data-requirements-tab]").forEach((item) => item.classList.toggle("is-active", item.dataset.requirementsTab === tabId));
    card.querySelectorAll("[data-requirements-panel]").forEach((item) => item.classList.toggle("is-active", item.dataset.requirementsPanel === tabId));
    card.scrollIntoView({ block: "start", behavior: "smooth" });
    return true;
  }

  function renderWorkspacePackage() {
    const screen = document.querySelector("#workspace");
    const pack = readWorkspacePackage();
    if (!screen || !pack || !screen.dataset.flowReady) return;
    screen.querySelector("#documentary-agent-package")?.remove();
    if (!workspacePackageVisible) {
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
        <div class="requirements-tabs" role="tablist" aria-label="Candidatura activa">
          ${tabButton("summary", "Resumen", true)}
          ${tabButton("project", "Proyecto")}
          ${tabButton("analysis", "Analisis")}
          ${tabButton("dates", "Fechas")}
          ${tabButton("requirements", "Requisitos")}
          ${tabButton("documents", "Documentos")}
          ${tabButton("steps", "Pasos")}
          ${tabButton("checklist", "Checklist")}
          ${tabButton("draft", "Borrador")}
        </div>
        <div class="requirements-tab-panels">
          ${panel("summary", `
            <div class="requirements-brief">
              <div><strong>Salida esperada</strong><span>Memoria, anexos y checklist revisables a partir de requisitos oficiales y hechos aprobados del tenant.</span></div>
              <div><strong>Control humano</strong><span>Revision obligatoria antes de exportar, enviar o presentar.</span></div>
              <div><strong>Siguiente paso</strong><span>Solicitar el redactor y revisar la memoria junto con el plan documental completo.</span></div>
            </div>
          `, true)}
          ${panel("project", decisionsPanel())}
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
          `)}
          ${panel("dates", pack.deadlineTrace ? window.deadlineTrace.panelFromTrace(pack.deadlineTrace) : `<div class="plain-note"><strong>Sin traza de plazo</strong><span>El agente aun no ha podido consolidar una fecha o evidencia de plazo.</span></div>`)}
          ${panel("requirements", `<div class="compact-list">${list(pack.who)}</div>`)}
          ${panel("documents", `${basesClarityPanel(pack)}${constructedDocsSummary(pack)}`)}
          ${panel("steps", `<div class="compact-list">${list(pack.steps)}</div>`)}
          ${panel("checklist", `<div class="compact-tasks">${checklist()}</div>`)}
          ${panel("draft", `<div class="plain-note"><strong>Esquema orientativo, no generado por IA</strong><span>El borrador real se solicita desde Proyecto y solo puede quedar listo para revision tras evidencia, limites y renderizado PDF.</span></div><div data-draft-agent-status="${pack.id}"></div><div class="compact-draft">${outline()}</div>`)}
        </div>
      </article>
    `;
    const anchor = flow.querySelector("#workspace-detail-anchor");
    if (anchor) anchor.innerHTML = packageMarkup;
    else flow.insertAdjacentHTML("afterbegin", packageMarkup);
    window.lucide?.createIcons();
  }

  function renderWorkspacePackageSoon() {
    [0, 80, 300].forEach((delay) => setTimeout(renderWorkspacePackage, delay));
  }

  function openWorkspaceAnalysis(id) {
    const item = allRows().find((entry) => entry.id === id) || currentOpportunity();
    if (!item) return false;
    saveWorkspacePackage(item);
    workspacePackageVisible = true;
    window.showScreen?.("workspace");
    renderWorkspacePackageSoon();
    [120, 360].forEach((delay) => setTimeout(() => switchWorkspaceTab("analysis"), delay));
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
    const closeConstructedDoc = event.target.closest("[data-close-constructed-doc]");
    if (closeConstructedDoc) {
      document.querySelector("[data-constructed-doc-modal]")?.remove();
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
    const backToCandidates = event.target.closest("[data-workspace-back]");
    if (backToCandidates) {
      workspacePackageVisible = false;
      document.querySelector("#documentary-agent-package")?.remove();
      document.querySelector("#workspace")?.classList.remove("has-documentary-package");
      document.querySelector("#workspace .candidate-list-heading")?.scrollIntoView({ block: "start", behavior: "smooth" });
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
    const tab = event.target.closest("[data-requirements-tab]");
    if (tab) {
      switchWorkspaceTab(tab.dataset.requirementsTab);
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
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(enhanceDetail, 0);
    renderWorkspacePackageSoon();
  });
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-workspace-open]");
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openWorkspaceAnalysis(trigger.dataset.workspaceOpen);
  }, true);
  window.openWorkspaceAnalysis = openWorkspaceAnalysis;
  setTimeout(enhanceDetail, 0);
})();
