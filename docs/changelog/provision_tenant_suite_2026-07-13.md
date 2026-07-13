# Provisión reproducible de tenant · 2026-07-13

## Intención

Crear o reconstruir la estructura de una entidad desde un blueprint v1 sin depender de Novaterra y recalcular el estado real de cada agente.

## Cambio y puertas

- La provisión transaccional crea o actualiza tenant, owner opcional, consentimientos pendientes, fuente web y suite de agentes.
- La reconciliación exige consentimiento y fuente para investigar, perfil aprobado para encaje y consentimiento IA para redactar.
- Búsqueda, revisión pública y alertas internas no requieren datos privados.
- Ambas funciones están cerradas a `service_role`.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`
- Revisión estática de idempotencia, cierre `service_role` y ausencia de Novaterra.
- Supabase remoto no se modifica.

## Riesgo residual

- El esquema todavía necesita API administrativa, prueba transaccional y workers para Investigador y Encaje.
