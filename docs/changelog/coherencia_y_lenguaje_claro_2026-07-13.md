# Coherencia de oportunidades y lenguaje claro

## Intención

- Mostrar la misma selección y las mismas cifras en Panel y Oportunidades.
- Representar con iconos todas las acciones de candidatura, conservando nombres accesibles.
- Sustituir expresiones propias del desarrollo de software por explicaciones útiles para personal técnico de entidades.

## Archivos modificados

- `prototype/opportunity-scope.js`, `prototype/app.js` y `prototype/ui-polish.js`: selección común, métricas consistentes y acciones con iconos.
- `prototype/agents-readiness.js`, `prototype/entity-activation.js`, `prototype/runtime-truth.js`, `prototype/operations-platform.js`, `prototype/tenant-plan.js` y `prototype/mock-data.js`: textos y estados en lenguaje claro.
- `prototype/stitch-theme.css` e `prototype/index.html`: ajuste visual y carga del nuevo selector común.
- `scripts/guardrails/`: comprobaciones para evitar regresiones de cifras, acciones y terminología.

## Verificación

- Comprobaciones automáticas de sintaxis, estabilidad, interfaz y presupuestos de líneas.
- Revisión visual en escritorio y móvil del Panel, Oportunidades, Entidad y Asistentes.

## Riesgos residuales

- Las cifras cambian cuando cambia el perfil de acceso o se actualizan las fuentes; dentro de una misma sesión, Panel y Oportunidades deben seguir coincidiendo.
- Los iconos incluyen nombre accesible y ayuda emergente, pero conviene mantener una prueba periódica con lector de pantalla.

No se modifica el tratamiento de datos privados, el aislamiento entre entidades ni los puntos de revisión humana.
