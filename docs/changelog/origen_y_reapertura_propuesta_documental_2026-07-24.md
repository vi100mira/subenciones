# Origen y reapertura de propuestas documentales

Fecha: 2026-07-24

## Intención

Permitir que una persona vuelva a revisar, días después, el documento propuesto por el asistente desde el propio expediente de candidatura.

## Cambios

- Cada vínculo documental muestra por separado una decisión humana y un origen inmutable.
- `Origen · Propuesto por el asistente` permanece visible después de confirmar o excluir.
- `Ver documento` abre el original desde la fila antes y después de la decisión.
- La apertura reutiliza el visor privado existente; no copia el documento dentro de la candidatura.
- La API solo expone si existe un original privado almacenado y conserva el origen en la auditoría de la decisión.

## Privacidad y revisión humana

- Se mantienen sesión, tenant, fuente, identificador y huella en la apertura.
- El contenido privado no se incorpora al registro de candidatura ni al evento de auditoría.
- Confirmar o excluir sigue siendo una decisión humana independiente del origen de la propuesta.

## Verificación

- Contrato API de selección documental.
- Flujo visual de apertura antes y después de confirmar.
- Persistencia visible del origen tras la decisión.
