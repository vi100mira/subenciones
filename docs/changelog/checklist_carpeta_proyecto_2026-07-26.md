# Checklist · Carpeta de proyecto

## Intención

- Reducir la preparación de una candidatura a dos espacios: `Documentos` y `Checklist · Carpeta de proyecto`.
- Concentrar generación, edición y versiones en `Documentos` y eliminar el nodo independiente `Borrador Word`.
- Permitir revisar y descargar el paquete de trabajo por fichero, por check o completo durante varios días, sin confundirlo con el expediente final aprobado.

## Cambios

- La carpeta se reconstruye desde el plan documental vigente, la última versión humana y los vínculos tenant-private de Base común.
- Los anexos con referencias de requisito se agrupan en su check; el resto aparece como evidencia adicional de la entidad.
- Las descargas de trabajo exigen confirmación humana, quedan auditadas y conservan `submissionAllowed: false`.
- Los documentos generados y el índice llevan `BORRADOR DE TRABAJO · NO PRESENTAR`; los originales privados se incorporan solo cuando están archivados.
- Una migración nueva conserva las revisiones de descarga por tenant, candidatura, snapshot y alcance sin copiar contenido documental.
- Sin agente documental, la carpeta histórica permanece visible y los controles de nuevas descargas de trabajo quedan en solo lectura.
- Los refrescos periódicos conservan el último estado visible y solo reconstruyen la carpeta cuando cambia la ejecución; ya no alternan con la pantalla de carga.

## Verificación

- `npm run typecheck`
- `npm run check:line-budgets`
- `npm run check:candidature-project-folder`
- `npm run check:candidature-document-ui`
- La comprobación de interfaz repite el mismo evento de actualización y verifica que la carpeta continúa visible sin parpadeo.
- Comprobación visual de capturas de escritorio y móvil generadas por Playwright.

## Riesgos residuales

- Hasta aplicar `20260726120000_tenant_candidature_working_exports.sql`, la revisión de trabajo usa `audit_events` como almacenamiento compatible; la migración habilita un historial dedicado y consultas más eficientes.
- Los originales que solo existan en una carpeta local se enumeran como no disponibles y no se copian al ZIP hasta archivarlos de forma autorizada.
- Este cambio no publica una nueva versión estable ni modifica el proceso de presentación externa.
