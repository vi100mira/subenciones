# Agent Readiness States - 2026-06-28

## Intent

Make the Agents screen honest about what is actually developed versus what is only a product direction.

## Files Touched

- `prototype/agents-readiness.js`: marks agent cards, channels, and demo runs with real readiness states without changing the core renderer.
- `prototype/app.js`: renames the screen from invocable agents to agents and capabilities.
- `prototype/index.html`: loads the readiness enhancement.
- `prototype/stitch-theme.css`: styles disabled cards, demo traces, and readiness notes.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=agent-readiness#view-agents`: confirmed title `Agentes y capacidades`, 6 cards, 5 disabled cards, 1 active prototype card, 3 disabled channels, and 3 demo run traces.

## Residual Risks

- The readiness layer is client-side and descriptive. Production should enforce agent availability by role, tenant, backend route, and audit policy.
