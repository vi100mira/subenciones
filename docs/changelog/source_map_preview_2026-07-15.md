# Contadores y visor del mapa de fuentes

## Intencion

Explicar la cobertura real del radar desde el panel general y permitir inspeccionar los elementos de cada fuente sin abandonar la pantalla.

## Cambios

- Cada fuente muestra un contador y se puede desplegar a ancho completo.
- El desplegable presenta todas las oportunidades o iniciativas dentro de una lista con scroll y permite abrir su análisis con los controles existentes.
- El catálogo privado queda reconciliado: 18 iniciativas monitorizadas, 16 con vigencia pendiente de verificar y 2 cerradas.
- Las iniciativas privadas no se mezclan con «Oportunidades vivas» hasta disponer de bases y plazo confirmados.
- Los conectores sin carga diferenciada muestran cero y explican de dónde proceden los resultados actuales.

## Limites y privacidad

- El visor usa únicamente metadatos públicos ya cargados en el navegador.
- Las fuentes privadas del tenant permanecen aisladas y solo se cuentan en la sesión de su entidad.
- Desplegar una fuente no aprueba, preselecciona ni genera una candidatura.

## Verificacion realizada

- `npm run typecheck`
- `node --check prototype/app.js`
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`
- Revisión en navegador: 8 tarjetas, 8 contadores y 18 iniciativas privadas presentes en el visor de «Fundaciones y obra social».
