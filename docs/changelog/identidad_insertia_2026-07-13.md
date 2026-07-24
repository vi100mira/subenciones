# Identidad INSERTIA — 2026-07-13

## Intención

Renombrar el producto visible a INSERTIA y sustituir el logotipo anterior por un símbolo propio, reconocible a tamaños pequeños y apto para favicon.

## Archivos modificados

- `prototype/assets/insertia/`: símbolo transparente y variantes PNG de 16, 32, 48, 180, 192 y 512 px, además de favicon ICO.
- `prototype/index.html`, `prototype/public-entry.js` y `prototype/stitch-theme.css`: integran el nombre y símbolo en el producto.
- `prototype/site.webmanifest`: declara el nombre, colores e iconos de instalación.

## Verificación

- Comprobación local de las dimensiones y canal alfa de los PNG.
- Favicon y manifest declarados en el documento principal.

## Riesgo residual

- `insertia.org.es` no se configura automáticamente: su DNS y su asignación como dominio de producción se validarán antes de modificarlos en Vercel.
