# Catálogo público nacional declarativo — 30 de julio de 2026

## Intención

Se incorpora un catálogo de plataforma, no dependiente de tenant, con BDNS/SNPSAP, BOE y los 17 diarios autonómicos. BDNS se define como `discovery_canonical`; BOE y los diarios, como `official_publication`. Cada diario conserva la sede o portal de procedimiento como evidencia complementaria.

## Límites y controles

- No crea convocatorias: las fuentes son solo procedencia y evidencia (`evidence_only_never_create_opportunities`).
- No contiene `tenant_id` ni usa perfil alguno para filtrar el catálogo.
- Robots, términos y revisión comienzan en `pending_assessment`; el presupuesto de carga inicial es cero y `scan_policy.enabled` es `false`.
- La política de elegibilidad exige revisión aprobada, permisos de robots/términos y activación explícita. El guardarraíl falla si cualquier entrada pendiente pudiera escanearse.
- No se añadió conector, petición automática, migración ni escritura en Supabase.

## Archivos y verificación

- `scripts/platform/public-national-source-catalog.mjs`: catálogo y política de bloqueo.
- `scripts/guardrails/check-public-national-source-catalog.mjs`: 19 fuentes, aislamiento global, roles, URLs HTTPS y bloqueo de escaneo.
- `scripts/platform/preview-public-national-source-catalog.mjs`: demostración seca sin I/O de red ni base de datos.

Queda pendiente la evaluación documentada de robots/términos por fuente y la aprobación humana antes de proponer cualquier conector incremental.
