# Propietario de tenant reconstruido · 2026-07-13

## Intención

Permitir reconstruir la membresía propietaria desde la consola sin crear usuarios de Auth implícitamente.

## Cambio

- Acepta email propietario junto al blueprint.
- Resuelve únicamente usuarios existentes en Supabase Auth.
- Rechaza el alta si el usuario todavía no existe.
- La RPC sigue recibiendo UUID y conserva idempotencia.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`

## Riesgo residual

- La invitación o creación de usuario sigue siendo un flujo separado y explícito.
