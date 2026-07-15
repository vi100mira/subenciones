# Índice documental canónico de INSERTIA

Actualizado el 15 de julio de 2026. Este índice evita usar un documento histórico como descripción del sistema vigente.

## Lectura recomendada

| Necesidad | Documento canónico |
| --- | --- |
| Qué problema resuelve el producto | `docs/product/prd.md` |
| Cómo funciona para una persona usuaria | `docs/product/functional-specification.md` |
| Recorrido entre pantallas y revisiones | `docs/product/app-flow.md` |
| Qué datos se permiten y cuáles se bloquean | `docs/product/data-governance-brief.md` |
| Fuentes, cobertura y periodicidad | `docs/product/source-map.md` |
| Arquitectura desplegada y estado real | `docs/architecture/arquitectura-actual-del-sistema.md` |
| Entidades, relaciones y aislamiento | `docs/architecture/data-model-reference.md` |
| RAG público/privado | `docs/architecture/rag-privacy-and-indexing.md` |
| Agentes, permisos y puertas humanas | `docs/product/agentic-architecture.md` |
| Autenticación y secretos | `docs/architecture/credentials-and-tenant-auth.md` y `docs/security/credentials-and-logging.md` |
| Cambios y alertas | `docs/architecture/change-detection-and-tenant-alerts.md` |
| Orden de construcción y validación | `docs/product/mvp-execution-plan.md` |
| Qué cambió y cómo se verificó | `docs/changelog/` |

## Conjunto documental

El proyecto cubre el conjunto mínimo exigible de producto: gobierno de datos, PRD, mapa de fuentes, flujo de aplicación, referencia técnica, modelo de datos y plan de implementación. La especificación funcional define la conducta observable; la arquitectura actual es la única referencia para afirmar qué está operativo, parcial o pendiente.

## Reglas de vigencia

- `docs/changelog/` es evidencia histórica, no especificación vigente.
- Las métricas con fecha representan una fotografía y deben citar esa fecha.
- Un componente visible en el prototipo no se considera operativo hasta que tenga productor, persistencia, consumidor y verificación.
- NovaTerra es un tenant piloto; nunca es un valor global del producto.
- Ningún documento puede eliminar la revisión humana previa a exportar, enviar, firmar o presentar.

## Mantenimiento

Cada cambio funcional no trivial debe actualizar su documento canónico y añadir una nota en `docs/changelog/`. Si implementación y documento discrepan, prevalece la conducta verificada y la discrepancia debe registrarse como deuda documental.
