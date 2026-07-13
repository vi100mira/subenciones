# Registro de agentes por tenant · 2026-07-13

## Intención

Sustituir el estado implícito del prototipo por un catálogo de capacidades y una activación reproducible por tenant. Este corte no activa workers ni modifica Supabase remoto.

## Archivos

- `supabase/migrations/20260713173000_tenant_agent_registry.sql`: catálogo global, configuración aislada por tenant y cola multiagente.
- `scripts/guardrails/check-tenant-agent-registry.mjs`: comprueba catálogo, RLS, consentimiento e independencia de Novaterra.
- `package.json`: incorpora el guardrail a estabilidad.

## Privacidad y operación

- Cada configuración lleva `tenant_id` y solo es visible para miembros del tenant mediante RLS.
- El Investigador de entidad exige consentimiento `public_web_analysis`.
- Las mutaciones quedan reservadas a APIs de administración con auditoría.
- Los agentes conservan revisión humana cuando generan recomendaciones o contenido.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- La migración todavía no se ha aplicado; no convierte por sí sola los workers diseñados en procesos operativos.
