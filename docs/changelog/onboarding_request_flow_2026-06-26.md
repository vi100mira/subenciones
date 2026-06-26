# Onboarding request flow

Fecha: 2026-06-26

## Cambios

- Se anade `api/onboarding-request.ts` para registrar solicitudes publicas de alta en `tenant_onboarding_requests`.
- Se incorpora un formulario compacto en la pantalla Entidad para probar el alta sin crear tenant, usuario, Drive ni permisos activos.
- Se anade `prototype/onboarding-actions.js` para enviar la solicitud y mostrar estado trazable.
- Se configura transporte WebSocket servidor para que `supabase-js` funcione en Vercel dev con Node 20.

## Seguridad

- El endpoint usa service role solo en servidor.
- El formulario guarda datos minimos y consentimiento separado para analisis de web publica.
- El flujo queda en estado `requested`; la aprobacion, email y Auth se dejan para el siguiente corte.
