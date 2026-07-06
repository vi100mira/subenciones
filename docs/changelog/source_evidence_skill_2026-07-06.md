# Source evidence skill

## Intent

Clarify how public and private-open searches must prove bases, expose navigation to the evidence, and distinguish discarded from archived opportunities.

## Files touched

- `scripts/platform/deep-scan-open-funders.mjs`: now returns `verification_url`, `navigation_path`, `recommendation`, and a closed/archive status when evidence indicates a closed or resolved call.
- `data/private-open-funders/platform-open-funders-v1.json`: adds basis-verification rules, human verification URL requirements, and lifecycle definitions.
- `prototype/platform-source-manager.js`: explains discarded vs archived in the source manager UI.
- `docs/product/source-evidence-skill.md`: records the reusable source-evidence skill behavior for public and private-open source analysis.

## Verification

- `npm run check:stability` passed.
- `npm run platform:deep-scan-open-funders -- --limit=14 --page-budget=3` confirmed `verification_url`, `navigation_path`, and recommendations.
- Sample check: La Caixa remains `evidence_candidate`; ONCE general is `closed_archive_candidate` because its deadline has passed; ONCE empleo publico remains `evidence_candidate`; Ford requires `request_manual_verification_url`.

## Residual risk

- This is still a product/prototype contract. A global Codex skill can be installed separately after confirming the target skill folder.
