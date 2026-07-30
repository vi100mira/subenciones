# Cobertura privada del panel superadmin — 2026-07-30

Se sustituye el bloque explicativo estático por cobertura privada persistida y separada del mapa público. Muestra candidatas verificadas, tracked o pendientes, candidatas publicables y oportunidades privadas indexadas, con metadatos de evidencia y fecha. No publica ni recomienda oportunidades a clientes y queda oculta para tenants.

El catálogo nacional declarado se reduce a un detalle contextual cuando falta la lectura nacional. Si la tabla de candidatas privadas no está activa o la API no responde, la UI muestra «Sin datos privados disponibles» con la causa, sin cifras ficticias.

Verificación: typecheck, guardarraíl de catálogo nacional y `check:private-platform-coverage`. Sin migraciones, despliegue ni escrituras remotas.
