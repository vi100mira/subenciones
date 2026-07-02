# Entity Public Profile Agent - 2026-07-01

## Intent

Define and surface the Entity Research Agent. Tenant creation should start from minimal public information: entity name, public website, admin email, and consent. The agent proposes profile facts and logo candidates from the public web, but human review is required before using facts for matching.

## Files Touched

- `docs/architecture/entity-public-profile-agent.md`
- `docs/product/agentic-architecture.md`
- `docs/product/app-flow.md`
- `docs/product/mvp-execution-plan.md`
- `docs/product/master-context.md`
- `prototype/app.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser verification showed the `Entidades` pane with tenant minimum fields: nombre, web publica, email admin, logo opcional, and consentimiento.
- Browser verification showed the Entity Research Agent limits in UI: 12 pages, depth 2, 90 seconds, and 3 MB.
- Browser verification showed expected outputs: logo candidate, legal type, territory, programs, collectives, and themes pending admin approval.

## Residual Risks

- UI is prototype-only. Backend still needs crawler limits, logo candidate extraction, fact review persistence, audit events, and admin invitation.
