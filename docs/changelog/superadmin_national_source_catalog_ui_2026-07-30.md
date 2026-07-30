# Mapa nacional de fuentes para superadministracion — 30 de julio de 2026

## Intencion

El mapa visible de fuentes de la consola superadmin deja de representar categorias heredadas o conteos de fixture. Ahora deriva de la proyeccion local del catalogo nacional: BDNS, BOE y los 17 diarios autonomicos.

## Estado visible

- El panel muestra 19 fuentes declaradas, 17 diarios autonomicos y 0 rastreos habilitados.
- Cada fuente declara revision, robots y terminos pendientes; no se presentan oportunidades, alertas o cobertura operativa.
- El texto del mapa ya no menciona categorias heredadas; explica que fuente, oportunidad y encaje son contabilidades distintas.
- Los portales y diarios son evidencia; no crean ni duplican convocatorias. Los datos persistidos existentes siguen en Operaciones y no se trasladan al mapa declarativo.
- La proyeccion no contiene tenant_id, no consulta red ni Supabase y solo se renderiza en la rama superadmin.

## Verificacion prevista

El guardarrail del catalogo compara los IDs de la proyeccion con el catalogo canonico, rechaza GVA/LABORA heredados y confirma que no se anade `fetch`.
