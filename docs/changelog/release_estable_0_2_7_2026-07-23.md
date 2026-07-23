# Publicación estable 0.2.7

## Intención

Respaldar y publicar como versión estable la Base común reutilizable de la entidad y el autorrelleno genérico de documentos de candidatura.

## Alcance

- Base común independiente de cada convocatoria, aislada por tenant.
- Inventario de documentos completos con aprobación humana separada de los hechos reutilizables.
- Archivo de anexos en Blob privado y visor documental integrado para PDF, JPG y PNG.
- Tratamiento restringido de DNI y documentación sensible, sin IA ni embeddings.
- Punto 7 y memorias técnicas genéricos para cualquier organismo, con autorrelleno trazable y preguntas cuando faltan datos.
- Recuperación explícita de sesiones caducadas sin perder el punto de trabajo.

## Privacidad y publicación

- No se incluyen rutas locales, `.env`, configuración local de Vercel, originales del tenant ni salidas temporales.
- No se aplican migraciones Supabase ni se modifican variables de entorno remotas.
- El acceso a originales almacenados exige autenticación y tenant; las vistas restringidas requieren confirmación.
- Se conserva la revisión humana antes de reutilizar, exportar o presentar.

## Verificación previa

- `npm run check:stability`.
- `npm run check:ui`.
- `npm run check:tenant-plan-ui`.
- `npm run build`.
- Escaneo de secretos y revisión del contenido respaldado.

## Publicación

- Versión: `0.2.7`.
- Etiqueta estable: `v0.2.7-stable.20260723`.
- GitHub: rama `codex/agent-flow-real-audit` y PR de publicación existentes.
- Vercel: despliegue explícito al proyecto ya enlazado `subvenciones-rag`.

## Riesgo residual

DOCX y XLSX permanecen como descarga privada hasta incorporar una conversión visual segura. Los originales que solo existen en la carpeta local deben seleccionarse de nuevo; la aplicación no conserva rutas locales.
