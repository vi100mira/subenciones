# Estabilidad del refresco de encaje

Fecha: 2026-07-14

## Intención

Eliminar el parpadeo periódico entre los estados genéricos y los estados persistidos de los asistentes mientras se comprueba la finalización de un encaje.

## Cambios

- El sondeo del encaje deja de reconstruir todas las vistas de la aplicación.
- Un cambio de recomendaciones actualiza únicamente Panel y Oportunidades.
- El estado del encaje y las recomendaciones solo se publican cuando su firma cambia.
- Las tarjetas de Asistentes conservan el estado operativo persistido durante el sondeo.
- Se actualizan las versiones de los scripts para evitar que el navegador mezcle archivos antiguos y nuevos.

## Archivos

- `prototype/tenant-recommendations-runtime.js`
- `prototype/tenant-agent-runtime.js`
- `prototype/app.js`
- `prototype/ui-polish.js`
- `prototype/index.html`
- `scripts/guardrails/check-runtime-truth-ui.mjs`

## Verificación

- `npm run check:runtime-truth`
- `npm run check:tenant-match`
- `npm run typecheck`
- `npm run check:line-budgets`
- Navegador local recargado con las cuatro versiones `20260714-stable-match-refresh`, sin errores de consola.
- El control de regresión impide que el sondeo invoque el refresco global o publique estados sin cambios.

## Riesgo residual

- El sondeo continúa cada cinco segundos mientras se consulta Asistentes u Oportunidades, pero no modifica el DOM cuando el servidor devuelve el mismo estado.
