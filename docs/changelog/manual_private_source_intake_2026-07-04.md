# Manual private source intake

## Intent

Add a subsidiary path for private-open sources when the scanner cannot locate bases, and expand the private funder search with Ford Espana evidence reported by Novaterra.

## Files touched

- `scripts/platform/deep-scan-open-funders.mjs`: returns a `manual_fallback` object for `fetch_blocked`, `homepage_only`, and `needs_human_review` results.
- `data/private-open-funders/platform-open-funders-v1.json`: records manual fallback rules and adds Ford Espana source candidates.
- `prototype/private-radar-data.js`: adds Ford Espana private-open/relationship opportunities with low confidence and manual review risk.
- `prototype/platform-source-manager.js`: adds a manual bases/evidence intake panel and Ford Espana as a reviewed private candidate.

## Search evidence

- Novaterra published Ford Espana's Centimos Solidarios support for its digital transformation in 2025.
- Earlier public references also connect Ford Espana employee giving with Novaterra and social exclusion/employment work.
- Ford Construyendo Juntos appears as a community/RSC programme, but not as a public grant call with bases.

## Verification

- `npm run check:stability` passed.
- `npm run platform:deep-scan-open-funders -- --limit=14 --page-budget=3` confirmed evidence candidates for several sources and returned `needs_human_review` plus `manual_fallback` for both Ford Espana candidates.
- Ford Espana is present in the prototype radar as a low-confidence private/RSC source requiring manual review.

## Residual risk

- Ford Espana is represented as relationship/programmatic funding, not as a live open call. A human must provide bases, a contact note, or official Ford evidence before tenant alerts.
