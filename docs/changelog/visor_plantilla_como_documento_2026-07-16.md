# Visor de plantilla como documento

## Intencion

Corregir el visor de plantillas preconstruidas para que muestre una pagina documental real, no una ficha resumen, y garantizar que esa misma representacion sea la que se descarga.

## Archivos tocados

- `prototype/opportunity-requirements.js`: genera una unica plantilla HTML para visor y descarga.
- `prototype/stitch-theme.css`: dimensiona el visor documental en escritorio y movil.
- `prototype/index.html`: renueva la version del recurso.
- `scripts/guardrails/check-opportunity-grid-ui.mjs`: protege la identidad entre vista y descarga.

## Control humano

La plantilla conserva campos pendientes, aviso de borrador y prohibicion de presentacion o firma automatica.

## Verificacion

- `node --check prototype/opportunity-requirements.js`: correcto.
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`: correcto.
- Prueba visual aislada con el JavaScript y los estilos reales: el iframe muestra la hoja de solicitud con estado, contenido, cuatro secciones, campos pendientes y control final; la descarga solo aparece despues del documento.
- `npm run check:stability`: correcto.
