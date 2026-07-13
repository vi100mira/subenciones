# Acción visible en agentes bloqueados

## Intención

Evitar que una tarjeta bloqueada atenúe también el botón que permite resolver el bloqueo. El Investigador de entidad estaba desplegado, pero «Aprobar fuente web» parecía una acción deshabilitada.

## Archivos

- `prototype/tenant-agent-runtime.js`: muestra el estado real del backend también cuando la tarjeta conserva un badge estático, distingue una tarjeta inactiva de una tarjeta con acción requerida y corrige `aria-disabled`.
- `prototype/agents-readiness.js`: sustituye «En desarrollo» por lenguaje de activación y bloqueo.
- `prototype/stitch-theme.css`: mantiene contraste completo y resalta la acción requerida.

## Verificación

- `npm run check:runtime-truth`: correcto.
- `npm run check:tenant-agents`: correcto.
- `npm run typecheck`: correcto.
- `git diff --check`: correcto.

## Riesgo residual

- El cambio no concede consentimientos ni activa agentes; solo hace visible la acción humana existente.
