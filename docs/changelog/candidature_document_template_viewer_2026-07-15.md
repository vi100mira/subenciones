# Navegacion y visor de plantillas documentales

## Intencion

Permitir que una persona vuelva del expediente a la lista de candidaturas y pueda inspeccionar los documentos preconstruidos sin confundirlos con documentos finales.

## Cambios

- El encabezado del expediente incorpora `Volver a candidaturas`; conserva la preseleccion y solo cierra el detalle abierto.
- Cada ficha documental ofrece `Ver plantilla` y abre un visor con el requisito, el contenido preparable, el control pendiente y las secciones previstas.
- El visor permite descargar una plantilla Word compatible marcada expresamente como orientativa.
- La descarga no habilita presentacion, envio ni aprobacion automatica.

## Privacidad y revision humana

- La plantilla se construye en el navegador con la informacion ya autorizada para el expediente activo.
- No envia datos a servicios externos ni consulta documentos privados adicionales.
- Las bases, los hechos internos, los limites y la firma permanecen sujetos a validacion humana.

## Verificacion

- `node --check prototype/opportunity-requirements.js`
- `npm run typecheck`
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`
- Carga del prototipo comprobada en navegador. La sesion de prueba aislada no contenia candidaturas, por lo que el flujo con expediente se cubre mediante guardas estaticas y queda pendiente una comprobacion visual con una sesion de entidad activa.

