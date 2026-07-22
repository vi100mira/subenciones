# ADR: Validación experta de bases por tenant (doble puerta)

Decidido e implementado el 22 de julio de 2026. Estado: operativo en código; requiere aplicar las migraciones y desplegar para activarse en cada entorno.

## Contexto

Las interpretaciones de bases (`platform_bases_interpretations`) son conocimiento compartido entre tenants. Hasta ahora una única puerta —la aprobación del superadministrador de plataforma— habilitaba la redacción. Esto mezclaba dos juicios distintos:

1. **Juicio técnico**: citas literales, documento correcto, hash verificado. Lo realiza el validador automático (`citations_verified`).
2. **Juicio experto**: si las cláusulas reflejan las bases reales y aplican al caso de la entidad. Ese conocimiento vive en la gestora de subvenciones del tenant, no en plataforma.

El resultado era una puerta firmada por quien no tiene el conocimiento (plataforma opera sobre todo el agente buscador) y una entidad experta sin capacidad de actuar.

## Decisión

Separar las dos puertas:

| Puerta | Quién | Qué firma | Efecto |
| --- | --- | --- | --- |
| Técnica | Validador automático + plataforma | Integridad de la evidencia (citas, procedencia, hash) | La lectura queda `review_required` con `citations_verified` |
| Experta | Persona del tenant con permiso `sources:write` | Que las cláusulas reflejan las bases y valen para su candidatura | Abre la redacción **solo para ese tenant** |

- La aceptación del tenant se registra en `tenant_bases_acceptances` con los `interpretation_ids` aceptados, un hash del contrato combinado, actor y fecha. Es por versión de la convocatoria: si el radar detecta bases nuevas, la aceptación anterior no cubre la versión nueva.
- La aprobación de plataforma sigue existiendo con dos funciones: publicar la interpretación como aprobada para **todos** los tenants y resolver incidencias (lecturas fallidas, discrepancias señaladas). Deja de ser el cuello de botella del juicio experto.
- Un tenant puede **señalar discrepancia** en lugar de aceptar: queda registrada con su nota, bloquea su propia redacción sobre esa lectura y escala a plataforma como incidencia con el conocimiento experto adjunto.

## Puerta efectiva de redacción

Una interpretación cuenta para el contrato de requisitos de un tenant si:

- `status = approved` y `citations_verified` (aprobación de plataforma, válida para todos), **o**
- `status = review_required`, `citations_verified` y existe aceptación vigente de ese tenant sobre ese `interpretation_id`.

La regla se aplica de forma uniforme en el encolado (`draft-agent-runs`), el worker (`run-draft-agent.mjs`) y la exportación (`approved-draft-document`). Cada puerta vuelve a cargar la decisión del tenant, comprueba que pertenece a la versión vigente y verifica el `contract_hash`. Una discrepancia vigente bloquea la redacción de ese tenant incluso si plataforma había publicado la lectura. La revisión humana final permanece obligatoria.

## Modelo de datos

`tenant_bases_acceptances`: `tenant_id`, `opportunity_version_id`, `interpretation_ids uuid[]`, `contract_hash`, `status` (`accepted` | `discrepancy_reported`), `note`, `accepted_by`, `created_at`, `updated_at`; única por (`tenant_id`, `opportunity_version_id`). RLS permite lectura a miembros, pero no mutaciones directas desde el cliente. La API servidor exige `sources:write`, fija el actor autenticado y registra el evento de auditoría. La tabla valida hash, contenido mínimo por estado y mantiene `updated_at`. La migración es `supabase/migrations/20260722190000_tenant_bases_acceptances.sql`.

## Estados visibles para la entidad

`/api/bases-review-request` añade a los estados previos:

- `ready_for_entity_review`: citas verificadas; falta el juicio experto del tenant.
- `accepted_by_entity`: el tenant aceptó; su redacción queda habilitada aunque plataforma no haya publicado aún.
- `discrepancy_reported`: el tenant señaló un problema; su redacción queda bloqueada hasta nueva lectura o intervención de plataforma.

El panel «¿En qué punto está esta solicitud?» presenta la fase 2 como «Validación experta de tu equipo». La persona revisa cláusulas, citas, páginas y enlaces oficiales, y puede validar para su candidatura o señalar una discrepancia motivada.

## Fases de despliegue

1. **Persistencia y aislamiento (completada)**: tabla privada con invariantes, hash y RLS sin escritura cliente.
2. **Puerta funcional (completada)**: API auditada, controles de entidad y revalidación uniforme en encolado, worker y exportación.
3. **Incidencias de plataforma (pendiente)**: agrupar discrepancias por convocatoria y permitir reencolar lecturas.
4. **Métricas de calidad (pendiente)**: medir fuentes a partir de aceptaciones y discrepancias.

## Riesgos y mitigaciones

- **Activación parcial**: la validación experta responde `503` si falta su migración. La aprobación global ya existente continúa disponible, pero la interfaz no finge que el tenant ha validado ni abre esa nueva vía de redacción.
- **Aceptación experta errónea**: afecta solo al propio tenant; la exportación sigue exigiendo revisión humana del borrador y las citas siguen visibles en cada documento.
- **Divergencia entre tenants** (uno acepta, otro discrepa): es información, no un conflicto; plataforma la ve como señal de calidad de la lectura.
- **Versión nueva de las bases**: la aceptación no se hereda; la fase 2 del panel vuelve a «pendiente» automáticamente.
