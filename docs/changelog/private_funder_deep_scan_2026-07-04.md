# Private funder deep scan

## Intent

Make private-open funder analysis go beyond the homepage before saying that bases or live calls are missing.

## Files touched

- `scripts/platform/deep-scan-open-funders.mjs`: adds a dry-run same-origin scanner that follows grant/bases/form/PDF/FAQ links to depth 2 with a per-source page budget.
- `package.json`: adds `platform:deep-scan-open-funders`.
- `data/private-open-funders/platform-open-funders-v1.json`: records the deep-scan policy in the catalogue.
- `prototype/platform-source-manager.js`: shows private-source depth expectations in the platform source manager.

## Verification

- `npm run check:stability` passed.
- `npm run platform:deep-scan-open-funders -- --limit=2 --page-budget=4` classified 403-only sources as `fetch_blocked`, not as missing bases.
- `npm run platform:deep-scan-open-funders -- --limit=8 --page-budget=3` found evidence candidates for MAPFRE, Ibercaja, ONCE, Iberdrola and Santander, including an internal Santander bases PDF.

## Residual risk

- This is still a prototype scanner. Production needs robots/terms review, retry/backoff, HTML/PDF extraction, source snapshots, hashes, editorial approval and Supabase persistence before tenant alerts.
