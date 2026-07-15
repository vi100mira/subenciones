# Acciones de cabecera por pantalla

Fecha: 2026-07-14

## Intención

- Mostrar `Nueva busqueda` solo en Oportunidades.
- Mostrar `Actualizar` únicamente en Oportunidades, Asistentes, Auditoría y Operaciones.

## Archivos

- `prototype/app.js`: política visible de acciones por pantalla.
- `prototype/public-entry.js`: no restablece una acción global al iniciar sesión.
- `scripts/guardrails/check-opportunity-grid-ui.mjs`: verificación estática de la política.

## Verificación

- `npm run check:ui` y `npm run typecheck` superan correctamente.

## Riesgo residual

- La acción visible de actualizar conserva su comportamiento actual; este cambio solo limita dónde se ofrece.
