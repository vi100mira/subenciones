# Multi-Tenant Isolation Update

## Contexto

El producto debe servir a muchas entidades de ambito social parecido. Novaterra puede ser piloto, fixture o ejemplo, pero no debe condicionar nombres, defaults, permisos ni arquitectura.

## Cambios

- Se anadio `docs/architecture/multi-tenant-isolation.md`.
- Se actualizaron `AGENTS.md`, PRD y documentos de arquitectura para dejar claro que cada entidad es un tenant aislado.
- Se cambiaron los defaults del backend local de `novaterra` a `tenant-demo`.
- Se cambio el prototipo para hablar de entidad demo/multi-entidad en vez de presentar Novaterra como producto.
- Se actualizo el skill `subvenciones-rag-mvp` para exigir aislamiento multi-tenant, `TenantConfig`, permisos por entidad y no reutilizacion de embeddings privados.
- Se anadieron endpoints y migraciones para alta de entidades, configuracion tenant, fuentes publicas de plataforma y campanas de ingesta/vectorizacion.
- Se anadio una pantalla de prototipo `Plataforma` para superadmin.

## Regla Operativa

Las fuentes publicas de plataforma se pueden reutilizar. Las fuentes privadas, chunks, embeddings, recomendaciones, auditoria, costes y permisos son siempre de una entidad concreta.
