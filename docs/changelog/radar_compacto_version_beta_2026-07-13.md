# Radar compacto y versión beta

## Intención

- Liberar espacio vertical en Oportunidades eliminando controles que duplicaban los filtros de la tabla.
- Mantener el chat disponible como una acción flotante, compacta y accesible.
- Sustituir las referencias visibles a “demo” o “modo prototipo” por una identificación discreta de versión beta.

## Archivos modificados

- `prototype/index.html`, `prototype/ui-polish.js` y `prototype/stitch-theme.css`: cabecera simplificada, resumen no visual y chat flotante.
- `prototype/auth-credentials.js`, `prototype/entity-fit.js` y textos auxiliares: nombres y mensajes sin la etiqueta “demo”.
- `scripts/guardrails/check-opportunity-grid-ui.mjs`: protección contra la reaparición de los elementos retirados.

## Verificación

- Sintaxis y comprobaciones de estabilidad de la aplicación.
- Revisión visual en escritorio y móvil de Oportunidades y la barra lateral.
- Comprobación de nombre accesible, foco y ausencia de desbordamiento del botón de chat.

## Riesgos residuales

- El chat flotante puede requerir un ajuste de posición si se incorporan futuras barras inferiores.
- El contador de resultados sigue disponible para tecnologías de apoyo, aunque ya no ocupa espacio visual.

No cambia el acceso a datos, el aislamiento entre entidades ni los puntos de revisión humana.
