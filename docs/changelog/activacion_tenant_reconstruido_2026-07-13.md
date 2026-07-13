# Activación de tenant reconstruido · 2026-07-13

## Intención

Completar la transición de una entidad provisionada desde `onboarding` hasta acceso operativo.

## Cambio

- Añade acción administrativa `activate` al ciclo de vida.
- Solo acepta entidades en `onboarding`.
- Recalcula los agentes según consentimientos, fuentes y perfil.
- Audita actor, motivo y carácter reversible sin conceder consentimientos.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`

## Riesgo residual

- La activación habilita el acceso, pero no sustituye las decisiones de consentimiento de la entidad.
