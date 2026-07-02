# Platform Panes And Entities Fix - 2026-06-30

## Intent

Fix platform submenu isolation and make entity onboarding less technical. Each platform submenu now shows only its own pane, and entity creation reflects tenant onboarding concepts instead of only name, slug, and color.

## Files Touched

- `prototype/styles.css`
- `prototype/app.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser verification showed only `Revisiones` visible by default.
- Browser verification showed `Entidades` contains typed onboarding fields: nombre, tipo, territorio, email admin, slug, and color.
- Browser verification showed `Modelo` no longer displays the entity administration pane.

## Residual Risks

- Entity fields are still prototype-only. Real onboarding needs Supabase persistence, email invite flow, status transitions, and role validation.
