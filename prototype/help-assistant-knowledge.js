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
    steps: ["Extrae beneficiarios y finalidad.", "Identifica documentos y presentación.", "Conserva URL, hash y páginas.", "Una persona revisa y aprueba las citas."],
    caution: "Una referencia incompleta o un formulario que exige identificación mantiene el control humano."
  },
  {
    id: "candidature", title: "Preselección y candidatura", screens: ["candidature", "opportunities"],
    keywords: ["preseleccion", "candidatura", "descartar", "expediente", "elegir", "activar"],
    summary: "Preseleccionar significa estudiar una oportunidad; abrir expediente significa empezar a organizarla. Ninguna de las dos acciones presenta la subvención.",
    steps: ["Compara resultados.", "Preselecciona o descarta.", "Abre expediente si interesa.", "Revisa bases y plan documental."],
    caution: "Las decisiones y descartes quedan en auditoría y pueden justificarse."
  },
  {
    id: "drafting", title: "Documentos y agente redactor", screens: ["candidature", "agents"],
    keywords: ["redactar", "borrador", "word", "docx", "pdf", "documento", "memoria"],
    summary: "El redactor prepara borradores trazables y separa lo que debe aportar o completar una persona.",
    steps: ["Recibe requisitos aprobados.", "Redacta memoria y anexos permitidos.", "Separa modelos oficiales, evidencias y declaraciones.", "Genera una salida privada para revisión."],
    caution: "La exportación exige aprobar el hash; no hay firma ni envío automático."
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
    keywords: ["cola", "encolado", "procesando", "error", "completado", "estado", "parpadeo"],
    summary: "Los agentes trabajan de forma asíncrona: una acción puede quedar en cola y terminar más tarde.",
    steps: ["En cola: trabajo aceptado.", "Procesando: consumidor activo.", "Pendiente de revisión: necesita decisión.", "Bloqueado o Error: requiere acción.", "Completado: resultado disponible."],
    caution: "Encolado no significa terminado; la pantalla conserva el último estado estable al refrescar."
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
