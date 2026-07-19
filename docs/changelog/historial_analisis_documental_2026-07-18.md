# Historial visible del análisis documental — 2026-07-18

## Intención

Sustituir una acción genérica por el estado operativo real de Preparación documental y permitir que la entidad sepa cuándo se ejecutó por última vez antes de decidir si necesita actualizarla.

## Cambios

- `api/tenant-agent-governance.ts` devuelve las ejecuciones de ingesta asociadas únicamente a fuentes privadas del tenant autenticado.
- `prototype/private-analysis-state.js` convierte los estados persistidos en textos y fechas comunes para la tarjeta y el modal.
- La tarjeta distingue análisis no iniciado, en cola, en curso, completado, fallido o cancelado.
- Tras una ejecución completada la acción pasa a **Revisar o actualizar análisis**.
- `api/ingestion-dispatch.ts` rechaza una nueva petición si la misma fuente ya tiene una ejecución en cola o en curso.
- La Guía explica que las actualizaciones son nuevas ejecuciones revisables y no sobrescrituras silenciosas.

## Privacidad y trazabilidad

El historial se filtra por `tenant_id` y por las fuentes privadas de la entidad. Solo se muestran estado, fecha y contadores agregados; no se expone contenido, nombres de archivos ni rutas. Repetir el análisis continúa requiriendo una acción humana.

## Verificación

- Estados de historial y etiquetas probados con datos deterministas: superado.
- Prueba UI de tarjeta y modal con una ejecución completada de 350 documentos: superada.
- TypeScript, conocimiento privado y `npm run check:stability`: superados.
