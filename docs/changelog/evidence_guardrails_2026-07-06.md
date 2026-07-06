# Evidence guardrails in stability checks

## Intent

Make the source-evidence robustness enforceable in routine checks, not only documented as a workflow. The key regression to prevent is selecting a neighboring same-domain PDF or showing a closed private-open call as live.

## Files touched

- `scripts/guardrails/check-source-evidence-fixtures.mjs`
- `package.json`

## Verification

- `npm run check:evidence` passed. It verifies the La Caixa catalogue entry, exact bases PDF, closed prototype row and catalogue evidence contract.
- `npm run check:stability` passed with the evidence guardrail included after typecheck and line-budget checks.

## Residual risks

- The fixture is intentionally focused on the current critical case. It does not replace broader crawler tests, PDF extraction tests, or real source-health monitoring.
