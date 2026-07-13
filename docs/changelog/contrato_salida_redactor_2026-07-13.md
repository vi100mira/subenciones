# Contrato de salida del redactor · 2026-07-13

## Intención

Impedir que un proveedor de IA pueda devolver texto libre sin evidencia, límites ni revisión.

## Archivos modificados

- `scripts/workers/draft-agent-contract.mjs`: contrato estructurado y validador independiente del proveedor.
- `scripts/workers/run-draft-agent.mjs`: incorpora el contrato al manifiesto de contexto.
- `scripts/guardrails/check-draft-agent-contract.mjs`: ocho comprobaciones de evidencia, revisión, prohibición de envío y límites.
- `package.json`: añade el guardrail a estabilidad.

## Verificación

- Un caso de cuatro páginas queda en `render_required`, nunca listo para presentar.
- Los máximos por palabras o caracteres se validan antes del renderizado.
- Una salida sin evidencias, sin revisión o con presentación permitida se rechaza.

## Riesgo residual

- La validación del esquema no sustituye el renderizado PDF ni la revisión humana.
