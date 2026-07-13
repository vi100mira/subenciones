# Documentación de la arquitectura actual — 2026-07-13

## Intención

Separar con claridad la arquitectura operativa de la arquitectura diseñada y ofrecer una referencia gráfica en español sobre colas, agentes, OCR y capacidad real de búsqueda.

## Cambios

- Se añade un `README.md` en español como entrada al proyecto.
- Se crea `docs/architecture/arquitectura-actual-del-sistema.md` con el flujo productivo, las fronteras de confianza y un diagrama Mermaid.
- Se documentan las dos colas persistidas y se identifica cuál tiene consumidor real.
- Se clasifica cada capacidad agentica como operativa, parcial o prototipo.
- Se aclara que el OCR es local y no un servicio SaaS.
- Se incorporan métricas leídas de Supabase: 626 registros, 65 marcados abiertos y 42 accionables con bases verificadas.
- Se incluye un índice en español de los documentos y skills que intervienen en el desarrollo.

## Verificación

- La comprobación de los tres nuevos documentos no detectó enlaces locales rotos.
- `npm run check:stability` completó typecheck, presupuestos de líneas y guardrails de evidencia sin fallos.
- Los conteos se leyeron directamente de Supabase sin imprimir credenciales: 626 registros, 65 abiertos históricos y 42 accionables.
- `git diff --check` no detectó errores de espacios ni finales de línea.

## Riesgos residuales

- La documentación histórica en inglés no se traduce masivamente en este corte para preservar rutas y mantener el cambio revisable.
- Los conteos productivos son una fotografía del 13 de julio de 2026 y deberán actualizarse tras nuevas campañas.
