# Planes y precios en el acceso público

## Intención

Explicar de forma inmediata qué hace INSERTIA y permitir que una entidad nueva consulte el modelo de precios antes de registrarse o acceder.

## Archivos tocados

- `prototype/public-entry.js`: resumen de producto y tercera pestaña pública.
- `prototype/public-entry.css`: composición y adaptación visual de la nueva información.
- `prototype/tenant-plan.js`: render compartido del mismo catálogo en la entrada y en Entidad.
- `prototype/index.html`: renovación de versiones de recursos.
- `scripts/guardrails/check-onboarding-ui.mjs`: verificación del nuevo recorrido público.

## Verificación

- Prueba de acceso, registro y consulta de los tres planes con importes 0, 29 y 79 euros.
- Revisión visual en escritorio y comprobación de ausencia de solapes.

## Riesgos residuales

- La contratación online permanece desactivada; los botones informan del estado y no producen cobros.
- Los importes son tarifas de referencia sin impuestos hasta que se definan condiciones contractuales y pasarela.
