# API de provisión tenant · 2026-07-13

## Intención

Exponer la provisión reproducible exclusivamente a administración de plataforma, sin insertar lógica de tenant en el navegador.

## Cambio

- `api/admin-tenant-provision.ts` valida un blueprint v1 y ejecuta la función transaccional.
- Requiere un token de superadministración y usa `service_role` solo dentro de la función Vercel.
- El guardrail verifica método, autenticación, RPC y ausencia de referencias a Novaterra.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- No se ha aplicado la migración remota ni probado el endpoint contra producción.
