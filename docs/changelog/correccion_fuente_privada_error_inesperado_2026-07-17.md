# Corrección del error al configurar conocimiento privado — 2026-07-17

## Intención

Evitar que una entrevista guiada interna se interprete como un repositorio de proyectos y sustituir el mensaje genérico `Error inesperado` por el error operativo real cuando falle la aprobación o el inventario de una fuente privada.

## Cambios

- `prototype/private-knowledge.js`: la vía «Analizar proyectos autorizados» solo reconoce fuentes `tenant_private`; una fuente `tenant_internal` ya no activa por error el flujo de carpeta de proyectos.
- `api/tenant-agent-governance.ts`: las entrevistas y respuestas guiadas `tenant_internal` dejan de publicarse como repositorios privados y no pueden aprobarse mediante la acción reservada a fuentes de proyectos.
- `prototype/private-knowledge.js`: una fuente de proyectos real cuyo consentimiento haya caducado o sido revocado abre un modal de renovación; el permiso se repone sin duplicar la conexión.
- `prototype/private-knowledge.js`: aprobación e inventario se ejecutan y comunican como estados separados; la gobernanza se refresca después de aprobar la fuente.
- `src/apiResponse.ts`: incorpora una extracción segura del mensaje devuelto por Supabase/PostgREST, cuyos errores no siempre son instancias de `Error`.
- `api/tenant-agent-governance.ts`: la aprobación usa una consulta tolerante y devuelve un conflicto explícito si la fuente ya no está pendiente o no pertenece al tenant.
- `api/ingestion-dispatch.ts` y `api/source-connections.ts`: conservan el detalle útil de los errores operativos sin exponer configuración, rutas ni secretos.
- Guardrails: cubren la coexistencia de una entrevista interna heredada y comprueban que no se confunda con una fuente de proyectos.

## Privacidad y aislamiento

- No se ha concedido ningún consentimiento ni se ha aprobado ninguna fuente durante la corrección.
- No se han leído, copiado ni desplazado documentos del tenant.
- El diagnóstico se limitó a metadatos de gobernanza y estado; la fuente de proyectos continúa exigiendo consentimiento específico, aprobación humana y alcance por tenant.

## Verificación

- Sintaxis de los módulos JavaScript: superada.
- `npm run typecheck`: superado.
- `npm run check:private-knowledge`: superado.
- `npm run check:tenant-plan-ui`: superado, incluida la regresión de la fuente interna heredada.
- `npm run check:stability`: superado.
- Recarga y comprobación de la aplicación local en navegador: superada, sin errores de consola.

## Riesgos residuales

- El inventario sigue siendo asíncrono y puede fallar después de aprobar la fuente; la interfaz ahora conserva ese estado y muestra el motivo específico para permitir un reintento seguro.
- Drive y SharePoint siguen dependiendo de sus conectores reales y de un consentimiento compatible antes de registrar una fuente privada.
