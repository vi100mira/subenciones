# Evidencia del Investigador de entidad · 2026-07-13

## Intención

Vincular cada sugerencia de perfil con el snapshot público exacto que la produjo.

## Cambio

- Añade documento origen, fragmento, SHA-256 y metadatos a `tenant_profile_suggestions`.
- Mantiene `tenant_id`, RLS existente y borrado seguro del vínculo si se elimina el documento.
- Añade índices tenant-scoped para revisión y comparación de versiones.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- La migración no se ha aplicado a Supabase remoto.
