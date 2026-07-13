# Verdad operativa en Panel, Entidad, Asistentes y Plan — 2026-07-13

## Intención

Evitar que estados de demostración se interpreten como agentes, costes o ejecuciones reales. Las pantallas principales indican ahora qué está alojado, qué es determinista, qué espera una clave y qué todavía no tiene worker.

## Archivos modificados

- `prototype/runtime-truth.js`
- `prototype/agents-readiness.js`
- `prototype/entity-activation.js`
- `prototype/operations-platform.js`
- `prototype/tenant-plan.js`
- `prototype/index.html`
- `scripts/guardrails/check-runtime-truth-ui.mjs`
- `package.json`
- `docs/architecture/arquitectura-actual-del-sistema.md`

## Verificación

- Guardrail de estados reales, coste IA nulo y distinción entre 15 financiadores y una fuente agregadora.
- Comprobación visual de Panel, Entidad, Asistentes, Monitorización y Operaciones en navegador autenticado local.
- Consulta directa de Supabase: 634 oportunidades, 3 colas y estados agrupados sin recuperar contenido privado.

## Riesgos residuales

- Algunas listas históricas siguen siendo datos de ejemplo y se etiquetan como resumen cargado, no como telemetría en tiempo real.
- Los contadores del prototipo proceden del corpus JavaScript publicado; una consola operativa plenamente viva deberá consultar Supabase mediante una API autorizada.
