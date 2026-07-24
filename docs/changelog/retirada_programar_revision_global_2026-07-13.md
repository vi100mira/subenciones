# Retirada de “Programar revisión” global — 2026-07-13

## Intención

Eliminar un control redundante que no creaba ni guardaba ninguna campaña y confundía con la programación individual de cada radar.

## Archivos

- `prototype/index.html`: retira el botón global del HTML inicial.
- `prototype/ux-actions.js`: elimina el aviso simulado asociado.
- `prototype/platform-runtime.js`: elimina la limpieza defensiva que ya no es necesaria.
- `scripts/guardrails/check-platform-superadmin-ui.mjs`: comprueba que tampoco reaparezca cuando falla la API global.

## Verificación

- “Guardar cron” y “Ejecutar ahora” permanecen disponibles en cada radar.
- El botón global no aparece ni con datos reales ni en el fallback.

## Riesgo residual

Ninguno conocido; no se modifica la programación persistida ni se ejecutan campañas.
