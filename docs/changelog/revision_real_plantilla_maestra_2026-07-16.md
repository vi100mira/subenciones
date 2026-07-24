# Revisión real de la plantilla maestra

## Intención

Sustituir la aprobación simulada de conocimiento privado por una revisión campo a campo contra el contrato tenant-scoped existente. Este cambio no importa ni mueve el corpus: solo gobierna propuestas que ya hayan sido extraídas y almacenadas para el tenant.

## Archivos tocados

- `prototype/master-fact-review.js`: carga propuestas reales, presenta valor, evidencia, clase de dato, confianza y conflictos, y envía decisiones humanas al API.
- `prototype/private-knowledge.js`: elimina la aprobación ficticia en `sessionStorage` y delega la revisión en el nuevo módulo.
- `prototype/index.html`: carga el módulo de revisión antes del flujo de conocimiento privado.
- `prototype/stitch-theme.css`: estilos compactos para hechos, evidencia, conflicto y decisión.
- `api/tenant-profile-review.ts`: devuelve metadatos de clasificación y conserva referencias a los hechos aprobados sin duplicar su contenido en `profile_json`.
- `scripts/guardrails/check-private-knowledge-flow.mjs`: verifica API real, aislamiento por tenant, auditoría, conflictos y ausencia de aprobación simulada.

## Privacidad y aislamiento

- La lectura y las decisiones pasan por `requireSourcePermission` y se filtran por `actor.tenantId`.
- La interfaz no persiste valores privados en `localStorage` ni `sessionStorage`.
- Aprobar hechos internos no concede consentimiento para enviarlos a un proveedor de IA.
- Los conflictos y pendientes bloquean la aprobación global.

## Riesgos residuales

- Falta conectar el worker local de inventario con la creación de `tenant_profile_suggestions`.
- El formulario guiado todavía debe persistir sus respuestas mediante el mismo contrato auditado.
- Antes de producción debe verificarse RLS y el flujo con un segundo tenant real.
