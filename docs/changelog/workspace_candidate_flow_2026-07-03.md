# Workspace candidate flow

## Intent

Clarify the Candidatura screen so the user first sees the working queue of candidaturas and then the selected documentary expediente.

## Files touched

- `prototype/workspace-flow.js`: renamed the top panel to a candidate inbox, added a five-step state flow, marked the currently opened expediente, and added a stable detail anchor.
- `prototype/opportunity-requirements.js`: renders the documentary package below the candidate inbox instead of above it, and labels it as the selected expediente.
- `prototype/stitch-theme.css`: adds compact styling for the state flow and selected candidate, including responsive behavior.

## Verification

- `npm run check:stability` passed.
- Local browser check on `http://127.0.0.1:4173/index.html#view-workspace` confirmed the candidate inbox renders before the selected expediente, with 4 candidate cards and the five-step state flow visible.

## Residual risk

- This remains prototype state in local storage/session storage; backend persistence is intentionally out of scope for this slice.
