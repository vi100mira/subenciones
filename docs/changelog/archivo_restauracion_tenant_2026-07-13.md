# Archivo y restauración tenant · 2026-07-13

## Intención

Permitir quitar una entidad de operación y recuperarla sin simular un borrado reversible.

## Cambio

- Archivar pausa agentes, cancela ejecuciones activas y bloquea nuevos accesos.
- Restaurar conserva datos, consentimientos y auditoría, y reconcilia agentes con sus puertas reales.
- Solo superadministración puede ejecutar el ciclo y debe indicar motivo.
- El flujo declara explícitamente que no es borrado definitivo.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- Falta prueba integrada contra Supabase y control visual en Plataforma.
