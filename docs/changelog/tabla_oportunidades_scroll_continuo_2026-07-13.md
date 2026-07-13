# Tabla de oportunidades con desplazamiento continuo — 2026-07-13

## Intención

Eliminar la guía visual ambigua y hacer que el corpus se pueda revisar sin paginación ni pérdida de contexto. La candidatura pasa a ser una acción operativa y deja de ocupar una columna propia.

## Archivos modificados

- `prototype/ui-polish.js`
- `prototype/visual-flows.js`
- `prototype/stitch-theme.css`
- `prototype/grid-filters.css`
- `prototype/index.html`
- `scripts/guardrails/check-opportunity-grid-ui.mjs`
- `scripts/guardrails/serve-ui-fixture.mjs`
- `package.json`

## Verificación

- Comprobación estática de la semántica de la tabla mediante `check-opportunity-grid-ui.mjs`.
- Verificación de sintaxis JavaScript y estabilidad general del repositorio.
- Verificación visual en navegador a 1280 × 720 y 390 × 844: la carga pasa de 30 a 60 filas al llegar al fondo, las dos filas de cabecera permanecen adhesivas y la página móvil no genera desbordamiento horizontal.

## Riesgos residuales

- La carga continua recorre únicamente las oportunidades ya disponibles en el navegador. La ampliación del corpus sigue dependiendo de los procesos de ingesta de plataforma.
- En pantallas estrechas se conserva el desplazamiento horizontal interno para no comprimir títulos, estados y acciones hasta hacerlos ilegibles.
