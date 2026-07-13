# Puerta de evidencia del radar privado · 2026-07-13

## Intención

Convertir el rastreo profundo de financiadores privados en entradas importables solo cuando una fuente oficial demuestra que la convocatoria está abierta, ofrece un cierre explícito y aporta bases suficientes.

## Archivos modificados

- `scripts/platform/apply-open-funder-scan.mjs`: combina catálogo y rastreo, aplica la puerta de evidencia y extrae límites de redacción.
- `scripts/platform/import-open-funders.mjs`: acepta el catálogo enriquecido y persiste evidencia y restricciones.
- `scripts/guardrails/check-private-radar-gate.mjs`: prueba el caso de convocatoria abierta con memoria de cuatro páginas.
- `package.json`: integra la prueba y el comando de aplicación.

## Verificación

- Una fuente abierta, con cierre y bases verificadas, pasa a candidata operativa.
- Una fuente sin estado abierto o sin cierre permanece en seguimiento o revisión.
- Los límites oficiales se conservan con página, URL y huella documental.

## Riesgos residuales

- La extracción de fechas privadas se apoya todavía en campos de estado explícitos de la página oficial.
- Una fuente bloqueada o ambigua nunca se activa automáticamente y requiere revisión humana.
