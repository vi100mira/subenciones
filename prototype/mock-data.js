window.MOCK = {
  opportunities: [
    {
      id: "labora-empleo-2026",
      title: "Programa de empleo inclusivo 2026",
      source: "LABORA / GVA",
      territory: "Comunitat Valenciana",
      deadline: "25/06/2026",
      deadlineStatus: "open",
      deadlineConfidence: "Alta",
      sourceScope: "Publica oficial",
      funderType: "Administracion publica",
      evidenceQuality: "Fuente oficial",
      score: 88,
      amount: "Hasta 120.000 EUR",
      theme: "Insercion sociolaboral",
      fit: [
        "El territorio coincide con la actuacion principal de la entidad.",
        "El objeto subvencionable menciona itinerarios, formacion y acompanamiento.",
        "El colectivo objetivo encaja con personas en situacion de vulnerabilidad."
      ],
      risks: [
        "Confirmar si exige cofinanciacion minima.",
        "Revisar limites de gastos de personal y costes indirectos."
      ],
      evidence: [
        "Extracto oficial: actuaciones de mejora de empleabilidad para colectivos vulnerables.",
        "Bases: entidades sin animo de lucro con implantacion territorial.",
        "Plazo: solicitud abierta hasta fecha indicada en convocatoria."
      ],
      internalFacts: ["Actuacion CV", "Programas de empleo", "Acompanamiento individual"]
    },
    {
      id: "irpf-social-2026",
      title: "Subvenciones con cargo al 0,7% IRPF - programas sociales",
      source: "Ministerio Derechos Sociales",
      territory: "Estatal",
      deadline: "25/06/2026",
      deadlineStatus: "open",
      deadlineConfidence: "Alta",
      sourceScope: "Publica oficial",
      funderType: "Administracion publica",
      evidenceQuality: "Fuente oficial",
      score: 81,
      amount: "Segun linea",
      theme: "Inclusion social",
      fit: [
        "La entidad tiene experiencia en inclusion y empleo.",
        "El ambito estatal permite proyectos con impacto territorial coordinado."
      ],
      risks: [
        "Requiere ajustar el proyecto a una linea concreta.",
        "Alta competencia y documentacion administrativa extensa."
      ],
      evidence: [
        "Portal ministerial: convocatoria 2026 abierta.",
        "Objeto: programas de interes general con fines sociales."
      ],
      internalFacts: ["Trayectoria social", "Red territorial"]
    },
    {
      id: "fundacion-caixa-accion-social",
      canonicalKey: "fundacion-la-caixa-convocatorias-sociales",
      title: "Convocatoria social territorial",
      source: "Fundacion privada",
      territory: "Comunitat Valenciana",
      deadline: "Plazo por confirmar",
      deadlineStatus: "uncertain",
      deadlineConfidence: "Media",
      sourceScope: "Privada abierta",
      funderType: "Fundacion / obra social",
      evidenceQuality: "Fuente del financiador por verificar",
      score: 73,
      amount: "Hasta 50.000 EUR",
      theme: "Accion social",
      fit: [
        "Buena afinidad tematica con inclusion y acompanamiento.",
        "Financiador privado compatible con innovacion social."
      ],
      risks: [
        "La fecha final debe verificarse en la pagina del financiador.",
        "Puede exigir memoria economica especifica."
      ],
      evidence: [
        "Historico de convocatorias territoriales para entidades sociales.",
        "Bases privadas pendientes de descarga."
      ],
      internalFacts: ["Proyectos acompanamiento", "Indicadores impacto"]
    },
    {
      id: "banca-social-empleo-joven",
      title: "Programa privado de empleo joven y competencias digitales",
      source: "Obra social bancaria",
      territory: "Comunitat Valenciana",
      deadline: "Ventana prevista Q3 2026",
      deadlineStatus: "uncertain",
      deadlineConfidence: "Baja",
      sourceScope: "Privada abierta",
      funderType: "Banco / obra social",
      evidenceQuality: "Pagina de financiador pendiente de revision",
      score: 69,
      amount: "Entre 20.000 y 80.000 EUR",
      theme: "Empleo joven",
      fit: [
        "El objeto esperado encaja con itinerarios de insercion y competencias digitales.",
        "La entidad podria aportar experiencia territorial y seguimiento de participantes."
      ],
      risks: [
        "No hay plazo oficial confirmado.",
        "Puede requerir colaboracion empresarial o indicadores de empleabilidad muy concretos."
      ],
      evidence: [
        "Fuente privada abierta: programa social bancario a revisar por administracion de plataforma.",
        "Patron historico: convocatorias orientadas a empleo, juventud e inclusion."
      ],
      internalFacts: ["Empleo joven", "Formacion digital", "Actuacion CV"]
    },
    {
      id: "alerta-federacion-convenio-local",
      title: "Aviso de financiacion por convenio para entidades asociadas",
      source: "Federacion sectorial / aviso recibido",
      territory: "Provincial",
      deadline: "Invitacion recibida, fecha no publicada",
      deadlineStatus: "uncertain",
      deadlineConfidence: "Baja",
      sourceScope: "Privada del tenant",
      funderType: "Federacion / relacion privada",
      evidenceQuality: "PDF recibido por la entidad",
      score: 62,
      amount: "Por confirmar",
      theme: "Accion comunitaria",
      fit: [
        "Puede encajar por pertenencia sectorial y trayectoria local.",
        "Requiere revisar si Novaterra esta invitada formalmente o solo informada."
      ],
      risks: [
        "No debe reutilizarse para otros tenants.",
        "La evidencia procede de un documento recibido y necesita aprobacion interna."
      ],
      evidence: [
        "Fuente tenant-private: aviso recibido por la entidad, no promocionable a plataforma.",
        "El acceso parece depender de relacion o membresia."
      ],
      internalFacts: ["Red territorial", "Pendiente aprobacion admin"]
    }
  ],
  alerts: [
    { type: "deadline", title: "IRPF estatal cierra esta semana", detail: "Faltan 2 documentos administrativos por confirmar." },
    { type: "risk", title: "Dato interno pendiente de aprobar", detail: "Un fragmento de memoria incluye datos personales indirectos." },
    { type: "source", title: "Fuentes públicas revisadas", detail: "12 nuevas convocatorias incorporadas a la revisión." }
  ],
  sources: [
    { name: "Base Nacional de Subvenciones", kind: "Publica oficial", scope: "Plataforma", status: "Revisión automática activa", health: "healthy", priority: 95, control: "Seguimiento diario" },
    { name: "GVA", kind: "Portal autonomico", scope: "Plataforma", status: "Disponible para consulta", health: "degraded", priority: 82, control: "Automatización pendiente" },
    { name: "LABORA", kind: "Empleo", scope: "Plataforma", status: "Seguimiento activo", health: "healthy", priority: 88, control: "Revisión si cambia" },
    { name: "DOGV/BOP", kind: "Boletines", scope: "Plataforma", status: "Pendiente de automatizar", health: "degraded", priority: 74, control: "Lectura pendiente" },
    { name: "Fundaciones y obra social", kind: "Privada abierta", scope: "Plataforma curada", status: "18 monitorizadas · 16 por verificar", health: "degraded", priority: 84, control: "Revisión humana" },
    { name: "Alertas federacion CV", kind: "Privada tenant", scope: "Tenant privado", status: "No conectada", health: "unknown", priority: 78, control: "Requiere aprobacion" },
    { name: "Documentos de la entidad", kind: "Privativa", scope: "Tenant privado", status: "Pendiente de autorización", health: "unknown", priority: 90, control: "Requiere aprobación" },
    { name: "Casos personales", kind: "Sensible", scope: "Bloqueada", status: "No se utiliza", health: "blocked", priority: 0, control: "Uso no permitido" }
  ],
  facts: [
    { label: "Actuacion CV", class: "Sugerido", text: "Dato propuesto para que la entidad lo confirme antes de usarlo en el analisis de encaje." },
    { label: "Programas de empleo", class: "Sin aprobar", text: "Puede venir de entrevista guiada, web publica autorizada o documentos seleccionados." },
    { label: "Acompanamiento individual", class: "Sin aprobar", text: "No se usa en borradores hasta que un admin de entidad lo apruebe." },
    { label: "Casos personales", class: "Bloqueado", text: "Historias identificables de beneficiarios excluidas del MVP." }
  ],
  governance: [
    { class: "Publico", use: "Analisis y redaccion", policy: "Permitido", tone: "safe" },
    { class: "Interno aprobado", use: "Analisis y borradores", policy: "Minimizar contexto", tone: "review" },
    { class: "Personal", use: "Solo requisitos formales", policy: "Anonimizar", tone: "warning" },
    { class: "Sensible", use: "No requerido", policy: "Bloqueado", tone: "danger" }
  ],
  reviewQueue: [
    { title: "Memoria 2025 - parrafo de impacto", detail: "Puede contener datos personales indirectos. Requiere anonimizar.", state: "Pendiente" },
    { title: "Presupuesto base de programa", detail: "Uso interno permitido para rangos agregados.", state: "Aprobar" }
  ],
  agents: [
    { name: "Busqueda de convocatorias", icon: "radar", purpose: "Localiza ayudas públicas y vigila convocatorias privadas abiertas.", access: "BDNS, portales oficiales y financiadores privados curados", status: "Listo" },
    { name: "Investigador de entidad", icon: "globe-2", purpose: "Analiza web publica y propone perfil, logo y temas.", access: "Web publica consentida", status: "Listo" },
    { name: "Asistente de encaje", icon: "git-compare-arrows", purpose: "Explica encaje, riesgos y datos faltantes.", access: "Publico + informacion validada", status: "Listo" },
    { name: "Control de datos", icon: "shield-check", purpose: "Aplica permisos, aislamiento y revisión humana antes de usar información.", access: "Solo datos y acciones autorizados", status: "Activo" },
    { name: "Revision documental", icon: "file-search", purpose: "Extrae requisitos, anexos y listas de comprobación.", access: "Bases y documentos", status: "Listo" },
    { name: "Preparación documental", icon: "folders", purpose: "Curador, selección privada y redactor: recupera para cada candidatura solo los hechos de la entidad pertinentes y aprobados.", access: "Bases, fuentes autorizadas y hechos aprobados", status: "Controlado" },
    { name: "Avisos y recordatorios", icon: "bell-ring", purpose: "Envia alertas y recordatorios por canal.", access: "Resumenes seguros", status: "Canales" }
  ],
  runs: [
    { agent: "Busqueda de convocatorias", detail: "Refresco BDNS/GVA simulado", time: "Hace 18 min" },
    { agent: "Investigador de entidad", detail: "Perfil publico pendiente de aprobacion humana", time: "Hace 16 min" },
    { agent: "Asistente de encaje", detail: "Recalculo encaje para 3 convocatorias", time: "Hace 14 min" },
    { agent: "Control de datos", detail: "Ejemplo de bloqueo de texto sensible", time: "Hace 9 min" }
  ],
  platformAlerts: [
    { title: "Revision de plazo pendiente", detail: "228 convocatorias publicas requieren interpretar el anuncio o las bases." },
    { title: "Fuente territorial con avisos", detail: "DOGV/BOP necesita revision del conector; no afecta a datos privados tenant." },
    { title: "Fuentes públicas actualizadas", detail: "Las oportunidades públicas están disponibles para todas las entidades sin mezclar información interna." }
  ],
  platformRuns: [
    { agent: "Busqueda de convocatorias", detail: "Revisión general de fuentes públicas" },
    { agent: "Revision de fuentes", detail: "Comprobación de procedencia, versiones y plazos" },
    { agent: "Coordinacion de entidades", detail: "1 entidad activa; solo estado, permisos y coste" }
  ],
  platformAgents: [
    { name: "Busqueda global", icon: "radar", purpose: "Mantiene actualizadas las oportunidades públicas y su procedencia.", access: "Fuentes públicas compartidas", status: "Listo" },
    { name: "Revision de fuentes", icon: "file-search", purpose: "Comprueba bases, plazos y procedencia antes de publicar cambios.", access: "Documentos públicos", status: "Revision" },
    { name: "Coordinacion de entidades", icon: "network", purpose: "Coordina altas, permisos y costes sin abrir información privada.", access: "Estado y permisos de cada entidad", status: "Controlado" },
    { name: "Politicas de acceso", icon: "shield-check", purpose: "Evita que una entidad acceda a información de otra.", access: "Permisos y registro de actividad", status: "Listo" }
  ],
  platformAudit: [
    { event: "Fuente BDNS sincronizada", actor: "Radar publico", time: "12:05", detail: "Operacion global sin datos privados.", info: "Evento de plataforma sobre una fuente publica reutilizable por todos los tenants." },
    { event: "Revision territorial programada", actor: "Superadmin plataforma", time: "12:08", detail: "DOGV/BOP; alcance platform-public.", info: "La accion afecta al conector publico y no recupera documentos de entidades." },
    { event: "Politica de aislamiento comprobada", actor: "Politicas de acceso", time: "12:12", detail: "Sin recuperación cruzada entre entidades.", info: "El administrador ve el estado de gobierno, pero no fragmentos ni borradores privados." },
    { event: "Tenant operativo verificado", actor: "Orquestador de tenants", time: "12:18", detail: "Novaterra; solo estado, plan y coste.", info: "Se auditan metadatos operativos del tenant sin mostrar sus fuentes, hechos internos o candidaturas." }
  ],
  checklist: [
    { item: "Confirmar beneficiario elegible", state: "done", action: "Ver evidencia", purpose: "Comprobar que la entidad cumple la forma jurídica, territorio y demás condiciones exigidas para solicitar la ayuda.", checks: "Requisitos de beneficiario, exclusiones y situación de la entidad.", evidence: "Bases oficiales citadas y perfil de entidad previamente aprobado.", doneWhen: "Una persona confirma cada condición y conserva su cita o evidencia." },
    { item: "Comprobar cofinanciación exigida", state: "review", action: "Revisar requisito", purpose: "Determinar si la convocatoria exige aportación propia o de terceros; no significa que exista cofinanciación obligatoria hasta confirmarlo en las bases.", checks: "Porcentaje mínimo o máximo, origen permitido, incompatibilidades y equilibrio del presupuesto.", evidence: "Apartado económico de las bases y, si procede, compromiso o prueba de financiación.", doneWhen: "La tasa y su origen quedan documentados y el presupuesto cuadra." },
    { item: "Preparar memoria técnica", state: "todo", action: "Preparar Word", purpose: "Construir el borrador narrativo del proyecto con la estructura requerida por la convocatoria.", checks: "Objetivos, actividades, población agregada, calendario, indicadores y coherencia presupuestaria.", evidence: "Bases vigentes y hechos internos aprobados para esta candidatura.", doneWhen: "Existe un Word trazable y una persona ha revisado sus datos pendientes." },
    { item: "Reunir certificados y poderes", state: "todo", action: "Añadir documentos", purpose: "Reunir los anexos que acreditan la situación de la entidad y la representación de quien firma.", checks: "Documentos obligatorios, vigencia, formato y correspondencia con el representante autorizado.", evidence: "Relación documental de las bases y archivos privados aportados por la entidad.", doneWhen: "Todos los anexos exigidos están vigentes, vinculados y revisados." },
    { item: "Comprobar límite de gastos de personal", state: "review", action: "Revisar requisito", purpose: "Confirmar cuánto gasto de personal admite la ayuda y cómo debe imputarse al proyecto.", checks: "Topes, costes elegibles, Seguridad Social, dedicación, periodo y exclusiones.", evidence: "Reglas presupuestarias y citas de las bases oficiales vigentes.", doneWhen: "El cálculo es reproducible, respeta los límites y queda revisado por una persona." }
  ],
  outline: [
    { title: "Resumen ejecutivo", text: "Proyecto de itinerarios de empleo inclusivo con formacion, acompanamiento y seguimiento." },
    { title: "Justificacion", text: "Necesidad territorial vinculada a empleabilidad de colectivos vulnerables y barreras de acceso." },
    { title: "Actividades", text: "Diagnostico, talleres formativos, intermediacion, tutorizacion y evaluacion." },
    { title: "Indicadores", text: "Participantes atendidos, finalizacion de itinerarios, inserciones y continuidad." }
  ],
  audit: [
    { event: "Fuente BDNS sincronizada", actor: "Radar público", time: "12:05", detail: "Operación sin datos privados.", info: "Registro basado en la última copia pública cargada. La fuente se actualiza sin usar información de la entidad." },
    { event: "Encaje recalculado", actor: "Asistente de encaje", time: "12:08", detail: "Uso de 3 datos internos aprobados.", info: "Evento simulado: todavia no hay motor de IA con fuentes reales. Muestra como quedaria trazado el uso de informacion aprobada cuando exista analisis automatico de encaje." },
    { event: "Fragmento bloqueado", actor: "Politicas de datos", time: "12:12", detail: "Posible dato personal indirecto.", info: "Evento simulado de seguridad: indica que un texto no deberia usarse para analisis de encaje ni borradores hasta que una persona lo revise o anonimice." },
    { event: "Checklist generado", actor: "Documentacion", time: "12:18", detail: "Pendiente de revision humana.", info: "Evento simulado: representa la generacion de tareas de candidatura a partir de bases y evidencias. No equivale a una solicitud presentada." }
  ],
  operationsJobs: [
    { title: "Carpeta privada", detail: "Leídos 4 documentos aprobados, 1 bloqueado por privacidad, 0 errores", state: "Completado" },
    { title: "Boletines DOGV/BOP", detail: "2 convocatorias tienen plazo relativo y necesitan revision humana", state: "Atencion" },
    { title: "Politica coste IA radar", detail: "IA maxima diaria por campana; deteccion hash/etag sin IA antes de interpretar", state: "OK" },
    { title: "Conservacion de originales", detail: "12 documentos guardados con huella para poder demostrar procedencia", state: "OK" }
  ],
  operationsHealth: [
    { title: "Radar publico", detail: "Responde con normalidad; 0 errores en 24h", state: "OK" },
    { title: "Encaje de oportunidades", detail: "3 recomendaciones marcadas con baja confianza para revisar", state: "OK" },
    { title: "BDNS", detail: "Última lectura pública disponible", state: "OK" },
    { title: "Microsoft 365 / SharePoint", detail: "Pendiente de conectar credenciales de la entidad", state: "Pendiente" }
  ],
  tenants: [
    { title: "Novaterra", slug: "novaterra-demo", detail: "piloto activo - estado de agentes consultable por tenant", state: "Activa" }
  ],
  platformCampaigns: [
    { title: "Radar publico estatal", detail: "BDNS/SNPSAP: cambios, evidencias y versiones reutilizables", cron: "0 6 * * *", trigger: "requiere motivo", costPolicy: "IA solo si cambio", budget: "3 EUR/dia", state: "Activa" },
    { title: "Radar territorial CV", detail: "DOGV/BOP/GVA/LABORA con avisos por plazo relativo", cron: "0 7 * * *", trigger: "manual si hay urgencia", costPolicy: "IA max diaria", budget: "2 EUR/dia", state: "Atencion" },
    { title: "Privadas abiertas", detail: "Fundaciones, bancos, obra social, RSC y federaciones", cron: "0 7 * * 1", trigger: "curacion previa", costPolicy: "IA diaria solo si live", budget: "1 EUR/dia", state: "Pendiente" }
  ]
};
