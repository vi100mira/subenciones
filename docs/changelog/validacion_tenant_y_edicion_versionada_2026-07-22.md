# Validación experta por tenant y edición documental versionada

Versión preparada: `0.2.7`.

## Intención

Situar cada decisión donde está el conocimiento: la plataforma garantiza procedencia e integridad técnica, la entidad valida la interpretación para su candidatura y una persona edita y aprueba el borrador final.

## Archivos y comportamiento

- `tenant_bases_acceptances` conserva aceptación o discrepancia por tenant y versión, con hash, actor y RLS sin escritura cliente.
- `bases-review-request` expone evidencia, registra ambas decisiones y audita su alcance exclusivo al tenant.
- `platformBases`, el encolado, el worker y la exportación revalidan la misma puerta; una discrepancia bloquea.
- El visor cambia «Validación de plataforma» por «Validación experta de tu equipo» y permite revisar citas, validar o discrepar.
- `tenant_draft_versions` conserva versiones humanas inmutables. Solo los párrafos son editables; estructura, requisitos, evidencias y firma permanecen bloqueados.
- `draft-document-versions` crea, rechaza, aprueba y reactiva versiones con auditoría. La exportación usa el contenido y hash exactos de la versión aprobada.
- El asistente de ayuda y la documentación funcional describen el flujo real.

## Privacidad y gobierno

- Todas las decisiones y versiones incluyen `tenant_id`; no se recuperan datos de otra entidad.
- Las mutaciones pasan por APIs con `sources:write`; RLS de cliente es solo lectura.
- Los hashes de contratos y versiones usan JSON canónico para que el orden interno de claves de Postgres `jsonb` no produzca falsos bloqueos de integridad.
- Editar no habilita presentación: `submissionAllowed` permanece en `false` y la exportación continúa siendo privada.

## Verificación

- `npm run check:tenant-bases`
- `npm run check:draft-versions`
- `npm run typecheck`
- `npm run check:stability`
- Comprobación de aceptación, discrepancia, edición, historial y aprobación en navegador.

## Riesgos residuales

- Las migraciones deben aplicarse antes del despliegue del código.
- El panel agregado de discrepancias para plataforma queda como siguiente mejora operativa; la incidencia ya se registra y bloquea al tenant.
