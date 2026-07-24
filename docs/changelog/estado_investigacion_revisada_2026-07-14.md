# Estado de investigación revisada

Fecha: 2026-07-14

## Intención

Evitar que una ejecución de investigación terminada siga mostrando sus 14 sugerencias como pendientes después de que la entidad ya haya decidido sobre todas y aprobado el perfil.

## Cambios

- La tarjeta del Investigador combina el estado de ejecución con las decisiones de sus sugerencias.
- Con cero pendientes y perfil aprobado muestra 14 revisadas, 8 aceptadas y 6 descartadas.
- El resumen del ciclo informa que la revisión terminó y que el encaje ya está disponible, en lugar de invitar a calcularlo otra vez.
- La acción posterior pasa a “Buscar cambios en la web”, dejando claro que sería una nueva investigación opcional.
- No se altera la investigación, el perfil ni el encaje persistidos; el cambio es exclusivamente de representación fiel del estado.

## Archivos

- `prototype/tenant-agent-runtime.js`
- `prototype/index.html`
- `scripts/guardrails/check-runtime-truth-ui.mjs`

## Verificación

- `npm run check:runtime-truth`
- `npm run check:tenant-agents`
- `npm run typecheck`
- `npm run check:line-budgets`
- Recarga en navegador local con `tenant-agent-runtime.js?v=20260714-reviewed-research-state`, sin errores de consola.
