# Plan integrado en Entidad y tarifas sociales

## Intención

Integrar la contratación en el perfil de cada entidad, separar acceso contratado de estado operativo y preparar una oferta social transparente sin activar cobros.

## Cambios

- `prototype/tenant-plan.js`: elimina Plan del menú de entidades, conserva Monitorización para superadministración y presenta tres planes comparables.
- `prototype/entity-activation.js` y `prototype/tenant-agent-runtime.js`: insertan el plan en Entidad y sincronizan sus áreas con el estado real de los asistentes.
- `prototype/stitch-theme.css`: añade composición adaptable para contrato, áreas y precios.
- `src/tenantPlan.ts` y APIs de ejecución: resuelven el plan aislado de cada entidad y bloquean en servidor asistentes no contratados.
- `supabase/migrations/20260715210000_tenant_commercial_plan_seed.sql`: declara el piloto patrocinado de Novaterra sin alterar migraciones históricas.
- `scripts/guardrails/check-tenant-plan-ui.mjs`: verifica Novaterra, una Entidad X con plan inferior y el diseño móvil.
- `docs/product/access-onboarding-and-social-pricing.md`: documenta precios de referencia y límites éticos.

## Verificación

- Sintaxis JavaScript, TypeScript, `check:runtime-truth` y `check:tenant-plan-ui`.
- Render autenticado local en escritorio y móvil; tres planes, seis áreas de Novaterra y cuatro para una entidad con Equipo social.

## Riesgos pendientes

- Pasarela, impuestos, condiciones, cancelación y ayudas patrocinadas siguen sin implementar.
- La activación de un asistente continúa dependiendo de permisos y consentimientos; contratarlo no los concede.
- La futura pasarela deberá persistir el evento firmado de pago fuera de la configuración editable de la entidad.
