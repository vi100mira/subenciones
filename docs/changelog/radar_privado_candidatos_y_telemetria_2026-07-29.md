# Radar privado: candidatos retenidos y telemetría · 2026-07-29

## Intención

Ampliar de forma acotada la cobertura del radar privado sin convertir evidencia ambigua en una recomendación para un tenant.

## Archivos modificados

- `scripts/platform/deep-scan-open-funders.mjs`: añade semillas desde `robots.txt` y sitemaps del mismo origen, con un máximo de dos sitemaps y seis URLs relevantes; registra presupuesto, profundidad, renderizados, documentos, cola y fallos por fuente. Cada fuente puede declarar un presupuesto de 1 a 20 páginas y profundidad de 0 a 3; el valor por defecto se mantiene en 10 y 2.
- `scripts/platform/apply-open-funder-scan.mjs`: separa el estado de descubrimiento del estado de publicación y conserva candidatos con evidencia oficial pero sin puerta live completa en `review_candidates`.
- `scripts/platform/import-open-funders.mjs`: persiste dichos candidatos como oportunidades `tracked`, con evidencia, motivo de revisión y telemetría. El matcher solo consulta oportunidades `open` o `rolling`, por lo que no se muestran a tenants.
- `scripts/guardrails/check-private-radar-gate.mjs`: cubre una convocatoria publicable y otra con evidencia suficiente pero sin fecha de cierre estructurada.

## Verificación

- `node scripts/guardrails/check-private-radar-gate.mjs`
- `node scripts/guardrails/check-grant-source-authority.mjs`
- `npm run typecheck`

## Riesgos residuales

- La frontera de URLs no se persiste todavía entre campañas: las semillas se vuelven a derivar de fuentes públicas autorizadas en cada ejecución.
- Un candidato retenido requiere revisión humana para pasar a `open`; no se generan alertas ni recomendaciones de tenant desde `tracked`.
