# Recomendaciones de encaje por tenant · 2026-07-13

## Intención

Sustituir filtros específicos del piloto por recomendaciones persistidas, explicables y aisladas.

## Cambio

- Guarda puntuación orientativa, razones, riesgos, información faltante y evidencia.
- Registra versión de convocatoria, snapshot de perfil y hechos aprobados utilizados.
- Obliga a revisión humana y permite revisar o descartar sin alterar la fuente pública.
- RLS limita cada recomendación a miembros de su tenant.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- Falta implementar el cálculo y conectarlo a la cola multiagente.
