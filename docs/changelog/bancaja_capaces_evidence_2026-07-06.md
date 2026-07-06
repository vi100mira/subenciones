# Bancaja Capaces evidence capture

## Intent

Promote the Fundacion Bancaja - CaixaBank Capaces page from a generic private-open prototype row to an evidence-backed archived opportunity with official page, application URL, bases PDF, status and closing date.

## Files touched

- `data/private-open-funders/platform-open-funders-v1.json`
- `prototype/private-radar-data.js`
- `prototype/index.html`
- `scripts/guardrails/check-source-evidence-fixtures.mjs`

## Verification

- `npm run platform:deep-scan-open-funders -- --id=fundacion-bancaja-social --page-budget=8` returns `closed_archive_candidate`, `archive_with_evidence`, the exact official bases PDF and `basis_confidence.level = high`.
- `npm run check:evidence` passed with the Bancaja fixture included.
- `npm run check:stability` passed.
- Local HTTP check confirmed `private-radar-data.js?v=20260706-bancaja-bases` is served with the updated Bancaja row and evidence.

## Residual risks

- The page says selected projects would be known at the end of June. The prototype now archives the closed call and monitors it; it does not yet ingest the selected-projects result if published later.
