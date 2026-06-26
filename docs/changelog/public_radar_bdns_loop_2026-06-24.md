# Public Radar BDNS Loop

## Added

- `npm run radar:bdns` to fetch and normalize latest BDNS/SNPSAP calls.
- Generated output path: `data/public-radar/bdns-latest.json`.
- Prototype output path: `prototype/radar-data.js`.
- Prototype now prefers real radar data and falls back to mock data.
- Public radar loop documentation.

## Notes

The first loop is deliberately non-invasive: it uses only public official data and does not require tenant-private sources, embeddings, or AI calls.

## Verification

- Ran `npm run radar:bdns -- --pages=1 --page-size=20 --max-details=20`.
- Generated 20 normalized opportunities.
- Verified in Playwright at `http://127.0.0.1:4173/#view-opportunities`.
- Saved screenshot: `docs/changelog/public-radar-bdns-playwright.png`.

## 2026-06-25 Update

- Added `--mode=search` for `/convocatorias/busqueda`.
- Added state-level search through `--tipo-administracion=C`.
- Added detail retry/delay to avoid BDNS `429`.
- Added quality metrics to generated radar data.
- Ran state social query with 570 potential results and 30 normalized sample records.
