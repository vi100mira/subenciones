# Platform Opportunity Counts - 2026-06-30

## Intent

Fix the opportunity dashboard count after adding private-open platform opportunities to the BDNS radar. Superadmin counts should reflect the visible platform corpus, not only the entity-fit BDNS sample.

## Files Touched

- `prototype/ui-polish.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser verification showed `Radar plataforma`, `Corpus plataforma: viendo 15 vivas o revisables`, legend `15 Vivas`, and 15 grid rows.
- Browser verification confirmed 2 platform private-open rows are included in the 15 visible rows.

## Residual Risks

- Discarded and archived counts still come from the BDNS/entity-fit fixture until private-open source health produces equivalent lifecycle metrics.
