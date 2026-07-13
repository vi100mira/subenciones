# Worker de encaje tenant · 2026-07-13

## Intención

Calcular recomendaciones desde perfil y hechos aprobados, sin reglas específicas del piloto.

## Controles

- Reclama solo `match_agent` y exige perfil aprobado y agente listo.
- Usa versiones oficiales abiertas, conserva snapshot del perfil y referencias a hechos aprobados.
- Persiste resultados tenant-scoped y finaliza en revisión humana.
- No usa IA externa ni decide elegibilidad.

## Verificación

- `npm run check:tenant-match`
- `node --check scripts/workers/run-tenant-match.mjs`
- `npm run typecheck`

## Riesgo residual

- Falta API de encolado, runner alojado y prueba Supabase.
