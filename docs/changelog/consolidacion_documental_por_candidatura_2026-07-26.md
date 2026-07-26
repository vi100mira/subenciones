# Consolidación documental por candidatura · 2026-07-26

## Intención

- Permitir que una persona autorizada edite directamente las cajas de una plantilla preconstruida, guarde avances y cierre cada documento de la candidatura cuando esté terminado.
- Mantener el expediente acumulativo durante varios días: un documento consolidado no obliga a cerrar los demás ni convierte el paquete en presentable.

## Cambios

- `Documentos` puede iniciar un borrador manual desde las cajas ya preconstruidas, sin realizar llamadas externas de IA.
- Cada guardado crea una versión inmutable y conserva estructura, procedencia y evidencias; solo los párrafos redactables se pueden modificar.
- `Guardar y consolidar documento` cierra exclusivamente el documento abierto, registra persona, fecha y huella, y elimina del título los sufijos de borrador o esqueleto.
- Al reabrir y volver a guardar un documento consolidado, solo ese documento vuelve a borrador. Los demás cierres permanecen intactos.
- El estado consolidado se refleja tanto en `Documentos` como en `Checklist · Carpeta de proyecto`; el paquete global solo queda cerrado cuando todos sus documentos están consolidados.
- La firma, el envío y la presentación externa siguen bloqueados: `submissionAllowed` permanece en `false` y se conserva la revisión humana final.
- El inicio manual y cada consolidación comprueban pertenencia de candidatura, tenant, permisos de escritura y contratación del agente documental; la auditoría guarda referencias y huellas, no el contenido privado.

## Archivos principales

- `src/draftDocumentVersion.ts`
- `api/draft-document-versions.ts`
- `src/candidatureProjectFolder.ts`
- `prototype/document-version-editor.js`
- `prototype/opportunity-requirements.js`
- `prototype/constructed-document-prefill.js`
- `prototype/project-folder-ui.js`
- `scripts/guardrails/check-draft-document-versions.mjs`
- `scripts/guardrails/check-candidature-project-folder.mjs`
- `scripts/guardrails/check-draft-version-ui.mjs`

## Verificación

- `npm run typecheck`
- `npm run check:draft-versions`
- `npm run check:candidature-project-folder`
- `npm run check:draft-version-ui`
- Revisión visual de los estados editable y consolidado generados por la prueba de navegador.

## Riesgos residuales

- El flujo necesita que el entorno desplegado disponga de las tablas de versiones y revisiones documentales ya previstas por las migraciones existentes.
- Un documento consolidado sigue siendo material interno de trabajo: la exportación, firma y presentación requieren sus controles humanos independientes.
