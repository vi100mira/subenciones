# Base común → candidatura · 2026-07-27

## Intención

- Completar el circuito operativo desde el grid de Base común: buscar, revisar, asignar un original aprobado a una candidatura concreta o crear una copia editable específica.
- Permitir que un documento redactado y consolidado en una candidatura vuelva a proponerse como conocimiento reutilizable, sin incorporarlo automáticamente ni mezclar expedientes.

## Decisiones de producto

- `Vincular original` conserva una referencia al documento aprobado de Base común. No copia ni modifica su contenido y la candidatura elegida queda confirmada por la acción humana.
- `Crear copia editable` vincula el original como procedencia y añade al paquete documental una copia versionada de la candidatura. Hereda los documentos y consolidaciones que ya existían para no sustituir el trabajo previo.
- Un documento redactado no entra automáticamente en Base común. Solo un documento consolidado muestra `Enviar a revisión de Base común`; vuelve al grid como pendiente y requiere una aprobación humana independiente.
- Reasignar un documento ya confirmado es idempotente. Una asignación humana puede confirmar una propuesta anterior o recuperar un vínculo previamente excluido, conservando su origen y respetando el máximo operativo.

## Privacidad y control

- Todas las lecturas y mutaciones se limitan por `tenant_id`, permisos de fuente y contratación de `draft_agent`.
- La adaptación usa exclusivamente documentos `internal` ya aprobados y realiza cero llamadas externas de IA.
- Los originales de Base común son inmutables; las modificaciones viven en versiones privadas de la candidatura.
- Los consolidados propuestos a Base común se renderizan como PDF privado en Vercel Blob y se registran con estado `pending`.
- Auditoría conserva identificadores, huellas, candidatura, versión y decisión; nunca copia el contenido documental.
- Firma, envío y presentación externa permanecen bloqueados (`submissionAllowed: false`).

## Archivos principales

- `api/tenant-candidature-documents.ts`
- `api/common-document-adaptation.ts`
- `api/common-knowledge-promotion.ts`
- `api/private-document-candidates.ts`
- `prototype/private-annex-viewer.js`
- `prototype/common-knowledge-candidature-actions.js`
- `prototype/document-version-editor.js`
- `prototype/common-knowledge-browser.js`
- `prototype/private-knowledge.js`

## Verificación

- `npm run typecheck`
- `npm run check:common-knowledge-candidature`
- `npm run check:common-knowledge-candidature-ui`
- `npm run check:candidature-document-selection`
- `npm run check:candidature-document-ui`
- `npm run check:draft-version-ui`
- `npm run check:candidature-project-folder`
- Revisión visual del selector de candidatura, el editor de la copia y el documento promovido y aprobado en el grid.

## Riesgos residuales

- Promover un consolidado necesita `BLOB_READ_WRITE_TOKEN`, igual que el resto de artefactos privados persistentes.
- Los documentos promovidos se incorporan al índice semántico únicamente cuando el pipeline privado los procese; desde el primer momento sí son localizables por nombre y metadatos en el grid.
- No se ha añadido ningún envío automático ni integración externa nueva.
