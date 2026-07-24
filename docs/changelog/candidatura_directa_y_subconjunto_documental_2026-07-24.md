# Candidatura directa y subconjunto documental

Fecha: 2026-07-24

## Intención

Eliminar el modal intermedio de tareas y hacer visible, dentro del expediente, cómo la Base común participa en una candidatura sin incorporar el corpus completo ni saltarse la revisión humana.

## Cambios

- `prototype/workspace-flow.js` abre el expediente directamente desde la lista de candidaturas.
- `prototype/opportunity-requirements.js` mantiene el mapa como pantalla principal, añade el resumen documental y despliega la explicación de cada tarea desde un punto de información.
- `prototype/candidature-document-selection.js` muestra inventario, aprobados, pendientes, vínculos y candidatos de revisión; propone automáticamente solo documentos internos ya aprobados.
- `prototype/private-knowledge.js` avisa al expediente cuando una decisión documental humana cambia.
- `api/tenant-candidature-documents.ts` limita el corpus a fuentes `tenant_private`, clasifica estados por metadatos, recomienda un máximo de ocho documentos aprobados y conserva cada propuesta como `proposed`.
- `prototype/stitch-theme.css` e `prototype/index.html` incorporan los estados visuales y renuevan las versiones de los recursos.
- Los guardrails de candidatura, encaje, plan y borradores se adaptan al recorrido directo.
- Se aplicó y registró `20260724200000_tenant_candidature_documents.sql` de forma aislada; no se aplicaron las otras migraciones locales pendientes.

## Verificación

- TypeScript y sintaxis JavaScript correctos.
- `npm run check:line-budgets`
- `npm run check:tenant-match`
- `npm run check:tenant-plan-ui`
- `npm run check:draft-version-ui`
- `npm run check:candidature-document-selection`
- `npm run check:candidature-document-ui`
- `npm run check:private-knowledge`
- Supabase remoto: tabla creada, RLS habilitado y una política de lectura tenant; cero selecciones iniciales.

## Privacidad y riesgos residuales

- La recomendación usa solo títulos y metadatos; no copia texto extraído ni contenido privado.
- Documentos personales, sensibles, bloqueados o sin aprobación no pueden vincularse.
- El tenant piloto tiene 346 candidatos inventariados y ningún documento aprobado todavía: el expediente mostrará candidatos para revisión, pero no creará propuestas utilizables hasta que una persona apruebe documentos internos.
- La heurística actual es determinista y léxica. Más adelante puede sustituirse por recuperación semántica privada sin cambiar la revisión humana ni el aislamiento tenant.
