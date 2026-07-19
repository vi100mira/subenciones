# Persistencia remota de bases publicas - 2026-07-16

## Intencion

Activar en el entorno remoto el contrato documental por el que un tenant con `mission_full` puede usar bases publicas y preparar borradores sin conceder acceso a datos internos. La autorizacion de `ai_processing` solo amplia el contexto con hechos internos aprobados y la salida mantiene revision humana obligatoria.

## Cambios y operaciones

- Se aplicaron las seis migraciones remotas pendientes, incluidas interpretaciones publicas de bases, revision humana de borradores, fuentes suplementarias, plan comercial de Novaterra y conciliacion del agente documental en modo publico.
- Se creo y enlazo al proyecto Vercel el almacen privado `insertia-storage`; los textos extraidos se guardan en rutas `platform/bases/<sha256>/pages.json` y Supabase conserva hashes, rutas y contratos.
- Se procesaron tres capturas reproducibles con 89 artefactos de entrada. La deduplicacion por oportunidad y hash dejo 74 artefactos e interpretaciones persistidos: 33 en revision humana, 39 en cola hibrida y 2 fallidos.
- `scripts/platform/queue-bases-interpretations.mjs` declara `allowOverwrite` para que una ruta basada en hash sea realmente idempotente con Vercel Blob.
- `scripts/workers/openai-bases-provider.mjs` exige copiar citas OCR sin corregirlas y adjunta el uso de proveedor a los errores de validacion.
- `scripts/workers/run-bases-interpreter.mjs` persiste ese uso rechazado para que el presupuesto mensual contabilice tambien respuestas que no superan la compuerta de citas.
- `scripts/guardrails/check-openai-bases-provider.mjs` prueba la contabilidad de una respuesta rechazada.

## Verificacion

- Supabase remoto: Novaterra activo, plan `mission_full`, `draft_agent` en `ready`, habilitado y limitado a la clase `public`; `ai_processing` permanece `pending` sin bloquear el gestor documental.
- Dos interpretaciones OpenAI fueron rechazadas por citas no localizadas. Se detuvo la cola restante para no consumir presupuesto sin calidad; el uso remoto registrado es `0.052035 EUR`.
- La primera llamada rechazada ocurrio antes de incorporar la contabilidad de errores y no dejo su uso en `usage_json`; no se oculta esta excepcion historica.
- `node scripts/guardrails/check-openai-bases-provider.mjs`, `npm run typecheck` y `npm run check:line-budgets` superados.
- Solo se enviaron paginas de fuentes publicas y las llamadas usaron `store: false`. No se aprobaron bases, borradores ni exportaciones automaticamente.

## Riesgos residuales

- Las 39 interpretaciones hibridas siguen pendientes. Debe mejorarse la reparacion de citas literales antes de reanudar la cola completa.
- Los 33 contratos deterministas requieren revision humana antes de convertirse en evidencia aprobada para nuevos borradores.
- El borrador historico de Novaterra en `review_required` no contiene documentos ni plan documental; la interfaz lo marca como resultado heredado incompleto y no permite aprobarlo ni exportarlo.
