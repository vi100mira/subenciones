# Aislamiento de la cola del redactor · 2026-07-13

## Intención

Evitar que el redactor reclame ejecuciones de otros agentes al convertir la cola en multiagente.

## Cambio

- La API crea y lista únicamente ejecuciones `draft_agent`.
- El worker reclama únicamente filas `draft_agent`.
- El guardrail alojado comprueba ambos límites.

## Verificación

- `npm run check:hosted-workers`
- `npm run typecheck`
- `git diff --check`
