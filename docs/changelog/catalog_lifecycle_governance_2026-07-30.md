# Operación técnica del radar y revisión especialista tenant

Fecha: 2026-07-30

Estados técnicos globales: `legacy_unclassified`, `automated_evidence_checked`, `operational_exception`, `operational_hold` y `rejected_security`. Son independientes de la vigencia de oportunidad y no habilitan publicación, alertas ni matching.

- El sistema puede registrar comprobaciones objetivas de evidencia de candidatas de fuente y oportunidades; un trigger deja eventos de los cambios técnicos de oportunidad.
- El superadministrador solo resuelve excepciones técnicas de fuente (seguridad, permiso o captura) con motivo y URL HTTPS; cada transición deja un evento inmutable.
- Interpretación de bases, elegibilidad, relevancia y decisión de aplicar son decisiones de especialistas tenant: `bases-review-request` y `tenant-match-review` conservan el aislamiento y la auditoría en `audit_events`.
- La vista se denomina «Operación del radar» y no contiene bandejas de aprobación sustantiva de bases o encaje.
- La migración no se ha aplicado y las APIs nuevas devuelven 503 honesto mientras falte el esquema.
