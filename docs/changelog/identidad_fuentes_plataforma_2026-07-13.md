# Identidad de fuentes de plataforma · 2026-07-13

## Intención

Evitar que el planificador cree otra fuente privada en cada ejecución y preservar las campañas ya registradas.

## Archivos modificados

- `api/platform-radar-schedule.ts`: busca la fuente con el tipo real de cada radar.
- `scripts/workers/run-private-funder-radar.mjs`: reclama únicamente la fuente agregadora privada correcta.
- `supabase/migrations/20260713121500_platform_source_identity.sql`: reasigna campañas, elimina duplicados y exige unicidad por tipo y URL.

## Verificación realizada

- La migración remota dejó una sola fuente agregadora privada y conservó la campaña diaria.
- El Programador de tareas consumió la campaña privada y terminó con código `0`.
- El radar privado examinó 15 financiadores: `0` oportunidades vivas, `15` bloqueadas o en observación y `0` fallos.
- `npm run check:stability` y el escaneo de secretos terminaron correctamente.

## Riesgo residual

- La identidad depende de una URL canónica estable; un cambio intencional de URL crea una fuente nueva y debe revisarse.
