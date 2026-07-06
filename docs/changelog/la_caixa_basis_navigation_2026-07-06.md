# La Caixa basis navigation and archive rule

## Intent

Make private-open source verification follow the full evidence trail for Fundacion la Caixa territorial calls: official call page, status dates, documentation section, and final bases PDF.

## Files touched

- `scripts/platform/deep-scan-open-funders.mjs`
- `data/private-open-funders/platform-open-funders-v1.json`
- `prototype/private-radar-data.js`
- `prototype/ui-polish.js`
- `docs/product/source-evidence-skill.md`

## Verification

- `npm run platform:deep-scan-open-funders -- --id=fundacion-la-caixa-comunitat-valenciana-2026 --page-budget=10` returns `closed_archive_candidate`, `archive_with_evidence`, the exact official bases PDF, and status facts for opening, closing and expected resolution.
- `npm run check:stability` passed.
- Local HTTP smoke check against `http://127.0.0.1:4173` confirmed the updated script cache keys and the corrected private La Caixa row are being served. Browser automation became unresponsive during a forced cache-bust navigation, so visual confirmation should use the query-busted local URL.

## Residual risks

- The prototype still uses curated mock/private-open data. A real worker will need PDF text extraction, hash/version storage, and source health records before production use.
