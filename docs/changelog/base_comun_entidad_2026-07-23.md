# Base común de la entidad · 2026-07-23

## Intención

Hacer visible y comprensible el corpus privado que se reutiliza entre proyectos y candidaturas, separado de los borradores específicos de cada expediente.

## Cambios

- Nueva entrada `Base común` para entidades con preparación documental contratada.
- Pantalla con documentación fuente, hechos aprobados, pendientes y ciclo de evolución.
- Los accesos desde plantillas y desde el plan conducen a la base común.
- El visor distingue explícitamente el borrador de candidatura del corpus reutilizable.

## Verificación y límites

- Guardrails de conocimiento privado y planes, TypeScript y navegador local.
- No se modifica la persistencia: los documentos siguen tenant-scoped y solo los hechos aprobados se reutilizan.
