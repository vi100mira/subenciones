# Platform Functional Agent Coverage - 2026-07-01

## Intent

Refocus the platform view from a curated seed/mocked pagination explanation to a functional coverage status for the operating agents: public BDNS radar, private-open radar, and entity researcher.

## Files Touched

- `scripts/radar/fetch-bdns-latest.mjs`
- `prototype/radar-data.js`
- `prototype/platform-coverage-data.js`
- `prototype/index.html`
- `prototype/ui-polish.js`
- `docs/architecture/platform-functional-coverage.md`

## Verification

- `npm run radar:bdns -- --mode=search --tipo-administracion=C --descripcion=social --descripcion-tipo=1 --pages=1 --page-size=30 --max-details=30 --detail-delay-ms=300 --retries=3` refreshed BDNS/SNPSAP on 2026-07-01T10:55:02.583Z: 572 potential public results, 30 loaded, 0 detail errors.
- `npm run platform:import-open-funders` dry-run confirmed 12 private-open official sources and 4 strict `open/open_by_territory` sources; the catalogue coverage metric keeps 6 as active/open-by-line sources.
- `npm run check:stability` passed.
- Browser check at `http://127.0.0.1:4183/?cache=functional-agents#view-opportunities` in superadmin role confirmed `30/572 Publicas BDNS`, `6/12 Privadas activas/fuentes`, and `50 Filas cargadas` render in the platform coverage block.
- Browser console error check returned no errors.

## Residual Risks

- Public BDNS is refreshed and counted for one query, but not fully paginated into Supabase yet.
- Private-open coverage is still catalogue-based; it needs scraper workers, source expansion, hash/etag checks, and editorial review before claiming broad market coverage.
- Entity researcher is represented as an operating platform flow, but still needs a real crawl/snapshot worker.
