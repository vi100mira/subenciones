# Source evidence robustness

## Intent

Make the private-open source evidence workflow robust beyond the La Caixa example. The system should prefer verified bases, avoid neighboring same-domain PDFs, expose confidence, and detect catalogue contradictions such as active sources with past deadlines.

## Files touched

- `scripts/platform/deep-scan-open-funders.mjs`
- `scripts/platform/verify-source-evidence-contract.mjs`
- `data/private-open-funders/platform-open-funders-v1.json`
- `docs/product/source-evidence-skill.md`
- `package.json`

## Verification

- `npm run platform:verify-source-evidence -- --today=2026-07-06` passed with no failures. It warns that Fundacion Botin remains monitor-only until curated bases are located.
- `npm run platform:deep-scan-open-funders -- --id=fundacion-la-caixa-comunitat-valenciana-2026 --page-budget=10` returns the exact curated bases PDF with `basis_confidence.level = high`.
- `npm run platform:deep-scan-open-funders -- --limit=4 --page-budget=3` confirms the general scanner still returns evidence candidates, archived evidence and manual fallback for blocked sources.
- `npm run check:stability` passed.

## Residual risks

- This is still catalogue and scanner robustness, not a complete production crawler. Real deployment still needs persisted hashes, PDF text extraction, source-health events, and human review queues before tenant alert automation.
