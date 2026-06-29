# Agent Readiness States - 2026-06-28

## Intent

Make the Agents screen honest about what is actually developed versus what is only a product direction.

## Files Touched

- `prototype/agents-readiness.js`: marks agent cards, channels, and demo runs with real readiness states, and clarifies that Explorer Agent is a platform/superadmin capability for public-source ingestion.
- `prototype/agents-readiness.js`: moves long readiness badges out of agent cards into a shared legend and replaces per-card labels with compact status dots.
- `prototype/app.js`: renames the screen from invocable agents to agents and capabilities.
- `prototype/index.html`: loads the readiness enhancement.
- `prototype/stitch-theme.css`: styles disabled cards, demo traces, readiness notes, and compact agent-state dots.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=agent-readiness#view-agents`: confirmed title `Agentes y capacidades`, 6 cards, 5 disabled cards, 1 active prototype card, 3 disabled channels, and 3 demo run traces.
- Playwright on `http://localhost:5174/?v=agent-platform-scope-2#view-agents`: confirmed Explorer is the only superadmin/platform card, still disabled for entity view, and notes that current radar data is fixtures/snapshot.
- Playwright on `http://localhost:5174/?v=agent-panel-legend#view-agents`: confirmed 3 legend items, 6 agent cards, 6 compact status dots, and no large badges inside agent cards.

## Residual Risks

- The readiness layer is client-side and descriptive. Production should enforce agent availability by role, tenant, backend route, and audit policy.
