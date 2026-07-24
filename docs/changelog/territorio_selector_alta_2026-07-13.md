# Selector de territorio en el alta — 2026-07-13

## Intención

Normalizar el territorio declarado en la solicitud de entidad mediante una selección guiada, evitando variaciones de texto libre.

## Archivos modificados

- `prototype/public-entry.js`: cambia el campo de territorio por un selector con ámbito estatal, comunidades autónomas, Ceuta, Melilla y opción por definir.
- `prototype/styles.css` y `prototype/stitch-theme.css`: aplican a los selectores los mismos estilos y foco que a los campos de formulario.

## Verificación

- Comprobación de interfaz y selección de la opción predeterminada «Comunitat Valenciana».

## Riesgo residual

- El selector no contiene provincias ni municipios; el detalle territorial se completa durante la revisión de la solicitud.
