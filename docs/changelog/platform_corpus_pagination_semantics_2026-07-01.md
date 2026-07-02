# Platform Corpus Pagination Semantics - 2026-07-01

## Intent

Clarify the superadmin corpus counters and fix the responsive layout. The platform view must distinguish loaded demo rows from the larger public source universe and from the private-open seed corpus.

## Files Touched

- `prototype/ui-polish.js`
- `prototype/stitch-theme.css`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser check at `http://127.0.0.1:4183/?cache=corpus-responsive-2#view-opportunities` confirmed the platform corpus text now says `50 Muestra cargada`, `30/570 Publicas paginadas`, and `20 Semilla privada`.
- Responsive browser checks at normal panel width and 700px viewport confirmed the metric cards stay inside `#entity-fit-note` with no horizontal overflow.
- Browser console error check returned no errors.

## Residual Risks

- The prototype still does not paginate all 570 BDNS public results or scrape the private market live. The 20 private-open records are an initial curated seed, not a complete count of foundations, banks, companies, or obra social funders.
