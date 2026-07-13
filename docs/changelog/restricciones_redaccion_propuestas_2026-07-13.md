# Restricciones de redacción de propuestas — 2026-07-13

## Intención

Evitar que el futuro agente redacte una memoria que incumpla límites de páginas, palabras, caracteres o formato indicados en las bases oficiales.

## Cambios

- Se extraen límites explícitos desde texto PDF/HTML y se conserva página, URL, hash y fragmento de evidencia.
- La ausencia de un límite no se interpreta como libertad de extensión: bloquea la redacción hasta revisión.
- Se detectan reglas cercanas de familia tipográfica, tamaño e interlineado.
- El dataset enriquecido y la versión persistida en Supabase incorporan el contrato `proposalConstraints`.
- Los límites por páginas o folios exigen validación sobre el documento renderizado antes de exportar.
- El constructor omite la memoria y bloquea la activación del proyecto si faltan límites o validación renderizada.
- La API consulta las restricciones autoritativas en Supabase, rechaza borradores no autorizados y valida máximos de palabras o caracteres.
- Se añade un guardrail con el caso de cuatro páginas comunicado por Novaterra, un caso real de cinco páginas y un falso positivo negativo.

## Verificación

- `npm run check:stability` completó typecheck y guardrails sin fallos; el nuevo control ejecutó 14 aserciones.
- La campaña real conservó 42 oportunidades accionables y detectó un límite verificable: Majadahonda, máximo 5 páginas, Arial 12, página 7 de las bases oficiales.
- Supabase creó 42 versiones actuales: 1 con restricciones verificadas y 41 bloqueadas para revisión; la evidencia confirmada conserva URL y SHA-256.
- El dataset estático productivo contiene las mismas 42 oportunidades y los mismos estados de redacción.

## Riesgos residuales

- Falta un renderer DOCX/PDF en servidor: por seguridad, las memorias con límite de páginas permanecen bloqueadas hasta poder contar páginas reales.
- Tablas, anexos excluidos del cómputo y límites expresados de forma ambigua necesitarán revisión humana o interpretación asistida por IA.
