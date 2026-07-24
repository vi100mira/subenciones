# Vistas superadmin conectadas a datos reales

Fecha: 2026-07-13

## Intención

Sustituir la lectura de ejemplo por el estado persistido de todos los tenants y de las campañas públicas.

## Cambios

- Panel: oportunidades, tenants, asistentes y revisiones se calculan desde la API administrativa.
- Asistentes: catálogo, activaciones y últimas ejecuciones reales agregadas por tenant, sin contenido privado.
- Auditoría: eventos reales de todos los tenants con metadatos mínimos y exportación CSV.
- Revisiones: se elimina la explicación redundante y los cron simulados; cada fuente muestra su campaña más reciente.
- Revisiones muestra solo BDNS municipal, BDNS social general y financiadores privados: son las tres rutas con worker alojado completo. El resto se gestiona en Fuentes/Normalización.
- Se retiran `Programar revisión` y `Ejecutar ahora`, que no tenían una operación persistida equivalente. El icono de refresco vuelve a consultar la API real.
- Operaciones: colas, errores, salud de fuentes, campañas y actividad tenant proceden del backend.

## Archivos

- `prototype/platform-runtime.js`
- `prototype/index.html`

## Verificación

- Sesión superadmin temporal verificada contra Supabase y API local real.
- Seis definiciones de agente, tres revisiones operativas y últimas ejecuciones renderizadas desde persistencia.
- Panel, Asistentes, Auditoría, Plataforma y Operaciones sin desbordamiento a 390 px.
- TypeScript, guardas de interfaz, verdad de runtime y presupuestos de líneas correctos.

## Riesgos residuales

- Los tres trabajadores alojados recogen diariamente las campañas encoladas; la consola no promete ejecución inmediata.
- El coste monetario no se muestra hasta disponer de contabilidad persistida y comparable entre proveedores.
