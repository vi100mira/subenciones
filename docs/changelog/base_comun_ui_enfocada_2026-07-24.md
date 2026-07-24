# Base común enfocada en consulta y documentos

Fecha: 2026-07-24

## Intención

Reducir la carga visual de Base común para que la consulta asistida y el grid documental sean las dos superficies principales.

## Cambios

- El contexto, el circuito de trabajo, las métricas, los criterios de reutilización y las acciones de gestión se agrupan en un punto de información.
- La explicación de la consulta, los ejemplos y el uso en candidaturas se agrupan en un segundo punto de información.
- La respuesta vacía deja de ocupar espacio; aparece únicamente después de enviar una pregunta.
- El estado esencial del tenant, la caja de consulta, los filtros y el grid permanecen visibles.
- Los despliegues usan `details/summary`, conservando teclado, foco y semántica nativa.

## Privacidad y aislamiento

- No cambia ninguna consulta, permiso, consentimiento ni dato de tenant.
- Continúan visibles el estado del plan y el número de documentos habilitados para IA.

## Verificación

- `node --check prototype/private-knowledge.js`
- `node --check prototype/common-knowledge-browser.js`
- `npm run typecheck`
- `npm run check:tenant-plan-ui`
- Revisión visual de las capturas de escritorio y móvil generadas por el guardrail.
