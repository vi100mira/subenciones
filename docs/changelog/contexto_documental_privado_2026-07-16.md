# Contexto autorizado para documentos privados

## Intención

Unir la plantilla maestra persistente de la app con el generador documental local sin trasladar el corpus ni conceder permisos implícitos.

## Cambio

- `api/private-document-context.ts` emite un contexto efímero para el tenant autenticado y una fuente privada concreta.
- Exige el agente documental contratado, fuente activa y de solo lectura, consentimiento privado vigente y plantilla maestra aprobada.
- Solo incluye hechos aprobados de clases `public` o `internal` y de claves documentales no personales conocidas.
- Rechaza referencias caducadas y valores aprobados contradictorios en una misma clave.
- El contexto caduca a los 15 minutos y se audita por identificadores y SHA-256, sin copiar valores al evento.
- `run_private_document_batch.py` acepta el contexto descargado de la app, valida tenant, hash, caducidad, consentimiento, clases excluidas y aprobación antes de crear la carpeta de salida.
- El manifiesto diferencia el modo `persistent_authorized` del modo explícito de propuestas usado en pruebas locales.
- `purge_private_document_run.py` añade borrado local en seco o aplicado, restringido a la raíz del tenant, con confirmación nominal y rechazo de enlaces simbólicos.
- Tras el borrado conserva únicamente un recibo con hashes, recuento y bytes eliminados; nunca nombres de documentos ni contenido privado.
- `tenant-profile-review.ts` admite respuestas del formulario guiado como propuestas `pending`, tenant-scoped y con usos explícitos; nunca las aprueba automáticamente.
- `private-knowledge.js` sustituye el avance simulado del formulario por persistencia real, declaración de ausencia de datos personales/sensibles y apertura inmediata de la revisión humana.
- Con fuente activa y plantilla aprobada, la UI ofrece `Preparar ejecución local`: descarga el contexto auditado de quince minutos que consume el lote, nunca el corpus ni sus rutas.
- `check-private-knowledge-flow.mjs` incorpora estas puertas al contrato automático.

## Privacidad y riesgo residual

- No se devuelven rutas, credenciales, documentos, datos personales ni datos sensibles.
- El corpus permanece en el conector o equipo autorizado; el endpoint entrega solo hechos maestros aprobados.
- La emisión del contexto no activa por sí sola ninguna lectura ni generación; el usuario conserva el control del ejecutor o conector local.

## Verificación

- `npm run typecheck`.
- `npm run check:private-knowledge`.
- `npm run check:line-budgets`.
- Pruebas negativas de contexto manipulado, caducado y perteneciente a otro tenant antes de crear salidas.
- Prueba real de borrado de un lote completo y conservación del recibo fuera de la carpeta eliminada.
