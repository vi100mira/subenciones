# Worker de contexto del redactor · 2026-07-13

## Intención

Consumir asíncronamente la cola del redactor y preparar un manifiesto mínimo antes de cualquier llamada a IA.

## Archivos modificados

- `scripts/workers/run-draft-agent.mjs`: reclama una ejecución, revalida versión, plazo, límites, consentimiento y hechos aprobados.
- `scripts/workers/run-draft-agent-scheduled.ps1`: lanzador local con log UTF-8.
- `package.json`: comando operativo del worker.

## Privacidad y revisión

- Los valores internos se usan solo para calcular huellas en memoria y no se guardan en la cola.
- Se bloquean identificadores, secretos, correo y hechos excesivamente largos.
- Sin proveedor autorizado, el estado final es `awaiting_provider`; no se simula un borrador.

## Verificación prevista

- Ejecución real con una oportunidad que tenga restricciones oficiales.
- Comprobación de manifiesto sin texto privado y evento de auditoría.

## Riesgo residual

- Falta integrar el proveedor de IA, su modelo, región, retención, coste y contrato de salida estructurada.
