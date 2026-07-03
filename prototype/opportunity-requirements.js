(function () {
  const packageKey = "documentary-agent-package-v1";
  const candidateKey = "workspace-candidates-v1";
  const documentBlobKey = "tenant-document-blob-demo-v1";
  const documentTemplateVersion = 4;
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

  function allRows() {
    return [
      ...(window.RADAR_PLATFORM_OPPORTUNITIES || []),
      ...(window.RADAR?.opportunities || []),
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
      ...pack
    };
  }

  function documentStore() {
    try {
      return JSON.parse(localStorage.getItem(documentBlobKey) || "{}");
    } catch {
      return {};
    }
  }

  function saveDocumentStore(store) {
    localStorage.setItem(documentBlobKey, JSON.stringify(store));
  }

  function readDocumentPackage(id) {
    return documentStore()[id] || null;
  }

  function tenantDocumentPolicy() {
    return {
      documentationAgent: true,
      driveAvailable: false,
      blobAvailable: true,
      tenantName: window.RADAR_ENTITY_CONTEXT?.name || "Novaterra"
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

  function annexPlan(pack) {
    const fallbackAnnex = {
      name: "Anexo de soporte documental",
      prefill: "Crear portada, referencia a convocatoria y espacio para adjuntar evidencia.",
      pending: "Confirmar si las bases exigen modelo oficial o firma electronica.",
      owner: "Administracion de la entidad"
    };
    const cases = [
      { match: ["formulario", "solicitud"], name: "Solicitud oficial", prefill: "Datos de entidad, representante, linea solicitada, importe y declaracion de veracidad.", pending: "Completar en sede o plataforma oficial con certificado valido.", owner: "Representante legal" },
      { match: ["memoria", "proyecto", "teoria de cambio"], name: "Memoria tecnica", prefill: "Objetivos, colectivo, metodologia, calendario, equipo, indicadores y evidencias de experiencia.", pending: "Ajustar extension, puntuacion y campos obligatorios de la base.", owner: "Responsable tecnico" },
      { match: ["presupuesto", "cofinanciacion", "financiacion"], name: "Presupuesto y financiacion", prefill: "Partidas por actividad, personal, costes directos, indirectos, cofinanciacion y trazabilidad contable.", pending: "Validar limites subvencionables, IVA, porcentaje maximo y compatibilidades.", owner: "Administracion financiera" },
      { match: ["representacion", "poder", "registral"], name: "Representacion legal y registro", prefill: "Identificar representante, poderes, inscripcion registral y organo competente.", pending: "Adjuntar certificado vigente y comprobar fecha de validez.", owner: "Secretaria/gerencia" },
      { match: ["declaracion", "aeat", "seguridad social", "certificado", "corriente"], name: "Declaraciones y certificados", prefill: "Relacion de certificados fiscales, laborales, transparencia e incompatibilidades.", pending: "Descargar certificados oficiales vigentes antes de presentar.", owner: "Administracion" },
      { match: ["laboral", "equipo", "personal", "tecnico"], name: "Equipo tecnico y dedicaciones", prefill: "Perfiles, dedicaciones, funciones, coste imputado y relacion con actividades.", pending: "Evitar datos personales innecesarios; usar solo informacion aprobada.", owner: "Direccion de proyecto" },
      { match: ["cuentas", "economica", "estatutos"], name: "Solvencia y documentacion corporativa", prefill: "Estatutos, cuentas, memoria anual y datos economicos solicitados por la entidad financiadora.", pending: "Revisar si la convocatoria acepta resumen o exige documento firmado.", owner: "Gerencia" },
      { match: ["indicadores", "impacto", "evaluacion"], name: "Indicadores y evaluacion", prefill: "Indicadores de resultado, fuentes de verificacion, linea base y sistema de seguimiento.", pending: "Alinear cada indicador con criterios de puntuacion y justificacion.", owner: "Responsable de evaluacion" }
    ];
    return asArray(pack.documents).map((requirement, index) => {
      const selected = firstMatching(requirement, cases, fallbackAnnex);
      return {
        title: `Anexo ${index + 1}. ${selected.name}`,
        requirement,
        prefill: selected.prefill,
        pending: selected.pending,
        owner: selected.owner
      };
    });
  }

  function slugify(value) {
    return String(value || "documento").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "documento";
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
    return asArray(pack.documents).map((requirement, index) => {
      const selected = firstMatching(requirement, cases, fallbackPlan);
      return {
        id: `req-${index + 1}-${slugify(selected.label)}`,
        title: selected.title,
        filename: `pieza-${slugify(selected.label)}-${pack.id || "candidatura"}.doc`,
        summary: `${selected.status}: ${selected.possible}`,
        requirement,
        status: selected.status,
        possible: selected.possible,
        pending: selected.pending,
        sections: selected.sections
      };
    });
  }

  function constructedRequirementSections(pack, plan) {
    return [
      { title: "Aviso de uso", lines: "Documento construido en la medida posible desde la convocatoria y evidencias disponibles. Requiere revision humana antes de uso externo." },
      { title: "Convocatoria", lines: [`${pack.title}`, `Fuente: ${pack.source}`, `Territorio: ${pack.territory}`, `Plazo: ${pack.deadline} (${pack.deadlineConfidence})`] },
      { title: "Documento requerido", lines: [`Requisito detectado: ${plan.requirement}`, `Estado de construccion: ${plan.status}`, `Construible ahora: ${plan.possible}`, `Pendiente humano/oficial: ${plan.pending}`] },
      { title: "Campos preconstruidos", lines: plan.sections.map((section) => `${section}: completar con datos aprobados de la entidad o evidencia oficial.`) },
      { title: "Evidencia usada", lines: asArray(pack.evidence).slice(0, 5) },
      { title: "Control antes de presentar", lines: ["Confirmar que coincide con el modelo oficial vigente.", "Eliminar datos privados no necesarios.", "Aprobar por responsable de la entidad.", "Guardar version final y evidencias en auditoria."] }
    ];
  }

  function documentSections(pack, kind) {
    const annexes = annexPlan(pack);
    const builtDocs = documentBuildPlan(pack);
    const common = [
      { title: "Aviso de uso", lines: "Borrador Word para revision humana. No se presenta, envia ni comparte sin aprobacion de la entidad." },
      { title: "Convocatoria", lines: [`${pack.title}`, `Fuente: ${pack.source}`, `Territorio: ${pack.territory}`, `Plazo: ${pack.deadline} (${pack.deadlineConfidence})`, `Prioridad estimada: ${scoreLabel(pack.score)} (${pack.score}/100, no elegibilidad automatica)`] }
    ];
    if (kind === "memory") return [
      ...common,
      { title: "Encaje propuesto por el radar", lines: pack.fit },
      { title: "Resumen ejecutivo base", lines: ["Proyecto orientado al colectivo y territorio detectados en la convocatoria.", "La memoria debe conectar problema, actividades, resultados esperados e indicadores con los criterios de valoracion.", "Usar solo hechos internos aprobados por la entidad; no incorporar datos sensibles sin consentimiento y necesidad." ] },
      { title: "Estructura sugerida de memoria", lines: ["1. Necesidad social y diagnostico territorial.", "2. Objetivos generales y especificos.", "3. Personas destinatarias y criterios de acceso.", "4. Actividades, calendario y metodologia.", "5. Equipo, gobernanza y control de calidad.", "6. Indicadores, impacto esperado y seguimiento.", "7. Presupuesto narrativo y sostenibilidad.", "8. Riesgos, compatibilidades y plan de justificacion."] },
      { title: "Evidencia disponible", lines: pack.evidence },
      { title: "Riesgos a resolver antes de presentar", lines: pack.risks }
    ];
    if (kind === "checklist") return [
      ...common,
      { title: "Requisitos de entidad", lines: pack.who },
      { title: "Documentos construidos por el agente", lines: builtDocs.map((doc) => `${doc.title}: ${doc.status}. Pendiente: ${doc.pending}`) },
      { title: "Controles humanos", lines: ["Confirmar beneficiario elegible y forma juridica.", "Verificar cofinanciacion, compatibilidades y limites de gasto.", "Revisar bases vigentes, canal de presentacion y firma electronica.", "Aprobar version final antes de exportar, enviar o presentar."] },
      { title: "Estado inicial sugerido", lines: builtDocs.map((doc) => `Construido parcialmente - revisar ${doc.requirement}`) }
    ];
    if (kind === "annexes") return [
      ...common,
      { title: "Indice preconstruido de anexos", lines: annexes.map((annex) => `${annex.title}: ${annex.requirement}`) },
      ...annexes.map((annex) => ({
        title: annex.title,
        lines: [
          `Que pide la convocatoria: ${annex.requirement}`,
          `Preconstruido por el agente: ${annex.prefill}`,
          `Responsable sugerido: ${annex.owner}`,
          `Pendiente humano: ${annex.pending}`
        ]
      })),
      { title: "Procedencia", lines: ["Fuentes publicas y evidencia trazable.", "Datos internos solo si estaban aprobados para este uso.", "Drive privado no usado si no esta contratado/autorizado."] }
    ];
    return [
      ...common,
      { title: "Presupuesto base", lines: ["Tabla 1. Personal: perfil, dedicacion, coste/hora, meses, coste total y justificacion.", "Tabla 2. Actividades: materiales, alquileres, desplazamientos, servicios externos y evidencias de precio.", "Tabla 3. Cofinanciacion: fondos propios, otras ayudas, aportaciones privadas y estado de confirmacion.", "Tabla 4. Gastos no subvencionables o dudosos: marcar para excluir o consultar.", "Resumen: importe solicitado, coste total, porcentaje financiado y margen de seguridad."] },
      { title: "Criterios que debe cubrir", lines: pack.criteria },
      { title: "Alertas de revision", lines: ["No imputar costes sin soporte documental.", "Comprobar limites de personal, indirectos e IVA.", "Alinear cada partida con una actividad de la memoria y con el periodo elegible."] }
    ];
  }

  function buildDocumentPackage(pack) {
    const policy = tenantDocumentPolicy();
    const decisions = [
      policy.documentationAgent ? "Agente constructor de documentacion contratado: puede generar borradores Word." : "Agente constructor no contratado: solo se deja checklist manual.",
      policy.driveAvailable ? "Drive tenant autorizado: se podria personalizar con cultura documental aprobada." : "Drive tenant no contratado o no autorizado: se construye sin base documental privada.",
      policy.blobAvailable ? "El paquete queda guardado en Blob tenant simulado para descarga y revision." : "Blob no disponible: la descarga queda en sesion local.",
      "No hay envio ni presentacion automatica; todo Word queda pendiente de verificacion humana."
    ];
    const annexes = annexPlan(pack);
    const builtDocs = documentBuildPlan(pack);
    const docs = [
      { id: "memory", title: "Memoria tecnica", filename: `memoria-${pack.id || "candidatura"}.doc`, summary: "Estructura completa de memoria con encaje, riesgos, evidencia y secciones de proyecto.", sections: documentSections(pack, "memory") },
      { id: "checklist", title: "Checklist documental", filename: `checklist-${pack.id || "candidatura"}.doc`, summary: `${pack.documents.length} documentos y controles humanos antes de presentar.`, sections: documentSections(pack, "checklist") },
      { id: "annexes", title: "Anexos preconstruidos", filename: `anexos-${pack.id || "candidatura"}.doc`, summary: `${annexes.length} anexos base derivados de los requisitos de esta convocatoria.`, sections: documentSections(pack, "annexes") },
      { id: "budget", title: "Guia de presupuesto", filename: `presupuesto-${pack.id || "candidatura"}.doc`, summary: "Tablas y alertas para costes, cofinanciacion y partidas dudosas.", sections: documentSections(pack, "budget") },
      ...builtDocs.map((doc) => ({ id: doc.id, title: doc.title, filename: doc.filename, summary: doc.summary, sections: constructedRequirementSections(pack, doc) }))
    ];
    return { id: pack.id, opportunityTitle: pack.title, projectState: "documentation_ready", templateVersion: documentTemplateVersion, savedAt: new Date().toISOString(), tenant: policy.tenantName, storage: "local_fallback", decisions, docs };
  }

  function ensureDocumentPackage(pack) {
    const store = documentStore();
    const current = store[pack.id];
    if (current?.docs?.length && current.templateVersion === documentTemplateVersion) return current;
    const next = buildDocumentPackage(pack);
    store[pack.id] = current ? { ...next, projectState: current.projectState || next.projectState, activatedAt: current.activatedAt } : next;
    saveDocumentStore(store);
    return store[pack.id];
  }

  function updateDocumentPackage(id, patch) {
    const store = documentStore();
    store[id] = { ...(store[id] || {}), ...patch };
    saveDocumentStore(store);
    return store[id];
  }

  async function persistDocumentPackage(docs) {
    const session = window.CredentialsAuth?.getSession?.();
    if (!session?.accessToken || !session?.tenantId) {
      return updateDocumentPackage(docs.id, { storage: "local_fallback", storageMessage: "Sin sesion tenant/API: paquete guardado solo en este navegador." });
    }
    try {
      const response = await fetch("/api/candidature-document-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...window.CredentialsAuth.authHeaders(session),
          "x-tenant-id": session.tenantId
        },
        body: JSON.stringify({
          opportunityId: docs.id,
          title: docs.opportunityTitle,
          decisions: docs.decisions,
          documents: docs.docs
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo guardar en Blob tenant");
      return updateDocumentPackage(docs.id, { storage: "vercel_blob", storageMessage: "Guardado en Blob tenant con auditoria.", backendDocuments: payload.data.documents || [] });
    } catch (error) {
      return updateDocumentPackage(docs.id, { storage: "local_fallback", storageMessage: `${error.message || "Blob no disponible"}. Se mantiene descarga local.` });
    }
  }

  function savePackState(pack, state) {
    const next = { ...pack, documentState: state?.projectState || "", documentSavedAt: state?.savedAt || "" };
    sessionStorage.setItem(packageKey, JSON.stringify(next));
  }

  function projectStage(pack, docs) {
    const active = docs?.projectState === "active";
    return `
      <div class="project-stage" aria-label="Estado de candidatura">
        <span class="is-done">Preseleccionada</span>
        <span class="${docs ? "is-done" : "is-current"}">Documentacion</span>
        <span class="${active ? "is-done" : ""}">Proyecto activo</span>
      </div>
      <div class="document-agent-actions">
        ${docs ? `<div><strong>Documentacion Word preparada</strong><span>${docs.storage === "vercel_blob" ? "Guardada en Blob tenant" : "Preparada en fallback local"}. ${docs.docs.length} documentos descargables.</span></div>` : `<div><strong>Falta estructura documental</strong><span>Para activar como proyecto, el agente debe generar memoria, checklist, anexos y presupuesto en Word.</span></div>`}
        <div class="button-row">
          ${docs ? `<button class="ghost-action" data-download-doc="all" data-package-id="${pack.id}" type="button">Descargar paquete Word (${docs.docs.length})</button>` : `<button class="primary-action" data-doc-agent-build="${pack.id}" type="button">Preparar documentacion Word</button>`}
          ${docs && !active ? `<button class="primary-action" data-project-activate="${pack.id}" type="button">Activar como proyecto</button>` : ""}
        </div>
        ${docs ? `<div class="download-feedback" data-download-feedback>Al pulsar descargar, el navegador guarda los .doc en su carpeta de descargas. En el navegador integrado puede no abrirse bandeja visible.</div>` : ""}
      </div>`;
  }

  function decisionsPanel(docs) {
    if (!docs) return `<div class="plain-note"><strong>Decision pendiente</strong><span>El agente aun no ha preparado los Word ni ha declarado que fuentes puede usar.</span></div>`;
    const storage = docs.storageMessage || (docs.storage === "vercel_blob" ? "Guardado en Blob tenant con auditoria." : "Fallback local: aun no hay confirmacion de Blob tenant.");
    return `<div class="decision-list"><article><strong>Almacenamiento</strong><span>${storage}</span></article>${docs.decisions.map((item) => `<article><strong>Decision del agente</strong><span>${item}</span></article>`).join("")}</div>`;
  }

  function generatedDocsPanel(docs) {
    if (!docs) return "";
    const backendById = Object.fromEntries((docs.backendDocuments || []).map((doc) => [doc.id, doc]));
    return `<div class="generated-doc-grid">${docs.docs.map((doc) => `
      <article>
        <strong>${doc.title}</strong>
        <span>${doc.summary || "Word editable - revision humana obligatoria"}</span>
        <a class="ghost-action" href="${wordHref(doc.title, doc.sections)}" download="${doc.filename}" data-download-doc="${doc.id}" data-package-id="${docs.id}">Descargar Word</a>
        ${backendById[doc.id]?.pathname ? `<span class="blob-path">Blob tenant: ${backendById[doc.id].pathname}</span>` : ""}
      </article>`).join("")}</div>`;
  }

  function constructedDocsSummary(pack) {
    const builtDocs = documentBuildPlan(pack);
    return `<div class="constructed-doc-list">
      ${builtDocs.map((doc) => `
        <article>
          <div><strong>${doc.title}</strong><span>${doc.requirement}</span></div>
          ${badge(doc.status, "warning")}
          <p><b>Construible:</b> ${doc.possible}</p>
          <p><b>Pendiente:</b> ${doc.pending}</p>
        </article>
      `).join("")}
    </div>`;
  }

  function wordHtml(title, sections) {
    const body = sections.map((section) => `
      <h2>${section.title}</h2>
      ${Array.isArray(section.lines) ? `<ul>${section.lines.map((line) => `<li>${line}</li>`).join("")}</ul>` : `<p>${section.lines}</p>`}
    `).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#10231f;line-height:1.45;margin:36px;}h1{color:#005c55;font-size:24px;margin:0 0 18px;}h2{color:#10231f;font-size:16px;margin:20px 0 8px;border-bottom:1px solid #bfd3ce;padding-bottom:5px;}p,li{font-size:12.5px;}li{margin:0 0 6px;}.review{background:#fff8e6;border:1px solid #e7c66f;padding:10px;}</style></head><body><h1>${title}</h1>${body}</body></html>`;
  }

  function wordHref(title, sections) {
    return `data:application/msword;charset=utf-8,${encodeURIComponent(`\ufeff${wordHtml(title, sections)}`)}`;
  }

  function downloadWordFile(filename, title, sections) {
    if (typeof window.downloadWord === "function") {
      window.downloadWord(filename, title, sections);
      return;
    }
    const blob = new Blob(["\ufeff", wordHtml(title, sections)], { type: "application/msword" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function noteDownload(filename, count = 1) {
    const feedback = document.querySelector("[data-download-feedback]");
    if (feedback) {
      const label = count > 1 ? `${count} documentos Word solicitados` : filename;
      feedback.textContent = `Descarga iniciada: ${label}. Revisa la carpeta Descargas del navegador.`;
      feedback.classList.add("is-visible");
    }
  }

  function filenameFromTitle(title) {
    return `${String(title || "documento").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "documento"}.doc`;
  }

  function visibleDocumentFromCard(card) {
    const title = card?.querySelector("strong")?.textContent.trim() || "Documento de candidatura";
    const requirements = [...document.querySelectorAll("#documentary-agent-package [data-requirements-panel='documents'] .compact-list li")]
      .map((item) => item.textContent.trim())
      .filter(Boolean);
    return {
      id: filenameFromTitle(title).replace(/\.doc$/, ""),
      title,
      filename: filenameFromTitle(title),
      sections: [
        { title: "Aviso de uso", lines: "Documento Word para revision humana. No presentar ni compartir sin aprobacion de la entidad." },
        { title: "Candidatura", lines: document.querySelector("#documentary-agent-package h2")?.textContent.trim() || "Candidatura activa" },
        { title: "Documentacion requerida visible", lines: requirements.length ? requirements : ["Revisar bases y anexos oficiales antes de presentar."] }
      ]
    };
  }

  function visibleDocuments(trigger) {
    const grid = trigger.closest(".generated-doc-grid");
    const cards = grid ? [...grid.querySelectorAll("article")] : [trigger.closest("article")].filter(Boolean);
    return cards.map(visibleDocumentFromCard);
  }

  function renderPackage(item) {
    const pack = packageFor(item);
    return `
      <div class="detail-section requirements-package">
        <div class="opportunity-topline">
          <div><p class="eyebrow">Paquete de presentacion</p><h2>Que exige esta convocatoria</h2></div>
          ${badge(pack.confidence, pack.confidence.startsWith("Alta") ? "safe" : "warning")}
        </div>
        <div class="requirements-grid">
          <article><strong>Requisitos de entidad</strong>${list(pack.who)}</article>
          <article><strong>Documentacion a preparar</strong>${list(pack.documents)}</article>
          <article><strong>Pasos de presentacion</strong>${list(pack.steps)}</article>
          <article><strong>Criterios que debe cubrir la memoria</strong>${list(pack.criteria)}</article>
        </div>
        <div class="plain-note">
          <strong>Antes del agente documental</strong>
          <span>Novaterra debe revisar esta lista contra las bases oficiales. El agente documental puede preparar memoria, anexos y checklist, pero no presenta ni envia nada sin aprobacion humana.</span>
        </div>
        <div class="button-row">
          <button class="primary-action" data-document-agent="${item?.id || ""}" type="button">Preparar documentacion con agente</button>
          <button class="ghost-action" data-jump="workspace" data-document-agent-open="${item?.id || ""}" type="button">Abrir candidatura</button>
        </div>
      </div>
    `;
  }

  function saveWorkspacePackage(item) {
    try {
      const pack = { ...packageFor(item), preparedAt: new Date().toISOString() };
      let docs = readDocumentPackage(pack.id);
      if (docs?.docs?.length && docs.templateVersion !== documentTemplateVersion) docs = ensureDocumentPackage(pack);
      if (docs) {
        pack.documentState = docs.projectState;
        pack.documentSavedAt = docs.savedAt;
      }
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
    screen.classList.add("has-documentary-package");
    const flow = screen.querySelector(".workspace-flow");
    if (!flow) return;
    let docs = readDocumentPackage(pack.id);
    if (docs?.docs?.length && docs.templateVersion !== documentTemplateVersion) docs = ensureDocumentPackage(pack);
    const isProject = docs?.projectState === "active";
    const packageMarkup = `
      <article class="panel requirements-workspace" id="documentary-agent-package">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">${isProject ? "Proyecto activo" : "Expediente seleccionado"}</p>
            <h2>${pack.title}</h2>
          </div>
          ${badge(isProject ? "Proyecto" : docs ? "Documentacion preparada" : "Preseleccionada", isProject ? "safe" : docs ? "warning" : "review")}
        </div>
        ${projectStage(pack, docs)}
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
              <div><strong>Siguiente paso</strong><span>${docs ? "Revisar Word y activar como proyecto cuando proceda." : "Preparar documentacion Word antes de activar como proyecto."}</span></div>
            </div>
          `, true)}
          ${panel("project", `${decisionsPanel(docs)}${generatedDocsPanel(docs)}`)}
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
          ${panel("documents", `${constructedDocsSummary(pack)}${generatedDocsPanel(docs)}`)}
          ${panel("steps", `<div class="compact-list">${list(pack.steps)}</div>`)}
          ${panel("checklist", `<div class="compact-tasks">${checklist()}</div>`)}
          ${panel("draft", `<div class="compact-draft">${outline()}</div>`)}
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

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest("[data-requirements-tab]");
    if (tab) {
      switchWorkspaceTab(tab.dataset.requirementsTab);
      return;
    }
    if (event.target.closest("[data-opportunity], [data-text-opportunity]")) setTimeout(enhanceDetail, 0);
    const modalTrigger = event.target.closest("[data-grid-opportunity], [data-opportunity]");
    if (modalTrigger) setTimeout(() => enhanceModal(modalTrigger.dataset.gridOpportunity || modalTrigger.dataset.opportunity), 0);
    const jumpButton = event.target.closest(".requirements-package [data-jump='workspace']");
    if (jumpButton) {
      const item = allRows().find((entry) => entry.id === jumpButton.dataset.documentAgentOpen) || currentOpportunity();
      saveWorkspacePackage(item);
      window.showScreen?.("workspace");
      renderWorkspacePackageSoon();
    }
    const button = event.target.closest("[data-document-agent]");
    if (!button) return;
    const item = allRows().find((entry) => entry.id === button.dataset.documentAgent) || currentOpportunity();
    saveWorkspacePackage(item);
    button.closest(".modal-backdrop")?.remove();
    window.showScreen?.("workspace");
    renderWorkspacePackageSoon();
  });

  document.addEventListener("click", (event) => {
    const build = event.target.closest?.("[data-doc-agent-build]");
    const activate = event.target.closest?.("[data-project-activate]");
    const download = event.target.closest?.("[data-download-doc]");
    if (!build && !activate && !download) return;
    if (download?.tagName === "A" && download.getAttribute("download")) {
      noteDownload(download.getAttribute("download") || "documento Word");
      if (typeof showToast === "function") showToast("Descarga Word iniciada. Revisa la carpeta Descargas del navegador.");
      return;
    }
    const packageId = download?.dataset.packageId;
    const itemForDownload = packageId ? allRows().find((entry) => entry.id === packageId) : null;
    const pack = readWorkspacePackage() || (itemForDownload ? packageFor(itemForDownload) : null);
    if (!pack && download) {
      const docs = download.dataset.downloadDoc === "all" ? visibleDocuments(download) : [visibleDocumentFromCard(download.closest("article"))];
      const wanted = docs.filter(Boolean);
      wanted.forEach((doc) => downloadWordFile(doc.filename, doc.title, doc.sections));
      noteDownload(wanted[0]?.filename || "paquete Word", wanted.length);
      if (typeof showToast === "function") showToast(wanted.length > 1 ? "Paquete Word descargado para revision." : "Word descargado para revision.");
      return;
    }
    if (!pack) return;
    if (build) {
      const docs = ensureDocumentPackage(pack);
      savePackState(pack, docs);
      renderWorkspacePackageSoon();
      if (typeof showToast === "function") showToast("Documentacion Word preparada. Intentando guardarla en Blob tenant.");
      persistDocumentPackage(docs).then((next) => {
        savePackState(pack, next);
        renderWorkspacePackageSoon();
        if (typeof showToast === "function") showToast(next.storage === "vercel_blob" ? "Paquete Word guardado en Blob tenant." : "No hay Blob tenant disponible: queda descarga local.");
      });
      return;
    }
    if (activate) {
      const docs = ensureDocumentPackage(pack);
      const next = updateDocumentPackage(docs.id, { projectState: "active", activatedAt: new Date().toISOString() });
      savePackState(pack, next);
      renderWorkspacePackageSoon();
      window.dispatchEvent(new CustomEvent("workspace-candidates-changed"));
      if (typeof showToast === "function") showToast("Proyecto activo. Los Word siguen pendientes de revision humana antes de uso externo.");
      return;
    }
    const docs = readDocumentPackage(download.dataset.packageId || pack.id) || ensureDocumentPackage(pack);
    const wanted = download.dataset.downloadDoc === "all" ? docs.docs : docs.docs.filter((doc) => doc.id === download.dataset.downloadDoc);
    wanted.forEach((doc) => downloadWordFile(doc.filename, doc.title, doc.sections));
    noteDownload(wanted[0]?.filename || "paquete Word", wanted.length);
    if (typeof showToast === "function") showToast(wanted.length > 1 ? "Paquete Word descargado para revision." : "Word descargado para revision.");
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
