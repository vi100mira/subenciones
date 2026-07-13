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
| Políticas de datos | Clasificar fragmentos internos y bloquear usos inseguros | Metadatos y fragmentos aportados | Para aprobar contexto interno |
| Agente documental | Extraer requisitos y preparar paquetes documentales tenant-scoped | Bases públicas y hechos internos aprobados | Antes de activar proyecto y exportar |
| Agente redactor | Crear esquemas y borradores ajustados a límites oficiales | Evidencia pública y hechos internos aprobados | Antes de exportar o compartir |
| Agente de avisos | Producir alertas y recordatorios | Resúmenes de encaje y plazos | Antes de enviar por un canal no público |

## Responsabilidades del orquestador

- Autenticar a la persona y resolver el tenant.
- Comprobar permisos, consentimiento y política de datos.
- Elegir el agente adecuado.
- Adjuntar evidencia oficial y su versión.
- Registrar cada ejecución y evento de auditoría.
- Recalcular el impacto en tenants cuando cambia una convocatoria.
- Entregar respuestas adecuadas al canal sin exponer contexto privado.

## Ciclo del agente redactor

1. `POST /api/draft-agent-runs` valida que convocatoria, versión y plazo estén vigentes.
2. Requiere restricciones de redacción verificadas. Si no existen, no encola.
3. Si se solicitan hechos internos, exige consentimiento `ai_processing` y referencias aprobadas.
4. La API guarda identificadores, clases permitidas y huellas; no persiste un prompt ni texto interno.
5. El worker programado cada cinco minutos vuelve a comprobar versión, plazo, consentimiento y restricciones.
6. Sin proveedor autorizado, deja la ejecución en `awaiting_provider`; nunca simula una respuesta de IA.
7. Con proveedor y clave instalados, la integración produce salida JSON estructurada, valida límites y queda en `review_required`.
8. Ningún agente puede presentar, enviar o compartir externamente sin aprobación humana.

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
- OpenAI está autorizado para evidencia pública con `store: false` y presupuesto de 20 € al mes. La generación permanece detenida en `awaiting_provider` porque la clave no está instalada en GitHub.
