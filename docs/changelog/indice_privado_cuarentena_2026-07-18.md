# Índice privado en cuarentena · 2026-07-18

## Intención

Permitir que Preparación documental preprocese el corpus autorizado aunque sus propuestas sigan pendientes, sin convertir contenido no revisado en conocimiento activo.

## Cambios

- `scripts/private-corpus/build_quarantine_index.py` crea un índice SQLite/FTS local, tenant-scoped y marcado íntegramente como `quarantined` e inactivo.
- El puente local conserva el índice bajo `%LOCALAPPDATA%/Insertia/private-index`, publica solo métricas y huellas, y registra el resultado agregado en auditoría.
- Preparación documental y Guía diferencian índice preparado, hechos aprobados y vectorización semántica pendiente.

## Privacidad y coste

- Los fragmentos permanecen en el equipo del tenant; no se copian a Supabase ni a la auditoría.
- Se excluyen documentos personales/sensibles, párrafos con indicadores personales, esqueletos y duplicados.
- La preparación hace 0 llamadas de IA y crea 0 embeddings. La vectorización requerirá un modelo local o un consentimiento externo separado.

## Verificación realizada

- Corpus piloto: 333 documentos cribados, 18 documentos con contenido reutilizable y 148 fragmentos preparados.
- SQLite: 148 fragmentos `quarantined`, 0 activos, un único tenant y una única fuente; FTS contiene las mismas 148 filas.
- Coste: 0 llamadas de IA y 0 embeddings.
- Guardrails del puente, Guía e historial de análisis ejecutados.

## Riesgo residual

El índice local contiene texto privado en claro protegido por la cuenta del sistema operativo. Antes de distribuir el puente a otros tenants deberá añadirse cifrado local y gestión de claves por tenant.
