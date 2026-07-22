# Importación BDNS idempotente ante contenido repetido

## Intención

La campaña general del 22 de julio de 2026 falló en GitHub Actions con `23505: duplicate key value violates unique constraint "platform_opportunity_versions_opportunity_id_content_hash_key"`. El importador solo comparaba con la versión `current`; si cambiaba el plazo o los criterios sin cambiar el contenido, intentaba insertar otra fila con el mismo `content_hash`, prohibido por la restricción única `(opportunity_id, content_hash)`.

## Archivos tocados

- `scripts/platform/import-bdns-radar.mjs`: `writeVersion` respeta la semántica del esquema (una fila por contenido distinto):
  - Contenido igual y plazo/criterios iguales: refresco ligero como hasta ahora (`refreshed`).
  - Contenido igual pero plazo o criterios distintos: actualiza la fila vigente completa en lugar de insertar (`updated`, contador nuevo en el resumen).
  - Contenido distinto que coincide con una versión anterior reemplazada: reactiva esa fila como `current` con número de versión siguiente, tras marcar `superseded` la vigente (`versioned`).
  - Contenido nuevo: inserción como hasta ahora (`versioned`).

## Privacidad y control

Sin cambios de datos, permisos ni migraciones. El script sigue operando solo sobre el catálogo público de plataforma.

## Verificación

- `node --check scripts/platform/import-bdns-radar.mjs`: correcto.
- `npm run typecheck`: correcto.
- Dry-run local con `data/public-radar/bdns-search.json` (572 fichas): correcto; el resumen incluye el contador `updated`.
- El consumidor `run-municipal-radar.mjs` solo lee `eligibleLive` y `rejectedByLiveEvidenceGate` del resumen, por lo que el contador nuevo no afecta al wrapper.

## Riesgo residual

La reactivación de una versión anterior reutiliza su fila y actualiza su `version_number`; el historial de esa fila refleja la lectura más reciente, no cada oscilación intermedia. La verificación en remoto quedará confirmada con la próxima campaña diaria de las 05:15 UTC.
