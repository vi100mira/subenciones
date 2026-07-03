# Entity Context Permissions - 2026-07-03

## Intent

Replace the confusing `Validacion humana` fact-review card with a clearer context-permissions card. The previous copy looked like detected beneficiary/intervention facts and did not explain what the user should do.

## Files Touched

- `prototype/entity-activation.js`

## Verification

- `npm run check:stability` passes.
- Local browser check as Novaterra entity confirms the new `Permisos de contexto` card renders.
- Local browser check confirms `Acompanamiento individual` and `Casos personales` no longer appear on the entity screen.

## Residual Risk

This is prototype UI copy and state only. It does not grant backend permissions, connect private sources, or change tenant data access rules.
