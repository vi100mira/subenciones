# Entity Activation Cockpit - 2026-06-29

## Intent

Turn the Entity screen into a realistic tenant activation cockpit for Novaterra after signup and full-agent contracting, while making undeveloped agents explicit.

## Files Touched

- `prototype/entity-activation.js`: replaces the static entity profile with activation, contract, agent-readiness, AI-context, and next-step sections.
- `prototype/entity-activation.js`: clarifies that context rows are data-use permissions, not undeveloped features, and replaces large badges with status icons/tooltips.
- `prototype/entity-activation.js`: adds a tool map and a detected-facts review table so users can see which assistant/tool produced each proposed context item and whether it can be used.
- `prototype/entity-activation.js`: moves contracted-assistant state meanings into a shared legend and replaces long per-card badges with compact status dots.
- `prototype/index.html`: loads the entity activation enhancement.
- `prototype/stitch-theme.css`: styles the activation cockpit, contracted-agent cards, context list, and disabled next steps.
- `prototype/stitch-theme.css`: adds the assistant-state legend and compact status-dot layout to avoid text overflow inside cards.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=entity-activation#view-entity`: confirmed tenant active view for Novaterra, complete suite badge, 4 activation tiles, 6 contracted agents with real readiness, 3 AI-context rows, 3 disabled pending steps, onboarding guardrail text, and navigation to Opportunities.
- Playwright on `http://localhost:5174/?v=entity-context-icons#view-entity`: confirmed the AI-context rows use status icons/tooltips, remove the large `Aprobar` badge, and clarify that they are data-use permissions rather than undeveloped features.
- Playwright on `http://localhost:5174/?v=entity-tools-context#view-entity`: confirmed 4 tool groups, 8 visible tools, 4 detected-fact rows, pending/sin aprobar and blocked states, and removal of the unclear context phrase.
- Playwright on `http://localhost:5174/?v=entity-agent-legend#view-entity`: confirmed 3 assistant-state legend items, 6 contracted-agent cards, 6 compact status dots, and no long card badges.

## Residual Risks

- This remains prototype-local state. Production must source tenant activation, contracted agents, permissions, and context approvals from Supabase with role-based access and audit logs.
