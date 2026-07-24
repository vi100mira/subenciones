# Retirada del scroll superior de oportunidades

Fecha: 2026-07-14

## Intención

- Eliminar la barra de desplazamiento horizontal duplicada sobre la tabla de oportunidades.
- Conservar los scrolls horizontal y vertical integrados en la propia tabla.

## Archivos

- `prototype/ui-polish.js`: retirada del control duplicado y su sincronización.
- `prototype/stitch-theme.css`: retirada de sus estilos asociados.

## Verificación

- Comprobación local: el control superior ya no existe y la tabla sigue usando su propio contenedor desplazable.

## Riesgo residual

- Ninguno esperado: el contenedor de tabla conserva `overflow: auto`.
