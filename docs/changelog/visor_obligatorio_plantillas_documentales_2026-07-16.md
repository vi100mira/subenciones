# Visor obligatorio para plantillas y documentos

## Intencion

Hacer que toda salida documental se revise en pantalla antes de ofrecer su descarga, tanto para plantillas preconstruidas como para DOCX, PDF y expedientes ZIP aprobados.

## Archivos tocados

- `prototype/draft-agent-ui.js`: sustituye las descargas directas por visores de DOCX, PDF y ZIP; la descarga solo existe dentro del visor.
- `prototype/stitch-theme.css`: presenta el contenido como paginas legibles y adapta el visor a movil.
- `prototype/index.html`: renueva la version del recurso para evitar cache antigua.
- `scripts/guardrails/check-approved-draft-export.mjs` y `check-opportunity-grid-ui.mjs`: protegen el paso obligatorio por el visor.

## Privacidad y control humano

- El PDF privado se recupera en memoria solo para mostrarlo y conserva autenticacion y aislamiento tenant.
- El visor no elimina la aprobacion humana ni habilita presentacion automatica.
- DOCX y ZIP se representan desde la misma salida estructurada aprobada; el visor advierte que la paginacion final de Word puede variar.

## Verificacion

- `node --check prototype/draft-agent-ui.js`: correcto.
- `node scripts/guardrails/check-approved-draft-export.mjs`: correcto; DOCX, PDF y ZIP privados conservan aprobacion humana, plan documental y bloqueo de presentacion.
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`: correcto; ocho tipologias conocidas y plantilla generica pasan por visor.
- Prueba visual aislada con el JavaScript y CSS reales: cero descargas antes del visor; DOCX con dos documentos legibles; ZIP con documentos e indice; PDF incrustado y descarga habilitada solo tras cargar la vista.
- `npm run check:stability`: correcto.

## Riesgos residuales

- El navegador no renderiza DOCX de forma nativa; su vista previa muestra fielmente el contenido aprobado, pero no garantiza identidad pixel a pixel con Word.
