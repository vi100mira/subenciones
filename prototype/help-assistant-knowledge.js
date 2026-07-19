window.INSERTIA_HELP_TOPICS = [
  {
    id: "overview", title: "Cómo funciona INSERTIA", screens: ["welcome", "dashboard"],
    keywords: ["funciona", "empezar", "inicio", "proceso", "ciclo", "insertia"],
    summary: "INSERTIA busca convocatorias en fuentes públicas y financiadores privados autorizados, explica su encaje para cada entidad y ayuda a preparar el expediente con evidencia trazable.",
    steps: ["El radar incorpora convocatorias.", "El encaje usa el perfil aprobado.", "Una persona preselecciona.", "Se revisan bases y documentos.", "El borrador termina en revisión humana."],
    caution: "La aplicación no decide la elegibilidad legal, no firma y no presenta solicitudes."
  },
  {
    id: "registration", title: "Registrar una entidad", screens: ["welcome"],
    keywords: ["registrar", "alta", "entidad", "cuenta", "acceso", "entrar"],
    summary: "El alta crea un espacio aislado para la entidad. La solicitud no publica información ni crea automáticamente usuarios con permisos amplios.",
    steps: ["Completa los datos de la entidad.", "La plataforma valida la solicitud.", "El administrador recibe el acceso asignado.", "Después se revisa el perfil."],
    caution: "Cada entidad es un tenant separado; NovaTerra es solo el caso piloto."
  },
  {
    id: "profile", title: "Perfil y análisis de la web", screens: ["entity", "agents"],
    keywords: ["perfil", "web", "consentimiento", "investigar", "sugerencias", "logo"],
    summary: "El investigador puede proponer territorio, actividades, colectivos y logotipo a partir de la web pública, únicamente si existe consentimiento.",
    steps: ["Autoriza o rechaza el análisis público.", "Revisa cada sugerencia.", "Acepta o descarta con su evidencia.", "Aprueba el perfil que utilizará el encaje."],
    caution: "Sin consentimiento no se rastrea la web; el perfil puede completarse manualmente."
  },
  {
    id: "radar", title: "Búsqueda de convocatorias", screens: ["opportunities", "dashboard"],
    keywords: ["buscar", "radar", "convocatoria", "subvencion", "nueva", "cron", "periodicidad"],
    summary: "Los radares consultan fuentes públicas y fuentes privadas autorizadas mediante campañas periódicas, normalizan resultados y conservan la evidencia y procedencia disponible.",
    steps: ["La campaña consulta las fuentes configuradas.", "Distingue la procedencia pública o privada y sus condiciones de acceso.", "Deduplica y versiona.", "Localiza bases y plazos.", "Publica solo resultados que superan su control de evidencia."],
    caution: "La cobertura es amplia pero no universal; una fuente degradada o sin evidencia suficiente queda visible para revisión. El perfil y los documentos privados de cada entidad no se comparten ni se usan como fuente pública."
  },
  {
    id: "matching", title: "Qué significa el encaje", screens: ["opportunities", "agents"],
    keywords: ["encaje", "prioridad", "puntuacion", "relevante", "recomienda", "resultado"],
    summary: "El encaje compara una convocatoria con el perfil aprobado de la entidad y explica razones, riesgos y datos faltantes.",
    steps: ["Comprueba territorio y tipo de entidad.", "Compara actividades y colectivos.", "Señala requisitos y exclusiones.", "Muestra la evidencia y los hechos usados."],
    caution: "La puntuación orienta; una persona decide si continúa."
  },
  {
    id: "bases", title: "Revisión de las bases", screens: ["opportunities", "candidature", "agents"],
    keywords: ["bases", "requisitos", "anexo", "formulario", "documentacion", "sia"],
    summary: "La aplicación localiza y versiona bases, anexos y fichas oficiales antes de permitir la preparación documental.",
    steps: ["Extrae beneficiarios y finalidad.", "Identifica documentos y presentación.", "Conserva URL, hash y páginas.", "La entidad solicita la revisión cuando la necesita.", "Un analista de plataforma verifica y aprueba las citas compartidas."],
    caution: "Una entidad no puede aprobar unas bases globales para las demás. Si la lectura sigue en cola o las citas no están verificadas, la redacción permanece bloqueada. La solicitud y su fecha se recuperan desde auditoría al recargar; tras 24 horas puede enviarse un recordatorio si sigue pendiente."
  },
  {
    id: "candidature", title: "Preselección y candidatura", screens: ["candidature", "opportunities"],
    keywords: ["preseleccion", "candidatura", "descartar", "expediente", "elegir", "activar", "cofinanciacion", "beneficiario", "certificados", "tareas"],
    summary: "Preseleccionar significa estudiar una oportunidad; abrir expediente crea un plan de tareas para dejar su documentación preparada. Ninguna de las dos acciones presenta la subvención.",
    steps: ["Compara resultados.", "Preselecciona o descarta.", "Abre expediente si interesa.", "Consulta el punto de información de cada tarea para saber qué comprobar, qué evidencia falta y cuándo puede cerrarla una persona.", "Prepara borradores y anexos para revisión."],
    caution: "Las decisiones y descartes quedan en auditoría y pueden justificarse."
  },
  {
    id: "drafting", title: "Documentos y agente redactor", screens: ["candidature", "agents"],
    keywords: ["redactar", "borrador", "word", "docx", "pdf", "documento", "memoria"],
    summary: "El redactor prepara borradores trazables y separa lo que debe aportar o completar una persona.",
    steps: ["Pre-rellena sin IA los campos que ya constan en la convocatoria y marca con claridad los que carecen de evidencia.", "Recibe requisitos aprobados.", "Redacta memoria y anexos permitidos.", "El visor sustituye el contenido orientativo por la versión generada documento a documento.", "Separa modelos oficiales, evidencias y declaraciones.", "Genera una salida privada para revisión."],
    caution: "La exportación exige aprobar el hash; no hay firma ni envío automático."
  },
  {
    id: "progressive_knowledge", title: "Conocimiento progresivo de la entidad", screens: ["entity", "agents", "candidature"],
    keywords: ["aprende", "aprendizaje", "automejora", "mejora", "proyectos", "curador", "plantilla maestra", "conocimiento progresivo"],
    summary: "Preparación documental tiene dos capacidades: el curador propone conocimiento reutilizable desde fuentes autorizadas y el redactor lo usa después de su aprobación humana.",
    steps: ["Gestiona Preparación documental desde Asistentes; la tarjeta muestra el estado, la fecha, el resultado y las llamadas de IA de la última ejecución.", "Elige una vía: analizar proyectos autorizados o completar el formulario guiado.", "La carpeta local, Drive o SharePoint pasa primero una criba sin IA: una fuente vacía o sin formatos útiles se bloquea; una muy pequeña exige confirmación.", "Para una fuente local, selecciona primero la carpeta en el dispositivo; esa acción basta para solicitar el inventario y la ruta completa no se guarda.", "El análisis prepara en el equipo un índice de texto en cuarentena aunque existan propuestas pendientes; sus fragmentos no están activos para redactar.", "Cuando termina, pulsa Gestionar conocimiento. La pantalla separa documentos analizados, propuestas pendientes, hechos disponibles y archivo histórico no activo.", "Revisar propuestas permite aprobar o descartar cada dato. Guardar una aprobación lo deja disponible para nuevas versiones documentales del mismo tenant, pero nunca modifica silenciosamente un Word ya creado.", "Actualizar análisis sirve solo para volver a leer voluntariamente la fuente; no es necesario repetirlo para revisar lo ya encontrado.", "En la pestaña Borrador, Generar borrador personalizado crea la primera versión. Si existe un borrador y hay hechos aprobados disponibles, Regenerar con conocimiento aprobado crea otra versión y conserva la anterior para comparación y auditoría.", "También puedes iniciar la misma generación desde Ver documento cuando el visor indique que solo existe un esqueleto. La acción regenera el conjunto documental de la candidatura, incluido el documento abierto; no crea un flujo independiente.", "Si las bases o los límites siguen pendientes, la acción aparece bloqueada e indica exactamente qué revisión debe completarse primero.", "En cada candidatura, la recuperación privada compara la convocatoria con la plantilla maestra y recupera solo los hechos aprobados pertinentes; la pantalla indica cuántos examinó y utilizó.", "El redactor recibe únicamente esa selección mínima y mantiene las referencias de evidencia."],
    caution: "Preparar no significa activar: la revisión humana bloquea el uso, no la extracción local. La recuperación actual realiza 0 llamadas de IA; la generación sí puede consumir IA. No entrena un modelo compartido y no cruza datos entre tenants. La vectorización semántica exige elegir un modelo local o autorizar por separado un proveedor externo."
  },
  {
    id: "changes", title: "Nuevas convocatorias y cambios", screens: ["dashboard", "opportunities", "audit"],
    keywords: ["cambio", "actualiza", "version", "plazo", "alerta", "nuevas", "modificada"],
    summary: "Una convocatoria nueva se incorpora al radar; un cambio crea una versión y avisa solo a las entidades afectadas.",
    steps: ["Compara identificador, campos y hash.", "Conserva la versión anterior.", "Recalcula el encaje afectado.", "Invalida borradores que usan requisitos antiguos."],
    caution: "Los cambios críticos siempre vuelven a revisión humana."
  },
  {
    id: "async", title: "Estados de los trabajos", screens: ["agents", "operations", "dashboard"],
    keywords: ["cola", "encolado", "procesando", "error", "completado", "estado", "parpadeo", "ejecucion", "cron", "manual", "ultima", "proxima", "quien"],
    summary: "Cada tarjeta de Asistentes indica si la capacidad es programada, manual o se activa por expediente, además de su última ejecución, estado, actor y siguiente momento previsto.",
    steps: ["Modo indica qué dispara la capacidad; no implica que todos los agentes tengan un cron.", "Última muestra fecha, resultado y quién solicitó la ejecución.", "Próxima explica la programación real o la acción humana necesaria.", "La auditoría registra cola, inicio, resultado para revisión y fallo.", "El radar público puede ser periódico; encaje, revisión y preparación conservan sus puertas humanas."],
    caution: "Encolado no significa terminado. La preparación con datos privados nunca se lanza por un cron silencioso ni firma, envía o presenta documentos."
  },
  {
    id: "privacy", title: "Privacidad y control de datos", screens: ["entity", "audit", "welcome"],
    keywords: ["privacidad", "datos", "rgpd", "sensible", "permiso", "tenant", "seguridad"],
    summary: "Las convocatorias públicas se comparten en la plataforma; el perfil, documentos y borradores privados permanecen aislados por entidad.",
    steps: ["Clasifica la información.", "Usa solo hechos aprobados.", "Minimiza el contexto enviado a IA.", "Registra accesos, generaciones y exportaciones."],
    caution: "No introduzcas credenciales, expedientes personales ni datos sensibles de beneficiarios en esta guía."
  },
  {
    id: "audit", title: "Auditoría y revisión humana", screens: ["audit", "candidature"],
    keywords: ["auditoria", "historial", "aprobar", "revision", "quien", "evidencia"],
    summary: "La auditoría explica quién hizo qué, sobre qué tenant, versión y evidencia.",
    steps: ["Revisa la fuente y su versión.", "Comprueba los hechos usados.", "Registra aceptación o descarte.", "Aprueba únicamente una salida inmutable."],
    caution: "Cambiar la fuente, los requisitos o el borrador invalida la aprobación anterior."
  }
];
