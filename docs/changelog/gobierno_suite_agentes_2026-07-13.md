# Gobierno de la suite de agentes · 2026-07-13

## Intención

Permitir que owner/admin active puertas reales sin consentimientos automáticos.

## Cambio

- Consulta agentes, consentimientos y fuente web del tenant.
- Concede o revoca consentimiento con alcance explícito y actor.
- Aprueba únicamente la fuente web pública prevista y permite pausar agentes.
- Reconcilia estados y audita cada operación.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- Falta UI de gobierno y prueba con las migraciones aplicadas.
