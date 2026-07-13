# Métricas superadmin sin fallback tenant — 2026-07-13

## Intención

Evitar que el panel de plataforma muestre temporalmente cifras de Novaterra cuando el estado global todavía está cargando o la API administrativa no está disponible.

## Archivos

- `prototype/app.js`: usa etiquetas globales y valores neutros durante la carga superadmin, y oculta la acción global simulada desde el primer render.
- `scripts/guardrails/check-platform-superadmin-ui.mjs`: verifica también el comportamiento cuando falla el endpoint global.

## Verificación

- Guardrail superadmin con respuesta real del endpoint.
- Guardrail superadmin forzando un error del endpoint global.

## Riesgo residual

Si la API no responde, las métricas quedan deliberadamente sin cifra (`—`) y se mantiene el aviso de error; no se sustituyen por datos de ningún tenant.
