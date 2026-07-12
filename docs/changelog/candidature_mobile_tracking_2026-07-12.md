# Seguimiento de candidaturas usable en movil

## Intencion

Corregir el desbordamiento horizontal de las tarjetas de candidatura que comprimia los titulos largos y hacia inviable revisar los expedientes en pantallas moviles.

## Archivos tocados

- `prototype/stitch-theme.css`: reglas responsive acotadas a la bandeja de candidaturas para apilar el contenido, permitir que la rejilla encoja y envolver textos largos.
- `docs/changelog/candidature_mobile_tracking_2026-07-12.md`: trazabilidad de la correccion.

## Verificacion

- Revision estatica del breakpoint movil: la tarjeta usa una unica columna `minmax(0, 1fr)`, sus hijos admiten encogimiento y el texto largo puede envolver.
- El navegador integrado se configuro a 390 x 844 px, pero no pudo alcanzar el servidor local aislado del workspace (`ERR_CONNECTION_REFUSED`); queda pendiente la confirmacion visual final en un navegador con acceso a localhost.

## Riesgos residuales

- El cambio no altera datos, estados, permisos ni puntos de revision humana.
- Otras pantallas del prototipo conservan sus reglas responsive actuales.
- Riesgo bajo pendiente: confirmar visualmente que no existe scroll horizontal a 390 px en el entorno local del proyecto.
