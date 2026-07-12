# Frontera superadmin–tenant — 2026-07-12

## Intencion

Evitar que el superadmin parezca operar como Novaterra y hacer visible que su alcance ordinario es plataforma global y metadatos de gobierno tenant, no contenido privado.

## Cambios

- Panel, agentes y auditoria usan estados globales propios del superadmin.
- Oportunidades refresca la vista al aplicar la sesion, identifica el corpus de plataforma y desactiva acciones de candidatura tenant.
- Las fuentes privadas tenant no aparecen en el mapa global.
- La guia de oportunidades explica gobierno del corpus, no encaje ni candidaturas de una entidad.
- Operaciones se refresca al aplicar el rol y muestra solo salud global.
- La lista de entidades conserva Novaterra solo como metadato de orquestacion y gobierno.
- El panel de alta de entidades ocupa el ancho disponible y su formulario responde a tres, dos o una columna.

## Verificacion prevista

- Guardrails, typecheck y comprobacion visual de las siete vistas superadmin.
- Comprobacion separada de una sesion tenant para evitar regresiones.

## Riesgo residual

El prototipo sigue usando datos simulados. El backend real debe aplicar RLS y autorizacion servidor; ocultar elementos en UI no constituye una barrera de seguridad.
