# Integración OpenAI del redactor público · 2026-07-13

## Intención

Activar el camino productivo del redactor con OpenAI sin enviar datos privados, sin presentación automática y con un presupuesto mensual máximo de 20 €.

## Archivos modificados

- `scripts/workers/openai-draft-provider.mjs`: llamada a Responses API, salida JSON estricta, `store: false` y estimación conservadora de coste.
- `scripts/workers/run-draft-agent.mjs`: consumo de ejecuciones pendientes, puerta mensual, validación y auditoría.
- `api/draft-agent-runs.ts`: bloquea hechos internos y devuelve el borrador únicamente al tenant autenticado.
- `prototype/draft-agent-ui.js`: muestra el borrador como contenido pendiente de revisión.
- `scripts/admin/configure-openai-draft-worker.ps1`: instalación local de la clave mediante entrada oculta.
- `.env.example`: configuración documentada sin secretos.

## Privacidad, coste y aislamiento

- Solo se envían campos públicos de la convocatoria y sus bases oficiales.
- `store: false` evita solicitar persistencia de la respuesta en OpenAI.
- No se envían hechos internos, documentos privados ni fragmentos de otros tenants.
- El presupuesto interno se detiene antes de una llamada que pudiera superar 20 € al mes.
- El borrador queda en `review_required`; nunca se envía ni presenta automáticamente.

## Verificación

- Prueba simulada de la petición OpenAI: esquema estricto, `store: false`, clase pública y coste calculado.
- Contrato de salida y prueba PDF de ocho páginas frente a máximo cuatro.
- `npm run check:stability` antes de publicar.

## Riesgo residual

- No puede realizarse una llamada real hasta que una persona con acceso a la cuenta introduzca `OPENAI_API_KEY` en el worker local.
- El límite de aplicación es una segunda defensa; también conviene fijar el presupuesto en la cuenta de OpenAI.
