# Autorrelleno genérico de memoria · 2026-07-23

## Intención

Sustituir el esqueleto uniforme de memoria técnica por un primer autorrelleno genérico, independiente del organismo.

## Cambios

- `prototype/constructed-document-prefill.js`: familias de secciones, fuentes, estados, preguntas accionables y vinculación por requisito.
- `prototype/opportunity-requirements.js`: memoria base de diez secciones y resumen de cobertura trazable.
- `scripts/guardrails/check-generic-technical-memory.mjs`: contrato ejecutable con organismo y tenant sintéticos.
- `package.json`: incorpora el contrato a `check:ui`.

## Límites

Este corte consume bases y borradores ya disponibles en el navegador. Aún no materializa campos persistentes, modelos oficiales ni una candidatura durable. Toda propuesta continúa sometida a revisión humana.
