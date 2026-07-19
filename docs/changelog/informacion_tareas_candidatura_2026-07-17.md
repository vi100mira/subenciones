# Información de tareas de candidatura — 2026-07-17

## Intención

Clarificar que el detalle de una candidatura es el plan de trabajo documental y explicar términos ambiguos como la cofinanciación sin convertirlos en decisiones automáticas.

## Cambios

- `prototype/mock-data.js`: cada tarea declara finalidad, comprobación, evidencia y criterio humano de cierre; se precisan los nombres y acciones.
- `prototype/workspace-flow.js`: añade una introducción al plan y un punto de información por tarea con modal explicativo.
- `prototype/stitch-theme.css`: adapta los nuevos controles y modales a escritorio y móvil.
- `scripts/guardrails/check-tenant-match-contract.mjs`: exige información, evidencia y control humano en todas las tareas.

## Privacidad y control

Los modales solo explican el trabajo. No muestran archivos privados, no cambian estados y no confirman elegibilidad. Los certificados, poderes y hechos internos continúan dentro del tenant y sujetos a revisión humana.

## Verificación

- Sintaxis JavaScript y `npm run typecheck`: superados.
- `npm run check:tenant-match`: superado.
- `npm run check:tenant-plan-ui`: cinco puntos informativos, modal y móvil superados.
- Revisión visual de la lista y del modal de cofinanciación: superada.
- `npm run check:stability`: superado.
