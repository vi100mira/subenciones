# Platform Cron Details UI - 2026-06-30

## Intent

Make platform review campaigns friendlier and safer to operate. Campaigns are now expandable cards with cron help, clearer summaries, responsive control rows, and basic cron-shape validation in the prototype.

## Files Touched

- `prototype/app.js`
- `prototype/styles.css`
- `prototype/stitch-theme.css`
- `prototype/ux-actions.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser verification showed one open campaign card and two collapsed cards in `Revisiones`.
- Campaign cards now start collapsed by default and show an explicit `Abrir configuracion` affordance with open/close indicator.
- Browser verification confirmed all campaign cards start closed, one click opens a card and shows cron inputs/help, and a second click closes it again.
- Browser verification showed cron help inside the open card.
- Browser verification showed invalid cron feedback for `0 6 *` and valid feedback for `0 6 * * *`.
- UI polish adjusted platform control cards so titles and descriptions no longer run together, and cron forms flow responsively instead of stacking awkwardly.
- Browser verification confirmed the later `stitch-theme.css` override now uses balanced responsive columns instead of the old five-column operational row.
- Browser console showed no errors.

## Residual Risks

- Cron validation is intentionally basic in the prototype. Backend validation must enforce timezone, minimum cadence, daily AI cap, budget, permissions, and audit reason.
