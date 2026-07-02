# Entity Research Agent Visibility - 2026-07-01

## Intent

Show the Entity Research Agent in the assistants screen as a platform/superadmin service alongside the grant search loop. It analyzes consented public entity websites and proposes facts, logo candidates, and matching themes, but does not approve tenant context automatically.

## Files Touched

- `prototype/mock-data.js`
- `prototype/agents-readiness.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser check at `http://127.0.0.1:4183/?cache=entity-research-agent#view-agents` confirmed both `Busqueda de convocatorias` and `Investigador de entidad` render as `agent-card is-disabled is-platform-only`, with the superadmin note and demo trace visible.
- Browser console error check returned no errors.

## Residual Risks

- The agent is represented in prototype UI only. Real execution still needs crawler limits, persistence, audit, and review workflow.
