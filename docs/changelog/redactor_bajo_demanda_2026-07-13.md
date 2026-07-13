# Redactor bajo demanda · 2026-07-13

## Intención

Despertar el worker del redactor cuando una persona solicita un borrador y conservar un cron de recuperación sin generar consumo IA con la cola vacía.

## Archivos tocados

- `api/draft-agent-runs.ts`: solicita el workflow tras encolar y registra `requested` o `fallback_cron` en auditoría.
- `.github/workflows/workers-alojados.yml`: reduce el sondeo de cinco a quince minutos.
- `.env.example`: documenta la credencial, repositorio y rama del despacho.
- `scripts/admin/configure-draft-worker-dispatch.ps1`: instala el token en Vercel mediante entrada oculta, sin escribirlo en disco.
- `scripts/guardrails/check-hosted-workers.mjs`: verifica la nueva cadencia.
- `docs/product/agentic-architecture.md` y `docs/security/credentials-and-logging.md`: documentan flujo y custodia del secreto.
- `prototype/operations-platform.js`, `prototype/tenant-plan.js` y `docs/architecture/arquitectura-actual-del-sistema.md`: alinean el estado visible y la arquitectura vigente.

## Verificación

- `npm run typecheck`: correcto.
- `npm run check:hosted-workers`: correcto, incluido despacho limitado al redactor y fallback.
- `npm run check:line-budgets`: correcto.
- `npm run check:evidence`: correcto; conserva evidencia pública, `store: false` y revisión humana.
- Navegador local: Operaciones muestra el redactor bajo demanda con recuperación cada quince minutos; sin errores de consola.

## Privacidad y coste

- GitHub solo recibe la orden `redactor`; el contexto sigue en Supabase y no viaja en el despacho.
- Sin credencial o ante un fallo de GitHub, la ejecución permanece en cola para el cron de recuperación.
- No se añaden reintentos de OpenAI ni llamadas con la cola vacía.

## Riesgo residual

- El despacho inmediato no estará activo hasta instalar en Vercel una credencial de GitHub de alcance mínimo y desplegar esta versión.
