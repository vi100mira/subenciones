# Controles de recuperación tenant · 2026-07-13

## Intención

Hacer operable la reconstrucción sin depender de llamadas API manuales.

## Cambio

- La consola permite exportar un blueprint con huella.
- Crea estructura tenant usando un propietario Auth existente.
- Expone activar, archivar y restaurar con motivo obligatorio.
- No concede consentimientos, crea usuarios ni realiza borrado definitivo.

## Verificación

- `npm run check:runtime-truth`
- `npm run check:ui`
- `npm run check:line-budgets`
- `npm run typecheck`

## Riesgo residual

- Producción debe aplicar las migraciones y desplegar estas APIs antes de usar los controles.
