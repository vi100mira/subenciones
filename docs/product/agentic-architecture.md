# Arquitectura de agentes

## Principio

Los agentes son servicios con permisos, no cajas negras autónomas. Cada agente tiene alcance, clases de datos permitidas, herramientas, contrato de salida y rastro de auditoría.

## Agentes del MVP

| Agente | Finalidad | Acceso a datos | Puerta humana |
| --- | --- | --- | --- |
| Buscador de convocatorias | Encontrar y actualizar convocatorias | Fuentes públicas | No |
| Monitor de cambios | Detectar cambios de plazo, criterios, documentos, presupuesto y presentación | Evidencia pública o curada de plataforma | Los cambios críticos quedan pendientes de revisión |
| Investigador de entidad | Analizar la web pública y proponer hechos, logotipos y temas | Web pública con consentimiento explícito | Antes de aprobar hechos |
| Asistente de encaje | Explicar encaje, riesgos y datos ausentes | Convocatorias públicas y perfil aprobado | Antes de iniciar una candidatura |
| Control de datos (transversal, no agente) | Autorizar o bloquear capacidades según permisos, consentimiento y clase de datos | Metadatos, alcance del consentimiento y referencias aprobadas | Para aprobar contexto interno y cualquier uso externo |
| Preparación documental | Curar conocimiento privado aprobado y preparar paquetes y borradores tenant-scoped | Bases públicas; fuentes privadas autorizadas; hechos internos aprobados | Antes de aprobar hechos, activar proyecto y exportar |
| Agente de avisos | Producir alertas y recordatorios | Resúmenes de encaje y plazos | Antes de enviar por un canal no público |

## Responsabilidades del orquestador

- Autenticar a la persona y resolver el tenant.
- Comprobar permisos, consentimiento y política de datos.
- Elegir el agente adecuado.
- Adjuntar evidencia oficial y su versión.
- Registrar cada ejecución y evento de auditoría.
- Recalcular el impacto en tenants cuando cambia una convocatoria.
- Entregar respuestas adecuadas al canal sin exponer contexto privado.

## Política de ejecución visible

| Capacidad | Disparador permitido | Lo que ve el analista |
| --- | --- | --- |
| Radar público | Cron de plataforma diario (05:15 UTC) u operación de plataforma | modo programado y próximo ciclo |
| Investigador de entidad | Acción humana sobre la web consentida | fecha, resultado y persona solicitante |
| Encaje | Acción humana tras aprobar el perfil | cola autorizada; el consumidor de 15 minutos no crea ejecuciones |
| Revisión documental | Evento de expediente o cambio de bases | expediente que originó la ejecución y estado de revisión |
| Preparación documental | Acción humana con fuente privada o formulario | último análisis, actor y posibilidad de actualizarlo |
| Avisos | Programación del canal cuando esté activo | programación efectiva o aviso de que falta activar el canal |

La API registra al solicitante humano en `.queued`; el worker registra `.started`, el resultado `generated_for_review` y `.failed`. Esos eventos se almacenan por tenant en `audit_events`. Un cron de recuperación puede consumir una cola autorizada, pero nunca crea por sí solo una ejecución privada, un encaje o un borrador.

## Ciclo del agente redactor

1. `POST /api/draft-agent-runs` valida que convocatoria, versión y plazo estén vigentes.
2. Requiere restricciones de redacción verificadas. Si no existen, no encola.
3. Si se solicitan hechos internos, exige consentimiento `ai_processing` y referencias aprobadas.
4. La API guarda identificadores, clases permitidas y huellas; no persiste un prompt ni texto interno.
5. La API despierta al worker al recibir una solicitud; un cron cada quince minutos recupera trabajos que no pudieron despacharse.
6. Sin proveedor autorizado, deja la ejecución en `awaiting_provider`; nunca simula una respuesta de IA.
7. Con proveedor y clave instalados, la integración produce salida JSON estructurada, valida límites y queda en `review_required`.
8. Ningún agente puede presentar, enviar o compartir externamente sin aprobación humana.

## Conocimiento progresivo del tenant

`draft_agent` es una sola capacidad contratada con dos especialidades internas. El **curador de conocimiento** inventaría fuentes privadas autorizadas, detecta hechos reutilizables, vigencia y contradicciones, y crea propuestas con evidencia. El **redactor documental** consume exclusivamente hechos aprobados y requisitos versionados para preparar borradores.

La mejora procede de una plantilla maestra tenant-scoped y versionada, no de entrenar o modificar un modelo. Una corrección humana puede generar una nueva propuesta, pero nunca se reutiliza hasta ser aprobada. Los hechos, fragmentos, embeddings y decisiones no cruzan tenants.

La entrada operativa se gestiona desde **Asistentes > Preparación documental** y obliga a elegir una única vía por preparación: inventariar proyectos de una fuente privada autorizada o responder un formulario guiado. La pantalla **Entidad** solo explica la capacidad y sus límites; no aprueba fuentes ni ejecuta ingestas.

La fuente local del piloto se ejecuta mediante un puente local determinista y controlado por el operador. El puente reclama una sola ejecución encolada para el tenant y la fuente configurados, excluye contenido personal o sensible antes de proponer hechos, no usa IA externa y elimina los artefactos temporales. Conserva en `%LOCALAPPDATA%/Insertia/private-index` un índice FTS tenant-scoped en cuarentena; ningún fragmento queda activo ni llega al redactor hasta que una persona aprueba el hecho correspondiente. Supabase conserva métricas, huellas y metadatos mínimos de revisión documental —nombre, tipo, clasificación, recomendación y estado—, nunca rutas locales, contenido ni fragmentos. Solo después de una aprobación explícita el archivo completo puede copiarse a Vercel Blob privado bajo `tenants/{tenant_id}/annex-vault/{document_id}/{sha256}.{ext}`; la aplicación persiste únicamente el `pathname` privado y sirve descargas autenticadas. No es un agente autónomo ni un conector distribuible: Drive y SharePoint necesitan adaptadores con credenciales delegadas y alcance propio.

Antes de cualquier ingesta privada se ejecuta un **preflight sin IA** común a carpeta local, Google Drive y SharePoint. El adaptador entrega únicamente recuentos agregados de archivos compatibles y bytes; no rutas ni nombres. El servidor guarda el resultado en la fuente, audita bloqueo/advertencia/aceptación y rechaza la cola si el estado no es `ready` o `ready_limited`. El estado limitado solo se obtiene mediante confirmación humana explícita.

## Puerta de candidata a proyecto

Una candidata preseleccionada no es todavía un proyecto. Solo puede pasar a documentación después de generar y revisar:

- memoria técnica editable;
- PDF canónico validado contra páginas, tipografía e interlineado oficiales;
- checklist documental;
- índice de anexos y evidencias;
- guía presupuestaria;
- registro de decisiones y hechos internos utilizados;
- punteros de almacenamiento separados por tenant.

Si Drive no está contratado o autorizado, el agente debe indicarlo y trabajar únicamente con evidencia pública y hechos aprobados. El PDF canónico gobierna el máximo de páginas; el Word puede repaginarse de forma distinta según Office.

## Contexto del asistente de encaje

Antes de ordenar oportunidades, debe cargar territorio, forma jurídica, colectivos, programas, ámbito operativo, exclusiones y hechos aprobados del tenant. Las convocatorias fuera de territorio no se presentan como candidatas normales y las cerradas quedan como evidencia histórica.

## Adaptadores de canal

- Teams, WhatsApp y correo son adaptadores finos.
- Envían intención al orquestador y muestran respuestas breves.
- La evidencia completa, los hechos privados y la edición permanecen en la aplicación.
- Ningún adaptador contiene lógica de producto ni puede saltarse la aprobación humana.

## Estado actual

- Los tres radares son deterministas y autónomos; no necesitan un LLM para descubrir y verificar convocatorias.
- El agente redactor ya tiene API, cola Supabase, manifiesto mínimo, auditoría y worker asíncrono.
- OpenAI está autorizado para evidencia pública con `store: false` y presupuesto de 20 € al mes. La clave está instalada en GitHub; el despacho inmediato requiere una credencial de Actions server-only en Vercel.
