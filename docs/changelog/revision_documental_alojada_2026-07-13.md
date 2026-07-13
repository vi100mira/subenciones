# Revisión documental alojada · 2026-07-13

## Intención

No declarar operativo el agente documental hasta que pueda encolarse, ejecutarse y auditarse fuera del navegador.

## Cambio

- Añade API tenant para consultar, encolar y revisar resultados.
- Añade worker determinista aislado por `document_review`.
- Lo aloja bajo demanda y con recuperación cada 15 minutos.
- Persiste requisitos y riesgos sobre una versión oficial vigente.

## Verificación

- `npm run check:document-review`
- `npm run check:hosted-workers`
- `npm run typecheck`

## Riesgo residual

- Sin versión oficial estructurada suficiente, el resultado debe conservar riesgos y revisión pendiente.
