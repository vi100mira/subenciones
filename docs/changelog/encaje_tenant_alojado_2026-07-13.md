# Encaje tenant alojado · 2026-07-13

## Intención

Cerrar el circuito de cálculo y revisión del encaje sin reglas en el navegador.

## Cambio

- GET devuelve recomendaciones tenant-scoped con evidencia y versión oficial.
- POST encola un cálculo solo con perfil aprobado y agente listo.
- PATCH registra revisión o descarte humano y su auditoría.
- El workflow compartido consume `match_agent` bajo demanda o en recuperación periódica.

## Verificación

- `npm run check:hosted-workers`
- `npm run check:tenant-match`
- `npm run typecheck`

## Riesgo residual

- Falta conectar la UI y probar contra Supabase aplicado.
