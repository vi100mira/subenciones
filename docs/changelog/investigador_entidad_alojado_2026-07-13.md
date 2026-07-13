# Investigador de entidad alojado · 2026-07-13

## Intención

Cerrar el circuito bajo demanda desde tenant hasta worker sin añadir otro cron.

## Cambio

- La API exige owner/admin, agente listo, consentimiento y fuente aprobada.
- Encola idempotentemente y solicita el proceso `investigador` al workflow existente.
- El runner compartido recupera Investigador y Redactor cada 15 minutos.
- Reutiliza la credencial GitHub actual; los alias genéricos son opcionales.

## Verificación

- `npm run check:hosted-workers`
- `npm run check:entity-research`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- Requiere aplicar migraciones y desplegar para ejecutar una prueba real.
