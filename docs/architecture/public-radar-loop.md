# Public Radar Loop

## Objective

Demonstrate that the platform can read public grant opportunities at state level, normalize them, classify deadline status, and show them in the cockpit.

## Vuelta 1: BDNS Latest

Status: implemented as a reproducible local script.

Command:

```powershell
npm run radar:bdns -- --pages=1 --page-size=25 --max-details=25
```

Flow:

1. Read `/convocatorias/ultimas` from the official SNPSAP/BDNS API.
2. Enrich each item through `/convocatorias?vpd=GE&numConv=...`.
3. Normalize into the internal `GrantCall` shape.
4. Classify deadline status as `open`, `closed`, or `uncertain`.
5. Write raw-enough normalized data to `data/public-radar/bdns-latest.json`.
6. Write browser-ready data to `prototype/radar-data.js`.
7. The prototype uses real radar data when `window.RADAR.opportunities` exists and falls back to mocks otherwise.

Run result on 2026-06-24:

- Command: `npm run radar:bdns -- --pages=1 --page-size=20 --max-details=20`
- Generated opportunities: 20
- Deadline status distribution: 11 `open`, 8 `uncertain`, 1 `closed`
- Playwright verification: `docs/changelog/public-radar-bdns-playwright.png`
- Browser result: `#view-opportunities` rendered 20 BDNS opportunities with no JavaScript errors.

Official source references:

- API documentation discovered from `https://www.infosubvenciones.es/bdnstrans/estaticos/doc/snpsap-api.json`
- API base used: `https://www.infosubvenciones.es/bdnstrans/api`
- Dataset catalogue: `https://datos.gob.es/es/catalogo/e05250001-base-de-datos-nacional-de-subvenciones`

## Current Boundaries

- No AI calls.
- No private tenant data.
- No embeddings yet.
- Deadline status is conservative: relative or missing dates become `uncertain`.
- The BDNS detail API remains the source of truth for each imported call.
- Future AI interpretation is capped at daily per campaign by default; cheaper hash/API checks should run before any model call.

## Next Loops

## Vuelta 2: BDNS Search

Status: implemented.

Command used:

```powershell
npm run radar:bdns -- --mode=search --tipo-administracion=C --descripcion=social --descripcion-tipo=1 --pages=1 --page-size=30 --max-details=30 --detail-delay-ms=300 --retries=3
```

What changed:

- Uses `/convocatorias/busqueda`.
- Supports filters such as `tipoAdministracion`, `descripcion`, `descripcionTipoBusqueda`, dates, regions, beneficiary types, instruments, and finalidad.
- Adds retry and delay for detail calls to avoid BDNS `429` rate-limit errors.
- Stores query, `totalElements`, `detailErrors`, and quality metrics.
- The cockpit dashboard reads `window.RADAR.quality` and shows uncertainty/error/corpus size signals.

Run result on 2026-06-25:

- Query: Administración del Estado (`tipoAdministracion=C`) and text `social`
- Potential results: 570
- Normalized sample: 30
- Detail errors: 0
- Deadline status distribution: 6 `open`, 14 `uncertain`, 10 `closed`
- Structured deadlines: 14/30
- Bases/sede URLs: 30/30

## Next Loops

## Vuelta 4: Deadline Traceability

Status: implemented for generated BDNS output and Supabase import path.

What changed:

- Each normalized BDNS opportunity now carries deadline trace fields: observed deadline, evidence label, evidence URL, evidence publication date, agent read timestamp, next review timestamp, uncertainty reason, and tenant alarm policy.
- `npm run platform:import-bdns-radar` can import the generated BDNS JSON into `platform_opportunities` and `platform_opportunity_versions`.
- The import is idempotent: unchanged opportunities refresh `deadline_read_at` and `deadline_next_review_at`; changed content/deadline/criteria creates a new current version and supersedes the previous one.
- Dry-run is the default. Use `-- --apply=true` only when intentionally writing to Supabase.

Verification on 2026-07-02:

- Mini BDNS run: `npm run radar:bdns -- --mode=search --tipo-administracion=C --descripcion=social --descripcion-tipo=1 --pages=1 --page-size=1 --max-details=1 --detail-delay-ms=0 --retries=1 --out-dir=.tmp\deadline-trace-bdns --prototype-out=.tmp\deadline-trace-bdns\radar-data.js`
- Result: generated 1 opportunity with `deadlineObserved`, `deadlineEvidenceUrl`, `deadlineEvidenceDate`, `deadlineReadAt`, `deadlineNextReviewAt`, `deadlineUncertaintyReason`, and `tenantAlarmPolicy`.
- Import dry-run: `npm run platform:import-bdns-radar -- --input=.tmp\deadline-trace-bdns\bdns-search.json`
- Full run: `npm run radar:bdns -- --mode=search --tipo-administracion=C --descripcion=social --descripcion-tipo=1 --pages=20 --page-size=30 --max-details=572 --detail-delay-ms=180 --retries=4`
- Full result: 572/572 public opportunities, 0 detail errors, 329 structured deadlines, 228 uncertain deadlines, and 0 missing trace fields.
- Remote import: `npm run platform:import-bdns-radar -- --apply=true` inserted 572 traced current versions in Supabase. A second run refreshed 572 and created 0 duplicate versions.

## Vuelta 3: Official Evidence Metadata

Status: implemented without binary downloads.

What changed:

- Normalized `documentos` from BDNS detail into `documents`.
- Normalized `anuncios` into `announcements`.
- Removed full raw BDNS detail from browser output.
- Created `extractedText` from title, purpose, bases description, and announcement previews.
- Added `withDocuments` and `withAnnouncements` quality metrics.
- Opportunity detail now shows official documents and announcements.

Current result:

- Documents metadata: 30/30
- Announcement metadata: 19/30
- Browser data avoids full raw HTML announcements.

## Next Loops

1. Add controlled download for official documents through `/convocatorias/documentos`.
2. Add chunking for public call text and bases.
3. Add a private-open funder loop for foundations, banking social programs, CSR calls, and federation alerts.
4. Add semantic search over the public/open radar.
5. Add quality sampling: URL health, deadline accuracy, duplicate detection, and classification gaps.
6. Add source/corpus persistence in Supabase instead of browser fixture output.
