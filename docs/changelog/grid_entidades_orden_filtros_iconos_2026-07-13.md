# Grid de entidades con orden, filtros e iconos — 2026-07-13

## Intención

Preparar la administración de entidades para volúmenes mayores siguiendo el patrón compacto de Oportunidades.

## Archivos

- `prototype/tenant-grid.js`: renderiza organizaciones reales, orden, filtros, estado vacío y acciones accesibles con iconos.
- `prototype/app.js` y `prototype/platform-runtime.js`: conectan el fallback y el estado global persistido al grid.
- `prototype/stitch-theme.css`: añade cabecera y filtros adhesivos, acciones compactas y adaptación móvil.
- `scripts/guardrails/check-platform-superadmin-ui.mjs`: verifica filas, orden, filtros, iconos y responsive.

## Verificación

- Orden ascendente/descendente por entidad, estado y control.
- Filtros por entidad, estado y control; selector de orden disponible en móvil.
- Acciones con nombre accesible y estados no aplicables deshabilitados.

## Riesgo residual

Orden y filtros son locales sobre el conjunto recibido; cuando existan miles de entidades deberán trasladarse a paginación y consulta servidoras.
