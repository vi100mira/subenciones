# Vista directa del original local

Fecha: 2026-07-24

## Intención

Evitar que una persona autenticada tenga que volver a seleccionar un documento que ya fue inventariado desde una carpeta privada autorizada.

## Cambios

- El inventario genera `source-manifest.json` junto al índice privado local. Contiene únicamente raíz local, ruta relativa, identificador y huella; no se envía a Supabase.
- El puente local incorpora una ruta de lectura que valida sesión, pertenencia al tenant, fuente privada, documento, confinamiento de ruta y SHA-256.
- El visor solicita automáticamente PDF, JPG y PNG al puente local. La selección manual aparece solo si la carpeta ya no está disponible o la huella cambió.
- Si una apertura falla, el visor permite reintentarla sin cerrar el documento; la selección manual queda como último recurso.
- La apertura queda auditada como `private_document.opened_local` sin registrar ruta ni contenido.
- La aprobación para reutilizar el documento sigue siendo una decisión humana independiente de poder visualizarlo.
- El puente local carga su configuración desde `.env.local` cuando se inicia fuera del proceso de Vercel, evitando respuestas `500` por una sesión de Supabase sin configurar.

## Estado local preparado

- Se generó el manifiesto local del tenant piloto con 346 documentos.
- Los dos registros del certificado mostrado coinciden con sus identificadores y huellas remotas.
- No se subió ningún original ni ruta local a Supabase.

## Verificación

- `python scripts/guardrails/check-private-knowledge-bridge.py`
- `npm run check:private-knowledge`
- `npm run check:local-private-inventory`
- `npm run check:candidature-document-ui`
- El endpoint sin sesión devuelve `403`.
- La preflight CORS desde `http://127.0.0.1:3000` devuelve `200` y la petición conserva la cabecera del origen permitido.
- La prueba visual confirma que el visor abre directamente y oculta el selector manual.

## Riesgo residual

La vista directa depende de que el puente local esté en ejecución y la carpeta autorizada conserve la misma ubicación y huella. Si cambia cualquiera de ellas, el visor ofrece la selección manual como recuperación y solicita un nuevo inventario cuando la huella ya no coincide.
