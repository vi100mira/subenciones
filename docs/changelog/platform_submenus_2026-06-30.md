# Platform Submenus - 2026-06-30

## Intent

Reduce scrolling and visual mixing in the platform console. Superadmin functions are now separated into internal platform submenus: review campaigns, entity administration, and data model.

## Files Touched

- `prototype/index.html`
- `prototype/app.js`

## Verification

- `npm run check:stability` passed.
- Browser verification showed `Revisiones` selected by default with cron controls visible.
- Browser verification showed `Entidades` and `Modelo` submenus switch to their own panes, with no console errors.

## Residual Risks

- Submenus are frontend-only prototype state. Real permissions and route-level state still belong in the connected app.
