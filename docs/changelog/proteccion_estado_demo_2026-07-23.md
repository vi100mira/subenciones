# Protección del estado demo

## Incidencia

El smoke test de la versión 0.2.7 detectó que `GET /api/demo-tenant-status` seguía siendo público. Tras incorporar el inventario real al tenant piloto, la respuesta podía revelar títulos y clasificaciones documentales aunque no expusiera archivos, contenido ni Blob.

## Corrección

- El endpoint exige ahora una sesión válida con permiso de lectura de fuentes.
- La organización consultada debe coincidir con el `tenant_id` de la pertenencia activa.
- Una petición sin sesión devuelve `401`.
- El E2E y el guardrail privado verifican esta frontera.

## Alcance

No se modifican datos, RLS, variables remotas ni migraciones. Los originales y el Blob privado ya exigían autenticación y continúan sin cambios.
