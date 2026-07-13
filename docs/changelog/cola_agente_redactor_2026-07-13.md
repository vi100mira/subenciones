# Cola del agente redactor · 2026-07-13

## Intención

Crear la entrada asíncrona del redactor sin enviar todavía datos a un proveedor externo.

## Archivos modificados

- `supabase/migrations/20260713115000_tenant_draft_agent_runs.sql`: cola aislada por tenant y estados auditables.
- `api/draft-agent-runs.ts`: valida oportunidad, versión, plazo, límites, consentimiento y hechos aprobados antes de encolar.
- `vercel.json`: declara el límite de ejecución de la función.

## Privacidad y revisión

- La cola guarda referencias, clases permitidas y huellas; no copia texto interno ni un prompt completo.
- Los hechos internos requieren consentimiento `ai_processing` vigente y estado aprobado.
- La salida nunca permite presentación externa automática y exige revisión humana.

## Verificación prevista

- Tipado y estabilidad.
- Migración remota y prueba de las puertas de oportunidad y restricciones.

## Riesgo residual

- La ejecución permanecerá sin borrador hasta configurar y autorizar explícitamente un proveedor de IA.
