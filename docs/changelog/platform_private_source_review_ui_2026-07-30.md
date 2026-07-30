# Panel real de fuentes y cola privada, 2026-07-30

## Intención

Sustituir los estados estáticos del panel de superadministración por datos operativos de plataforma y hacer visible la cola de fuentes privadas sin mezclarla con tenants.

## Cambios

- `platform-runtime.js` usa `admin-platform-overview` para las métricas y el mapa de fuentes del panel, y muestra un estado explícito si no hay datos o la API no responde.
- La nueva cola usa `admin-private-source-candidates` solo con sesión superadmin. Conserva URL oficial, estado, resumen de evidencia y los límites de rastreo/publicación.
- Aprobar, rechazar o cerrar una muestra llama a la acción de revisión existente; ninguna acción publica oportunidades, genera alertas ni usa `tenant_id`.

## Verificación prevista

- TypeScript, sintaxis del runtime, guardrail del radar privado y presupuesto de líneas.
- Navegador local en el entorno integrado sin enviar una revisión.

## Riesgos residuales

La migración de `platform_private_source_candidates` sigue sin aplicar. Mientras falte, la UI debe mostrar que la cola no está disponible y no sustituirla por mocks.
