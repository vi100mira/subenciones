# Private entity search methodology

## Intent

Formalize a repeatable method for private-open funders that the platform has not handled before. The method should absorb variability across foundations, banks, CSR programmes, federations and external application platforms without creating live tenant alerts from weak evidence.

## Files touched

- `docs/product/private-open-entity-search-methodology.md`
- `data/private-open-funders/source-intake-template-v1.json`
- `docs/product/source-evidence-skill.md`
- `scripts/guardrails/check-source-evidence-fixtures.mjs`

## Verification

- `node -e "JSON.parse(require('fs').readFileSync('data/private-open-funders/source-intake-template-v1.json','utf8')); console.log('template json ok')"` passed.
- `npm run check:evidence` passed and now verifies that the methodology and intake template contain the expected protocol and data-contract fields.
- `npm run check:stability` passed with the methodology guardrail included.

## Residual risks

- The methodology is now enforceable at fixture/template level. Production still needs browser-assisted capture, PDF text extraction, persisted source health, and reviewer workflow before this becomes a full autonomous crawler.
