# Revisión documental en candidatura · 2026-07-13

## Intención

Conectar la acción documental existente con el agente persistente sin retirar el fallback de preparación local.

## Cambio

- Encola revisión real desde la oportunidad seleccionada.
- Muestra requisitos, riesgos y estado de revisión en Candidatura.
- Permite marcar revisado o descartado con auditoría backend.
- Mantiene la preparación Word separada y siempre sujeta a revisión humana.

## Verificación

- `npm run check:runtime-truth`
- `npm run check:ui`
- `npm run typecheck`

## Riesgo residual

- El resultado aparece cuando el worker ha consumido la cola; el fallback local no se presenta como persistido.
