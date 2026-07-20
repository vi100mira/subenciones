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

- Respaldo Git, etiqueta estable y despliegue de producción: pendientes de completar en este cierre.

## Riesgo residual

La rama estable conserva migraciones históricas del producto, pero esta versión no las ejecuta. Cualquier migración remota futura seguirá requiriendo revisión separada de RLS, aislamiento por tenant y reversión.

