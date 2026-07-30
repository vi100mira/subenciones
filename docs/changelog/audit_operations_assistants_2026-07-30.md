# Auditoría, operaciones y asistentes — 2026-07-30

## Intención

Se aclara el límite operativo del superadministrador: consulta procedencia, evidencia e historial técnico; no decide la elegibilidad ni la aplicación de una convocatoria. La cola de Operación del radar deja de representar campañas o candidatas como tareas genéricas y solo describe excepciones técnicas persistidas. También se evita el desbordamiento de tarjetas y canales en Asistentes.

## Cambios

- `api/admin-audit-events.ts` y `prototype/platform-audit-runtime.js`: lectura de auditoría global con filtros, detalle de metadatos/procedencia, orden y exportación local; no hay escrituras de eventos.
- `prototype/ui-polish.js`: la tabla pasa de «Acciones» a «Operaciones disponibles», separa la decisión de encaje del tenant y abre el historial técnico desde Auditoría para el superadmin.
- `prototype/platform-runtime.js`: muestra origen, fecha, causa, estado y siguiente responsable de datos persistidos; el vacío declara que no existe una cola simulada.
- `prototype/styles.css`: los canales y tarjetas de Asistentes pueden encoger y partir contenido largo en escritorio estrecho y móvil.

## Verificación y límites

- Pendiente de comprobar en la copia local integrada con sesión superadmin ya existente; no se han usado ni solicitado credenciales.
- No se aplicó ninguna migración, no se desplegó ni se escribió contra servicios remotos.
- La lectura de eventos técnicos del radar informa de forma explícita si la migración local no está activada.
