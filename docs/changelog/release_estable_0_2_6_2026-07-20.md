# Publicación estable 0.2.6

## Intención

Respaldar y publicar como versión estable la nueva navegación contextual de Candidatura y el visor documental sin superposición.

## Alcance

- Mapa de candidatura con recorridos diferenciados `Entender` y `Preparar`.
- Modales propios para información, documentos, checklist y borrador Word.
- Retorno bidireccional al plan de la candidatura activa.
- Visor único para todas las acciones `Ver plantilla`, con documento amplio, controles laterales y retorno a `Documentos`.
- Adaptación móvil sin desbordamiento y guardrails específicos del recorrido y del versionado documental.

## Privacidad y publicación

- No se incluyen `.env.local`, configuración local de Vercel, salidas de `.tmp/` ni documentos del tenant.
- No se aplican migraciones Supabase ni se modifican variables de entorno remotas.
- La generación continúa versionada y exige revisión humana antes de usar, exportar o presentar.
- El despliegue de producción es explícito y usa el proyecto Vercel ya enlazado.

## Verificación previa

- `npm run build`: correcto; versión `0.2.6` generada.
- `npm run check:stability`: correcto.
- `npm run check:tenant-plan-ui`: correcto en escritorio y 390 px.
- `npm run check:draft-version-ui`: visor único, retorno a `Documentos`, versionado y vista móvil correctos.
- Interfaz y API local: HTTP 200 en el puerto 4190.

## Publicación

- Commit estable: `34c82b091ca4b47cbf42f68fe438fd81b04d580d`.
- Etiqueta: `v0.2.6-stable.20260720`.
- Respaldo recuperable: `C:\tmp\subvenciones-backups\insertia-0.2.6-stable-20260720.bundle` (SHA-256 `AA077A83967C2407D9D4F204171B974D16E9C41DF5972202E23E7DA348ABEE8F`).
- GitHub: rama respaldada y PR borrador `https://github.com/vi100mira/subenciones/pull/6`.
- Vercel producción: `https://subvenciones-rag.vercel.app`, despliegue `dpl_Gs83oTVPqsQSQrGgwTuCqmA5QwLj`, estado `READY`.
- Smoke test de producción: landing 200, `build-info.js` expone versión `0.2.6` y revisión `34c82b0`, API pública 200 y API tenant 401 sin sesión.

## Riesgo residual

La rama estable conserva migraciones históricas del producto, pero esta versión no las ejecuta. Cualquier migración remota futura seguirá requiriendo revisión separada de RLS, aislamiento por tenant y reversión.
