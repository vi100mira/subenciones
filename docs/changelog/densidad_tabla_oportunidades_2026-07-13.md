# Densidad de la tabla de oportunidades — 2026-07-13

## Intención

Mostrar entre tres y cuatro oportunidades en el panel de escritorio aprovechando mejor la altura disponible, sin reducir la legibilidad de evidencias, estados ni acciones.

## Archivos modificados

- `prototype/stitch-theme.css`: aumenta el alto útil del grid y compacta celdas y acciones.
- `prototype/grid-filters.css`: reduce la altura de la segunda cabecera adhesiva y de sus campos.

## Verificación

- Comprobación estática de la interfaz mediante `npm run check:ui`.
- Revisión visual pendiente en escritorio y móvil: se conserva el ancho mínimo de tabla y el desplazamiento horizontal interno en pantallas estrechas.

## Riesgo residual

- Los títulos y plazos excepcionalmente largos pueden ocupar más líneas; el grid conserva scroll continuo para esos casos.
