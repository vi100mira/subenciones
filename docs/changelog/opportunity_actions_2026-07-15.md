# Acciones de oportunidades con respuesta visible

## Intencion

Hacer inequívocas las cinco acciones de la tabla de oportunidades y evitar que el corpus general aparente crear candidaturas cuando el encaje persistido no está disponible.

## Cambios

- `prototype/ui-polish.js`
  - El icono de análisis mantiene el detalle explicable y recibe una etiqueta accesible más precisa.
  - Bases y fuente oficial abren primero una ventana informativa con procedencia, documentos y enlaces explícitos.
  - El texto extraído sigue abriendo la lectura interna usada por el sistema.
  - La preselección solo utiliza la decisión persistida cuando existe una recomendación del tenant. En modo degradado informa de que no se ha creado ninguna candidatura.
  - El modo estático sin sesión conserva su preselección local y ahora confirma la acción.
- `prototype/index.html`
  - Se actualiza la versión de caché del módulo visual.
- `scripts/guardrails/check-opportunity-grid-ui.mjs`
  - Se comprueba que las acciones externas tengan transición informativa y que la preselección degradada sea veraz.

## Verificacion realizada

- `node scripts/guardrails/check-opportunity-grid-ui.mjs`
- `npm run typecheck`
- Comprobación del visor con el PDF principal de la convocatoria BDNS 916357: respuesta `application/pdf`, disposición `inline`, firma `%PDF-` y 250.202 bytes.
- Comprobación de la base complementaria del BOP de Valencia: respuesta `application/pdf`, disposición `inline`, firma `%PDF-` y 261.853 bytes.
- Comprobación separada de descarga: disposición `attachment` y nombre de archivo controlado.
- Revisión visual en navegador del visor PDF con miniaturas, navegación, zoom, impresión y descarga.

## Riesgos residuales

- Los enlaces oficiales dependen de la disponibilidad de BDNS, boletines y portales externos.
- La creación real de candidaturas continúa requiriendo sesión válida, recomendación persistida y decisión humana auditada.

## Evolucion: visor documental

- Las bases PDF se muestran dentro de INSERTIA; la descarga pasa a ser una acción secundaria.
- Cuando hay varios documentos, el usuario puede alternarlos sin abandonar la convocatoria.
- `api/public-document-viewer.ts` transforma únicamente PDFs de fuentes públicas autorizadas a disposición `inline`, limita el tamaño a 15 MB y conserva una descarga explícita.
- No se envían datos privados ni contexto del tenant: el proxy recibe exclusivamente una URL de documento público. El coste residual es el ancho de banda de la función, mitigado con caché compartida.
