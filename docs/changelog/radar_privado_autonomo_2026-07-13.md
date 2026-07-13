# Radar privado autónomo · 2026-07-13

## Intención

Cerrar el ciclo diario de financiadores privados públicos desde el planificador hasta las alertas por entidad.

## Archivos modificados

- `api/platform-radar-schedule.ts`: encola la campaña privada con clave diaria idempotente.
- `scripts/workers/run-private-funder-radar.mjs`: reclama la cola, rastrea, aplica evidencia, importa, detecta cambios y genera alertas.
- `scripts/platform/import-open-funders.mjs`: conserva la versión vigente para que el monitor pueda comparar cambios reales.
- `scripts/platform/detect-open-funder-changes.mjs`: acepta el catálogo enriquecido de cada campaña.
- `scripts/workers/run-municipal-radar-scheduled.ps1`: ejecuta también el worker privado.

## Verificación prevista

- Estabilidad completa y sintaxis del lanzador programado.
- Campaña privada real en Supabase con transición `queued → running → completed`.
- Ninguna convocatoria se activa sin estado abierto, cierre y evidencia oficial suficiente.

## Riesgos residuales

- El ciclo sigue dependiendo del equipo Windows que ejecuta la tarea programada.
- Las webs que bloquean el rastreo o expresan fechas de forma no estructurada quedan para revisión humana.
