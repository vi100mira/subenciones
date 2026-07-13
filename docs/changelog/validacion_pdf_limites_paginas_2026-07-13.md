# Validación PDF de límites por páginas · 2026-07-13

## Intención

Permitir que el redactor genere una memoria cuando las bases fijan un máximo de páginas, validando el número físico de páginas antes de guardar el paquete.

## Archivos modificados

- `src/proposalPdf.ts`: genera PDF A4, aplica tipografía, tamaño e interlineado detectados y cuenta páginas.
- `api/candidature-document-package.ts`: valida el máximo oficial y guarda el PDF de comprobación junto al Word editable.
- `package.json` y `package-lock.json`: incorporan `pdfkit` y sus tipos.

## Privacidad, coste y aislamiento

- El renderizado ocurre dentro de la función Vercel y no envía contenido a otro proveedor.
- No introduce coste variable por documento; aumenta el tamaño y el arranque de la función.
- Las rutas siguen separadas por `tenant_id`; persiste el riesgo ya conocido de Blob público hasta migrar el almacén a acceso privado.

## Verificación prevista

- Tipado, estabilidad, auditoría de dependencias productivas y despliegue Vercel.
- Una memoria que supere el máximo devuelve bloqueo; una que quepa conserva página, fuente y regla oficial en auditoría.

## Riesgos residuales

- El PDF es el formato canónico para validar páginas; el Word HTML editable puede repaginarse de forma distinta según la versión de Office.
- La revisión humana sigue siendo obligatoria antes de presentar o compartir.
