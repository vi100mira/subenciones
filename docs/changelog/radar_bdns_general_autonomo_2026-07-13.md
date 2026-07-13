# Radar BDNS general autónomo · 2026-07-13

## Intención

Cerrar el ciclo diario del radar social general reutilizando la cola, el worker y las puertas de evidencia del radar municipal.

## Archivos modificados

- `api/platform-radar-schedule.ts`: encola campañas diarias e idempotentes para los radares municipal y general.
- `scripts/workers/run-municipal-radar.mjs`: admite ambas campañas sin duplicar el pipeline.
- `scripts/workers/run-municipal-radar-scheduled.ps1`: consume en secuencia las dos colas desde la tarea programada.
- `scripts/radar/fetch-bdns-latest.mjs`: añade la búsqueda social general sin limitarla a un tipo de administración.
- `package.json`: expone el comando del worker general.

## Verificación prevista

- Tipado TypeScript y comprobaciones de estabilidad.
- Ejecución local en seco de una muestra del radar general.
- Campaña real encolada y consumida antes de declarar el ciclo productivo.

## Riesgos residuales

- El consumidor sigue dependiendo del equipo Windows programado, aunque una sola tarea ejecuta ya ambos workers.
- La campaña diaria recorre las primeras páginas configuradas. El cursor incremental por página queda pendiente para cobertura exhaustiva.
