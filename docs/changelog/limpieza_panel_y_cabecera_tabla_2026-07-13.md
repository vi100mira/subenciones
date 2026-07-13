# Limpieza del panel y cabecera de oportunidades — 2026-07-13

## Intención

Eliminar ruido visual del mapa de fuentes, no ofrecer navegación de alertas que todavía no existe y hacer continua la cabecera adhesiva de la tabla.

## Archivos modificados

- `prototype/styles.css` y `prototype/stitch-theme.css`: sustituyen la trama del mapa por un fondo blanco.
- `prototype/index.html`: deshabilita la acción no implementada «Ver todas».
- `prototype/ui-polish.js` y `prototype/grid-filters.css`: retiran etiquetas duplicadas de los filtros y alinean exactamente las dos filas adhesivas.

## Verificación

- `npm run check:ui`.
- Revisión visual de la tabla en escritorio y móvil.

## Riesgo residual

- «Ver todas» permanece visible como señal de funcionalidad prevista hasta que se implemente su vista y navegación.
