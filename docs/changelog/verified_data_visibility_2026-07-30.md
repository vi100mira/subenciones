# Datos verificados en paneles, 2026-07-30

## Intencion

Evitar que una sesion de entidad o el panel de plataforma presenten fixtures como datos persistidos.

## Cambios

- `fixture-data-gate.js` vacia el catalogo mock salvo en localhost con `?fixture=1`.
- El tenant muestra recomendaciones, alertas y fuentes solo despues de sus lecturas autorizadas; antes usa estados vacios explicitos.
- El mapa y operaciones de plataforma quedan sin contadores hasta que `admin-platform-overview` devuelve el inventario persistido. La normalizacion mock queda solo en fixture.

## Auditoria

- `GVA` y `LABORA` eran etiquetas mock sin carga diferenciada: el codigo anterior declaraba que sus resultados llegaban por BDNS. No existe una API de conteo por esas fuentes, por lo que ya no se muestra cero ni un contador derivado.
- `Casos personales` es un bloqueo de datos personales en fixtures, no una categoria de financiacion privada. No se renombra a `Casos privados` para no inducir esa interpretacion; queda fuera de sesiones no-fixture.

## Verificacion y limite

- Typecheck, sintaxis JavaScript, guardrail privado, presupuesto de lineas y diff sin errores locales.
- No se aplicaron migraciones, no hubo lecturas/escrituras de datos de produccion ni alertas enviadas.
