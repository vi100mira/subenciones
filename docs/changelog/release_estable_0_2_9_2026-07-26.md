# Publicación estable 0.2.9

Fecha: 2026-07-26

## Intención

Respaldar y publicar como versión estable el circuito documental completo entre Base común y una candidatura, junto con el seguimiento persistente del paquete de proyecto y la Guía actualizada.

## Alcance

- Búsqueda, revisión, aprobación y asignación de documentos desde Base común a una candidatura concreta.
- `Vincular original` conserva una referencia inmutable y `Crear copia editable` genera una versión privada de la candidatura sin llamadas externas de IA.
- Edición durante varios días, versiones inmutables y consolidación independiente de cada documento.
- Reapertura limitada al documento corregido y promoción de un consolidado a revisión humana de Base común.
- `Checklist · Carpeta de proyecto` con consulta del paquete incompleto y descargas por fichero, por check o del conjunto disponible.
- Visores privados con recuperación directa del original autorizado, alternativa manual y posición de scroll estable.
- Guía local alineada con estos recorridos, con 19 temas y siete preguntas funcionales verificadas.

## Privacidad y aislamiento

- Cada lectura y mutación permanece limitada por tenant, rol, permisos de fuente y contratación del agente documental.
- Los originales de Base común no se modifican y los borradores específicos permanecen privados en la candidatura.
- Adaptar y recuperar documentos no realiza llamadas externas de IA; la reutilización exige datos aprobados y contexto mínimo.
- Firma, envío y presentación externa continúan bloqueados hasta la revisión humana correspondiente.
- No se versionan `.env`, estado local de Vercel, rutas locales ni contenido documental privado.

## Verificación previa

- `npm run check:stability`.
- Pruebas específicas de Base común → candidatura, carpeta de proyecto, versiones documentales y Guía.
- TypeScript, límites de archivos, aislamiento por tenant y controles de revisión humana superados.
- Escaneo de secretos sin credenciales reales en los archivos de la versión.

## Publicación

- Versión: `0.2.9`.
- Etiqueta estable: `v0.2.9-stable.20260726`.
- Respaldo remoto: rama `codex/agent-flow-real-audit`.
- Destino: producción del proyecto Vercel ya enlazado `subvenciones-rag`.
- La migración `20260726120000_tenant_candidature_working_exports.sql` se versiona, pero no se aplica remotamente en esta publicación; el runtime conserva el almacenamiento compatible en auditoría.

## Riesgo residual

Los originales que solo existen en una carpeta local requieren el puente privado del equipo o su archivado explícito en Blob para poder abrirse desde otro dispositivo. La migración dedicada de revisiones de descarga deberá aplicarse en una operación de base de datos separada y auditada.
