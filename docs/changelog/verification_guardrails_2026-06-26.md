# Verification guardrails

Fecha: 2026-06-26

## Cambios

- Se anade `npm run check:ui` para verificar con Playwright la pantalla de alta de entidad desde el repo.
- Se anade `npm run check:e2e:onboarding` para probar la API de onboarding de forma controlada.
- El E2E de onboarding no escribe por defecto; requiere `ONBOARDING_E2E_WRITE=1`.

## Disciplina

- Las verificaciones Playwright deben ejecutarse desde el repo, no desde el REPL interno.
- Los tests no imprimen secretos y fallan si detectan patrones sensibles visibles en la UI.
- Los tests de escritura requieren opt-in explicito para evitar altas accidentales.
