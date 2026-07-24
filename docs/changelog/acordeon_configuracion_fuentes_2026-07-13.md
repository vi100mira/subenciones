# Acordeón de configuración de fuentes — 2026-07-13

## Intención

Recuperar el despliegue de las configuraciones de radar después de aplicar o restaurar una sesión.

## Archivos

- `prototype/app.js`: elimina el listener ligado a nodos que se reemplazan y conserva el comportamiento nativo accesible de `details/summary`.
- `scripts/guardrails/check-platform-superadmin-ui.mjs`: abre una configuración después del repintado de sesión y comprueba su estado expandido.

## Verificación

- Clic sobre “Abrir configuración” después de aplicar la sesión superadmin.
- Verificación conjunta del panel global y responsive a 390 px.

## Riesgo residual

Ninguno conocido; el control usa semántica nativa del navegador y mantiene acceso por teclado.
