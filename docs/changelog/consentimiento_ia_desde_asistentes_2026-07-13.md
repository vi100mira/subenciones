# Consentimiento IA desde Asistentes · 2026-07-13

## Intención

Permitir que la entidad desbloquee el Redactor sin que plataforma conceda consentimiento por ella.

## Cambio

- Muestra una acción cuando falta `ai_processing`.
- Limita el consentimiento a OpenAI, datos públicos y `store: false`.
- Reconcilia el Redactor mediante la API gobernada y auditada.

## Verificación

- `npm run check:runtime-truth`
- `npm run check:tenant-agents`

## Riesgo residual

- El consentimiento debe realizarlo un usuario autorizado de la entidad tras iniciar sesión.
