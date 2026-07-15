# Estabilización de presupuestos de líneas

## Intención

Recuperar los guardrails de mantenibilidad sin cambiar el comportamiento del cockpit.

## Archivos

- `prototype/app.js`: conserva la coordinación general y delega el panel.
- `prototype/dashboard-renderer.js`: contiene exclusivamente el renderizado del panel.
- `prototype/styles.css`: conserva los estilos base.
- `prototype/app-modals-responsive.css`: agrupa modales y reglas responsive.
- `prototype/index.html`: carga los módulos extraídos en el orden requerido.

## Verificación

- `npm run check:stability`: superado.
- `npm run check:ui`: superado con servidor local.
- `npm run check:tenant-plan-ui`: superado en escritorio y móvil.
- `vercel build --prod`: superado.
- Smoke test autenticado de superadministración contra Vercel: corregida y validada la alineación del mapa de fuentes.
- El verificador de fallback global limita el valor de cada métrica a `summary > strong`, sin confundir títulos del visor con cifras tenant.
- La extracción preserva UTF-8; se verificó la ausencia de mojibake en `app.js` y `dashboard-renderer.js`.

## Riesgos residuales

La extracción es mecánica y no modifica políticas de datos, aislamiento tenant ni puntos de revisión humana. `vercel dev` no puede ejecutar las Functions desde esta ruta de Windows con espacios por un fallo de precarga del CLI; la verificación final de API se realiza contra el despliegue alojado.
