# INSERTIA 0.2.1 estable — 2026-07-13

## Alcance

Revisión estable incremental de la consola superadmin:

- retira el control global “Programar revisión”, que no tenía persistencia propia;
- incorpora grid de entidades reales con orden, filtros y acciones mediante iconos accesibles;
- conserva acciones de ciclo de vida gobernadas y auditadas por tenant;
- mantiene adaptación responsive y estados vacíos para crecimiento futuro.

## Verificación requerida

- estabilidad, tipos y presupuestos de línea;
- UI general y navegación autenticada;
- superadmin con API real, orden, filtros, iconos y responsive;
- despliegue de producción y protección de APIs administrativas sin sesión.

## Publicación

- versión: `0.2.1`;
- etiqueta prevista: `v0.2.1-stable.20260713`;
- no requiere migraciones ni nuevas variables de entorno.
