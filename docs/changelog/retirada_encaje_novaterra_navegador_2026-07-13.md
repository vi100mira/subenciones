# Retirada del encaje específico del piloto · 2026-07-13

## Intención

Eliminar reglas Novaterra del navegador y usar recomendaciones tenant persistidas.

## Cambio

- Retira `entity-fit.js` y sus señales codificadas.
- Carga recomendaciones con versión, evidencia, razones y riesgos desde la API tenant.
- Ignora versiones históricas y conserva solo la versión vigente de cada oportunidad.
- Mantiene vivas, bajo encaje y archivadas sin reintroducir filas no recomendadas.
- Conserva el corpus completo para superadministración.

## Verificación

- `npm run check:runtime-truth`
- `npm run check:ui`
- `npm run typecheck`

## Riesgo residual

- Sin recomendaciones calculadas, la UI conserva el corpus inicial hasta ejecutar el agente de encaje.
