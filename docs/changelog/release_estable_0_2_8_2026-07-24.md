# Publicación estable 0.2.8

Fecha: 2026-07-24

## Intención

Respaldar y publicar como versión estable el diálogo y grid de la Base común, la selección documental por candidatura y la recuperación directa de originales locales autorizados.

## Alcance

- Base común privada con 346 documentos, filtros, orden y consulta asistida.
- Interfaz enfocada en la caja de diálogo y el grid; la información auxiliar se despliega bajo demanda.
- Cada candidatura utiliza únicamente un subconjunto documental explicado y revisable, nunca el corpus completo.
- El plan sin agente documental conserva la propiedad y la lectura histórica, pero bloquea nuevas acciones de IA y mutaciones documentales.
- Sesión y tenant se conservan en las llamadas alojadas para evitar respuestas `400` por ausencia de contexto.
- PDF, JPG y PNG inventariados pueden abrirse directamente mediante el puente local autorizado, con selección manual solo como recuperación.

## Privacidad y aislamiento

- No se versionan originales, índices privados, rutas locales, `.env` ni estado local de Vercel.
- El puente valida sesión, tenant, fuente, documento, confinamiento de ruta y huella antes de servir un original.
- La apertura se audita sin copiar ruta ni contenido.
- No se comparte el corpus privado con IA; la consulta trabaja únicamente con fragmentos aprobados y mínimos.
- Se mantiene la revisión humana antes de reutilizar, exportar, enviar o presentar.

## Verificación previa

- `npm run check:stability`.
- `npm run check:candidature-document-ui`.
- TypeScript y Python compilan sin errores.
- Frontend, puente local y preflight CORS responden `200`.
- La tabla `tenant_candidature_documents` ya existe en Supabase; esta publicación no aplica migraciones remotas.
- Escaneo de secretos y rutas privadas sin coincidencias en los cambios versionados.

## Publicación

- Versión: `0.2.8`.
- Etiqueta estable: `v0.2.8-stable.20260724`.
- Respaldo remoto: rama `codex/agent-flow-real-audit`.
- Destino: producción del proyecto Vercel ya enlazado `subvenciones-rag`.

## Riesgo residual

La vista directa de archivos que solo existen en una carpeta del equipo requiere que el puente privado local esté activo y que la ubicación y huella no hayan cambiado. En la aplicación alojada, esos originales locales no salen del equipo; para acceso remoto deben archivarse explícitamente en el Blob privado.
