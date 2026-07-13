# Worker del Investigador de entidad · 2026-07-13

## Intención

Consumir investigaciones encoladas y convertir web pública consentida en snapshots y sugerencias revisables.

## Controles

- Reclama solo `entity_research` y exige agente listo, consentimiento vigente y fuente aprobada.
- Persiste texto normalizado, URL y hash como documento público tenant-scoped.
- Sustituye sugerencias pendientes anteriores sin alterar las ya aprobadas o rechazadas.
- Finaliza en `review_required`, registra auditoría y realiza cero llamadas de IA externa.

## Verificación

- `npm run check:entity-research`
- `node --check scripts/workers/run-entity-research.mjs`
- `npm run typecheck`

## Riesgo residual

- Falta API de encolado, workflow alojado y prueba contra Supabase.
