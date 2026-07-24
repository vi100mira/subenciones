# Pre-rellenado documental trazable

## Intención

Evitar que `Ver plantilla` muestre cajas vacías cuando la candidatura ya dispone de información utilizable. Cada documento pre-rellena sus apartados con datos públicos disponibles y, cuando existe una ejecución del redactor, muestra el contenido generado correspondiente.

## Archivos tocados

- `prototype/constructed-document-prefill.js`: selecciona contenido disponible por tipo de apartado y enlaza documentos generados sin inventar valores.
- `prototype/opportunity-requirements.js`: renderiza estados `pre-rellenado`, `generado` y `pendiente` dentro del mismo visor y descarga.
- `prototype/draft-agent-ui.js`: publica en memoria la última versión del redactor para actualizar el visor abierto.
- `prototype/index.html`: carga el módulo de pre-rellenado antes del visor documental.
- `prototype/help-assistant-knowledge.js`: documenta el comportamiento para Guía.
- Guardrails de candidatura y UI: comprueban el pre-rellenado y la sustitución por una versión generada.

## Privacidad y control

El pre-rellenado inmediato usa solo información ya presente en la candidatura. Los hechos internos aprobados no se exponen en el navegador ni se incorporan hasta una ejecución personalizada autorizada. Firma, importes y campos sin evidencia permanecen pendientes de revisión humana.

## Verificación

- `npm run typecheck`: correcto.
- `npm run check:help-assistant`: correcto.
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`: correcto.
- `node scripts/guardrails/check-draft-version-ui.mjs`: correcto; comprueba el pre-rellenado inmediato, la sustitución documento a documento por una versión generada, la conservación de la versión anterior y la solicitud de revisión de bases tras recargar.

## Riesgo residual

La correspondencia entre un documento exigido y un borrador generado usa título y tipo documental. Los casos ambiguos permanecen como pre-rellenado orientativo en vez de asociar un borrador incorrecto.
