# Auditoría real por tenant, grid y Excel

## Intención

Sustituir los eventos locales de sesión por `audit_events` productivos, aislados por tenant. La vista pasa a grid con filtros y elimina los iconos informativos repetidos.

## Archivos

- `api/tenant-audit-events.ts`: lectura de hasta 500 eventos del tenant autenticado y registro de cada exportación.
- `prototype/audit-runtime.js`: grid, búsqueda, filtros por actor/fecha y exportación CSV compatible con Excel.
- `prototype/index.html`, `prototype/app.js` y `prototype/ux-actions.js`: retiran la auditoría simulada y la exportación Word.
- `prototype/stitch-theme.css`: layout del grid y filtros.

## Privacidad y seguridad

- La API obtiene el tenant desde la pertenencia autenticada y filtra siempre por `tenant_id`.
- No devuelve `actor_user_id` ni eventos de otras entidades.
- La exportación requiere rol con escritura, queda registrada y neutraliza prefijos de fórmula de hoja de cálculo.

## Verificación

- `npm run typecheck`: correcto.
- `node --check prototype/audit-runtime.js`: correcto.
- `npm run check:stability`: correcto.
- La revisión visual automatizada quedó pendiente porque el navegador de la aplicación no pudo reclamar una pestaña de esta sesión.

## Riesgo residual

- Se exporta CSV UTF-8 con separador de punto y coma, abrible directamente en Excel; no se añade una dependencia para `.xlsx`.
