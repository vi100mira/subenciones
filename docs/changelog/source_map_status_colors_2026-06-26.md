# Source Map Status Colors - 2026-06-26

## Intent

Make the source-status panel match its own explanation so non-technical users can trust the color language.

## Changed

- Added an explicit legend for active, warning, pending, and blocked states.
- Removed the special filled BDNS treatment so all active sources use the same green status style.
- Simplified the explanatory note to avoid repeating a color promise that the UI might drift from.
- Versioned the stylesheet and made legend markers visible so the browser does not keep showing stale color rules.

## Verification

- Ran `npm run check:stability`; typecheck and line-budget guardrails passed.
- Verified with Playwright against `localhost:5173` that the legend shows active, warning, pending, and blocked states, and that source nodes use matching classes.
