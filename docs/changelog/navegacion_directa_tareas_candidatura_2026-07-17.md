# Navegación directa desde tareas de candidatura — 2026-07-17

## Intención

Hacer que cada acción del plan documental abra no solo el expediente correcto, sino también la pestaña exacta donde debe continuar el trabajo.

## Cambios

- `prototype/opportunity-requirements.js`: conserva la pestaña objetivo durante todos los renderizados del expediente y elimina la dependencia de temporizadores.
- Las acciones abren directamente: evidencia en `Análisis`, requisitos económicos en `Checklist`, memoria en `Borrador` y anexos en `Documentos`.
- `scripts/guardrails/check-tenant-plan-ui.mjs`: recorre los cuatro destinos y exige que botón y panel nazcan activos.
- `scripts/guardrails/check-tenant-match-contract.mjs`: bloquea regresiones al antiguo cambio de pestaña por temporizadores.

## Privacidad y control

El cambio solo afecta a navegación local. No abre fuentes nuevas, no mueve archivos privados y no modifica estados de revisión.

## Verificación

- Sintaxis y `npm run typecheck`: superados.
- `npm run check:tenant-match`: superado.
- `npm run check:tenant-plan-ui`: navegación directa por Análisis, Checklist, Borrador y Documentos superada.
- `npm run check:stability`: superado.
