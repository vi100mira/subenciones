# Platform RAG Total Opportunities - 2026-07-01

## Intent

Separate the superadmin/platform corpus count from the tenant-fit opportunity count. In platform role, the opportunities screen should show the total RAG corpus discovered by platform agents, not the Novaterra/demo entity view.

## Files Touched

- `prototype/ui-polish.js`
- `prototype/stitch-theme.css`
- `prototype/app.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser check at `http://127.0.0.1:4183/?cache=platform-rag-total#view-opportunities` with `body[data-role="superadmin"]` confirmed the page title is `Corpus RAG plataforma`.
- The platform summary renders `572 Total RAG`, `570 Publicas`, `2 Privadas abiertas`, and states that the table shows 15 loaded rows for review.
- Browser console error check returned no errors.

## Residual Risks

- The prototype still loads only a sample table of opportunities. The platform total is derived from the BDNS `totalElements` snapshot plus curated platform-private open mocks until backend corpus counts are wired from Supabase.
