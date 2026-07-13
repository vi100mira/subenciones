# Contrato de encaje tenant · 2026-07-13

## Intención

Calcular encaje explicable sin reglas específicas de una entidad ni decisiones automáticas de elegibilidad.

## Cambio

- Combina plazo, territorio, temas, forma jurídica, programas y colectivos aprobados.
- Devuelve razones, riesgos, información faltante y evidencia oficial versionada.
- Declara hechos internos utilizados y obliga a revisión humana.

## Verificación

- `npm run check:tenant-match`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- Falta el worker que cargue perfil y oportunidades desde Supabase.
