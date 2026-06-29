# Entity Activation Cockpit - 2026-06-29

## Intent

Turn the Entity screen into a realistic tenant activation cockpit for Novaterra after signup and full-agent contracting, while making undeveloped agents explicit.

## Files Touched

- `prototype/entity-activation.js`: replaces the static entity profile with activation, contract, agent-readiness, AI-context, and next-step sections.
- `prototype/index.html`: loads the entity activation enhancement.
- `prototype/stitch-theme.css`: styles the activation cockpit, contracted-agent cards, context list, and disabled next steps.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=entity-activation#view-entity`: confirmed tenant active view for Novaterra, complete suite badge, 4 activation tiles, 6 contracted agents with real readiness, 3 AI-context rows, 3 disabled pending steps, onboarding guardrail text, and navigation to Opportunities.

## Residual Risks

- This remains prototype-local state. Production must source tenant activation, contracted agents, permissions, and context approvals from Supabase with role-based access and audit logs.
