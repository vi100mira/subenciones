# Guía de Candidatura en modal

## Intención

Liberar espacio operativo en Candidatura. La guía completa de cinco etapas deja de ocupar la cabecera y se abre desde un icono de ayuda junto a «Candidaturas en seguimiento».

## Archivos

- `prototype/workspace-flow.js`: botón de ayuda, modal accesible y cierre por botón o fondo.
- `prototype/stitch-theme.css`: ancho y composición del modal; retirada de estilos del antiguo plegado inline.

## Verificación

- `node --check prototype/workspace-flow.js`: correcto.
- `npm run check:stability`: correcto.
- La revisión visual automatizada quedó pendiente porque el navegador de la aplicación no pudo reclamar una pestaña de esta sesión.

## Riesgo residual

- La guía sigue siendo informativa; no cambia el estado real de ningún expediente ni elimina la revisión humana.
- Revisar visualmente el modal en producción tras el despliegue.
