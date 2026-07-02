# Platform Agents Operational Status - 2026-07-01

## Intent

Clarify that `Busqueda de convocatorias` and `Investigador de entidad` are operational superadmin/platform services. They remain platform-only, but should not appear disabled in the assistants screen.

## Files Touched

- `prototype/agents-readiness.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser check at `http://127.0.0.1:4183/?cache=platform-agents-operative#view-agents` confirmed `Busqueda de convocatorias` and `Investigador de entidad` render as `agent-card is-platform-only is-active-prototype` with `aria-disabled="false"`.
- Browser console error check returned no errors.

## Residual Risks

- The prototype marks the services as operational in UI, but real scheduled/background execution still depends on backend workers, audit persistence, and review workflows.
