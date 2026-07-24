# Preparación documental con conocimiento progresivo

## Intención

Explicar y registrar una sola capacidad contratada que mejora los borradores del tenant sin convertir la memoria privada en entrenamiento autónomo o compartido.

## Cambios

- `draft_agent` mantiene su clave y permisos, y declara dos especialidades internas: `tenant_knowledge_curator` y `document_drafter`.
- Entidad muestra qué hace cada especialidad y el ciclo `fuente autorizada → propuesta → revisión → hecho maestro → mejor borrador`.
- Asistentes y Plan usan el nombre único `Preparación documental`.
- La Guía local responde sobre proyectos, aprendizaje, automejora, curador y plantilla maestra sin consultar datos del tenant.
- La especificación funcional y la arquitectura aclaran que no hay entrenamiento compartido, autoaprobación ni presentación automática.

## Privacidad

- No cambian las clases permitidas: `public` e `internal_approved`.
- Las fuentes privadas siguen requiriendo consentimiento, aislamiento y solo lectura.
- Las correcciones generan propuestas; una persona debe aprobarlas antes de su reutilización.

## Verificación

- `npm run typecheck`.
- `npm run check:help-assistant`.
- `npm run check:tenant-agents`.
- `npm run check:private-knowledge`.
- `npm run check:tenant-plan-ui` y revisión visual.
- `npm run check:stability`.
- La Guía responde a `¿El agente aprende de los proyectos del tenant?` con el tema de conocimiento progresivo y sus límites.
- Las dos capacidades se muestran en una columna en móvil y sin desbordamiento horizontal.
