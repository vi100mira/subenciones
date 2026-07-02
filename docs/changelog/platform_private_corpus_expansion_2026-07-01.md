# Platform Private Corpus Expansion - 2026-07-01

## Intent

Make the superadmin opportunities screen represent the platform corpus, not the Novaterra/demo entity fit. The platform view now keeps the raw public BDNS working set, adds a broader private-open corpus, and shows all loaded rows in the table.

## Files Touched

- `prototype/private-radar-data.js`
- `prototype/radar-data.js`
- `prototype/entity-fit.js`
- `prototype/ui-polish.js`
- `prototype/app.js`
- `prototype/opportunity-actions.js`
- `prototype/opportunity-chat.js`
- `prototype/watch-actions.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser check at `http://127.0.0.1:4183/?cache=private-corpus-2#view-opportunities` in superadmin role confirmed `Corpus cargado: 50`, with `30 Publicas cargadas` and `20 Privadas abiertas`.
- The opportunities table renders 50 loaded rows in platform mode.
- The `Privadas` filter renders 20 rows and includes private-open funders such as Fundacion ONCE / Inserta, Fundacion Adecco, Fundacion MAPFRE, CaixaBank / accion social, and Fundacion Mutua Madrilena.
- Browser console error check returned no errors.

## Residual Risks

- Private-open opportunities are still curated prototype data, not a live scrape. Real operation needs source connectors, page snapshots, hash/etag change detection, evidence capture, editorial review, and Supabase-backed pagination.
- BDNS reports more public potential results than are loaded in the prototype snapshot; the UI now labels this as pending pagination instead of pretending all rows are visible.
