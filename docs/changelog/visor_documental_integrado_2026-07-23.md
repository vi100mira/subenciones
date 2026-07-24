# Visor documental integrado

## Intención

Hacer que cada documento completo de la Base común se abra en un visor reconocible, equivalente al resto de visores de la aplicación, y concentrar allí su comprobación y aprobación.

## Cambios

- Cada ficha documental ofrece una única acción `Abrir documento`.
- El visor ocupa el área de trabajo y separa la previsualización del panel lateral de estado, procedencia, huella, privacidad y acciones.
- PDF, JPG y PNG se visualizan dentro del visor. Un original local se contrasta con la huella del inventario antes de mostrarse.
- Los originales ya guardados se recuperan del Blob privado con autenticación y aislamiento por tenant.
- DOCX y XLSX permanecen como descarga privada hasta disponer de una conversión visual segura.
- La aprobación, el descarte, el guardado privado y la descarga se realizan desde el propio visor.

## Archivos

- `prototype/private-knowledge.js`
- `prototype/private-annex-viewer.js`
- `prototype/stitch-theme.css`
- `prototype/index.html`
- `scripts/guardrails/check-private-knowledge-flow.mjs`
- `scripts/guardrails/check-tenant-plan-ui.mjs`

## Verificación

- Guardrail de arquitectura y privacidad del conocimiento privado.
- Recorrido Playwright de apertura local, comprobación restringida, aprobación y lectura autenticada desde Blob.
- Typecheck y controles generales del proyecto.

## Riesgo residual

Los formatos ofimáticos no se renderizan en línea; requieren descarga controlada. Los originales que solo existen en la carpeta local deben seleccionarse de nuevo porque el navegador no conserva rutas locales.
