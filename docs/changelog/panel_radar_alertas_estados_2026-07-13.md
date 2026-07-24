# Radar y alertas del panel · 2026-07-13

## Intención

Concentrar el panel en información operativa útil, sin duplicar la auditoría, y hacer que los colores del radar representen el estado real de cada fuente.

## Archivos modificados

- `prototype/index.html`: elimina Situación actual y Actividad de asistentes, y coloca Alertas recientes a la derecha del radar.
- `prototype/app.js` y `prototype/mock-data.js`: retiran la actividad duplicada y clasifican Fundaciones y obra social como seguimiento con avisos por revisión humana.
- `prototype/styles.css`: elimina el borde morado asociado al tipo privado; el color depende solo del estado.
- `scripts/guardrails/check-runtime-truth-ui.mjs`: protege la nueva composición compacta del panel.
- `prototype/runtime-truth.js`: eliminado porque solo inyectaba los dos bloques descartados.

## Verificación

- `node --check prototype/app.js` y `node --check prototype/mock-data.js`.
- `npm run check:runtime-truth` y `npm run check:line-budgets`.
- Revisión en navegador local: sin Situación actual ni Actividad de asistentes, Fundaciones y obra social con clase `warning` y color ámbar, y sin avisos ni errores de consola.
- La cuadrícula mantiene radar y alertas en dos columnas por encima de 1280 px y las apila en pantallas más estrechas.

## Riesgo residual

- El estado ámbar resume que el radar privado funciona con revisión humana; no mide por sí solo la frescura individual de los 15 financiadores.
