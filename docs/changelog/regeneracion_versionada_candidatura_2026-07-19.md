# Regeneración versionada de candidaturas · 2026-07-19

## Intención

Hacer visible cuándo el conocimiento aprobado del tenant puede mejorar una candidatura sin modificar silenciosamente un borrador o Word ya generado.

## Cambios

- `api/draft-agent-runs.ts`: devuelve el número de hechos privados aprobados y la fecha de la aprobación más reciente junto al historial de ejecuciones del tenant.
- `prototype/draft-agent-ui.js`: distingue primera generación, nueva versión pública, regeneración personalizada y conocimiento aprobado posterior al borrador. La versión anterior permanece inmutable y auditable.
- `prototype/opportunity-requirements.js`: concentra las acciones en `Borrador`; la cabecera resume el estado y, cuando faltan bases o límites, la pestaña muestra el bloqueo y el paso previo concreto.
- El visor `Ver documento` ofrece la misma generación o regeneración cuando detecta un esqueleto, conserva el acceso a la gestión del conocimiento y aclara que se actualiza el conjunto documental de la candidatura.
- La reconstrucción asíncrona del expediente vuelve a solicitar el estado del redactor para que el aviso de nueva versión no desaparezca por una carrera de renderizado.
- `prototype/help-assistant-knowledge.js`: explica el flujo en lenguaje no técnico para que Guía responda dónde regenerar y por qué un Word anterior no cambia.
- `scripts/guardrails/check-private-fact-retrieval.mjs`: comprueba que la API exponga la vigencia del conocimiento y que la UI conserve la regeneración versionada.
- `scripts/guardrails/check-draft-version-ui.mjs`: reproduce el caso de un borrador público anterior a 11 hechos aprobados y valida la acción en la pestaña `Borrador`.

## Privacidad y revisión

Solo se muestran recuentos y fechas. Los hechos siguen aislados por tenant, la recuperación usa únicamente propuestas aprobadas y cada nueva salida mantiene la revisión humana antes de exportar.

## Verificación

- `npm run typecheck`
- `npm run check:private-fact-retrieval`
- `npm run check:draft-version-ui`
- `npm run check:ui`
- `npm run check:runtime-truth`
- `npm run check:tenant-plan-ui`
- Comprobación de sintaxis de los módulos de interfaz.

## Riesgo residual

La acción permanece bloqueada mientras las bases o los límites de redacción no estén aprobados. Esa puerta es deliberada y no se omite para acelerar la generación.
