# Bootstrap de esquema vacío

Este paquete reconstruye el esquema completo de la aplicación sobre un `public`
realmente vacío. Está preparado para `ombjsdrapdgfivnzjvfu`, pero no contiene
URL, secreto, enlace de proyecto ni código que contacte con Supabase.

## Alcance y exclusiones

El manifiesto ordena 31 migraciones existentes. Excluye expresamente
`20260626132000_novaterra_demo_seed.sql` y
`20260715210000_tenant_commercial_plan_seed.sql`: no se crea el tenant
Novaterra ni se insertan o modifican datos demo. La migración del registro de agentes sí conserva seis
definiciones técnicas globales. Son metadatos necesarios para el esquema y no
crean campañas, colas, oportunidades, alertas, tenants ni ejecuciones.

El bootstrap no activa nada externo. Los cron de Vercel, workers, rastreos,
alertas y despliegues continúan fuera de este SQL y deben permanecer apagados.
La tabla de campañas se crea vacía; no se invoca ningún worker ni función de
provisión.

## Ejecución aprobada futura

1. Repetir la comprobación de que `public` no tiene tablas de aplicación y
   guardar el resultado junto al backup inicial del proyecto.
2. Desde el worktree de release, ejecutar `npm run supabase:check-empty-bootstrap`.
3. Emitir el único bloque transaccional con
   `npm run supabase:emit-empty-bootstrap > bootstrap.sql`. El emisor incluye
   una guarda que aborta si ya aparece una tabla en `public`.
4. Ejecutar `bootstrap.sql` por la vía administrativa aprobada. El SQL no
   registra por sí mismo el historial de Supabase: usar el runner de
   migraciones cuando esté disponible o reconciliar esa historia de forma
   explícita y verificada después. No inventar ni insertar filas en las tablas
   internas de Supabase desde el editor SQL.
5. Ejecutar `verify-empty-project-bootstrap.sql` como consulta de solo lectura.
   Todas las tablas deben existir con RLS; las tablas globales cerradas deben
   tener cero políticas directas; solo `service_role` debe ejecutar las dos
   funciones sensibles; los contadores operativos deben quedar en cero.

Si el paso 1 falla, detenerse: este paquete no sirve para reconciliar un
esquema restaurado con datos. En ese caso se requiere backup, manifiesto remoto
y una migración reconciliada específica, nunca un reset.

## Dependencias relevantes

`20260730130000_catalog_lifecycle_governance.sql` depende de candidatas
privadas (`20260729193000`) y de oportunidades; estas requieren fuentes de
plataforma y la base de organizaciones/RLS. El manifiesto conserva ese orden y
también `campaign_key`, que necesita el endpoint de overview. Las migraciones
que hacen `UPDATE` o deduplicación no tienen filas sobre una base vacía; por
eso la guarda de esquema vacío es obligatoria.
