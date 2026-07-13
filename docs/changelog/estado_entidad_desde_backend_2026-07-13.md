# Estado de entidad desde backend · 2026-07-13

## Intención

Evitar que el alta de Novaterra implique visualmente que su web y todos sus agentes están operativos.

## Cambio

- El nombre y el alta proceden de la sesión tenant.
- La autorización web procede del consentimiento vigente y de la fuente aprobada.
- El Plan deja de afirmar que todos los agentes están habilitados.
- La pantalla Entidad mantiene perfil y gobierno; los agentes se operan desde Asistentes.

## Verificación

- `npm run check:runtime-truth`
- `npm run check:ui`
- `npm run typecheck`

## Riesgo residual

- Hasta publicar APIs y migraciones, producción seguirá mostrando la versión anterior.
