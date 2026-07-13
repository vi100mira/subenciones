# Revisión del perfil investigado · 2026-07-13

## Intención

Convertir sugerencias públicas en contexto operativo únicamente mediante decisión humana.

## Cambio

- Lista sugerencias con URL, fragmento, hash, confianza y estado.
- Owner/admin puede aprobar o rechazar solo sugerencias pendientes.
- La aprobación explícita del perfil fusiona únicamente hechos aprobados y reconcilia agentes.
- La auditoría guarda identificadores y decisiones, no el texto completo de las fuentes.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- Falta UI y prueba integrada con Supabase.
