# Explorador y consulta de la Base común · 2026-07-24

## Intención

Convertir los 346 documentos observados de la entidad en una biblioteca operativa: consulta asistida, grid filtrable y ordenable, y separación real entre el corpus común y el pequeño subconjunto que puede usar cada candidatura.

## Archivos y responsabilidades

- `prototype/common-knowledge-browser.js`: consulta al puente local, citas de fragmentos aprobados, filtros, orden, paginación y acceso al visor.
- `prototype/private-knowledge.js`, `prototype/index.html` y `prototype/stitch-theme.css`: integración de Base común y presentación responsive.
- `scripts/private-corpus/query_quarantine_index.py`: recuperación FTS local limitada a una allowlist de documentos aprobados.
- `backend/app/services/private_knowledge.py` y `backend/app/main.py`: puente local autenticado, validación de tenant/fuente/aprobaciones y auditoría sin contenido.
- `supabase/migrations/20260724200000_tenant_candidature_documents.sql`: relación tenant-safe entre candidatura y documento.
- `api/tenant-candidature-documents.ts`: lectura, propuesta y revisión auditada del subconjunto; máximo 20 documentos activos.
- `prototype/candidature-document-selection.js` y `prototype/opportunity-requirements.js`: contador frente al corpus y controles confirmar/excluir.
- `scripts/guardrails/check-private-knowledge-flow.mjs`, `check-private-knowledge-bridge.py`, `check-private-quarantine-query.py`, `check-candidature-document-selection.mjs`, `check-candidature-document-ui.mjs` y `check-tenant-plan-ui.mjs`: contratos y pruebas.

## Verificación realizada

- El grid muestra todos los documentos inventariados, con búsqueda, filtros, orden y paginación.
- La consulta se bloquea cuando no hay documentos aprobados.
- La recuperación local se bloquea sin allowlist o ante un tenant/fuente distintos.
- El puente se bloquea sin sesión y audita solo hash, modo y contadores.
- Una consulta autorizada devuelve un fragmento local con título, ordinal y huella de origen; no usa fallback simulado.
- Un fragmento citado puede proponerse al expediente activo con motivo y referencias; entra pendiente de revisión.
- La candidatura conserva el UUID tenant de la recomendación y no se enlaza por un identificador visual ambiguo.
- Solo admite documentos internos aprobados; una propuesta del asistente nunca queda confirmada automáticamente.
- Prueba Playwright: `1 de 346 documentos vinculados`, una sola fila, confirmación persistida, sesión/tenant conservados y sin desbordamiento horizontal móvil.
- `npm run typecheck`, guardas de privacidad y presupuesto de líneas superados.

Capturas de QA:

- `.tmp/common-knowledge-local-query.png`
- `.tmp/candidature-document-subset.png`
- `.tmp/candidature-document-subset-mobile.png`

## Riesgos y pasos de activación

- En el estado real auditado hay 346 documentos inventariados y 0 aprobados para IA. La consulta permanecerá bloqueada hasta que una persona apruebe documentos internos.
- El modo asistido actual recupera fragmentos citados mediante FTS local; no genera una respuesta narrativa con un LLM ni realiza llamadas externas.
- La migración y la nueva API están implementadas y probadas localmente, pero no se han aplicado ni desplegado en producción en este cambio.
- El motor/agent que determine qué documentos proponer deberá llamar a la API con motivos y referencias; la UI de revisión ya está preparada.
