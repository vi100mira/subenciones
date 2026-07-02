# Role Plan Monetization Gate - 2026-07-01

## Intent

Fix role landing and introduce tenant plan entitlements so platform-only menus stay with superadmin and tenant menus depend on contracted modules.

## Files Touched

- `api/auth-session.ts`
- `prototype/public-entry.js`
- `prototype/auth-credentials.js`
- `prototype/tenant-plan.js`
- `prototype/index.html`
- `prototype/stitch-theme.css`
- `docs/product/access-onboarding-and-social-pricing.md`

## Verification

- `npm run check:stability` passes.
- Browser check with API runtime: superadmin entering from an old entity hash lands on `#view-platform`.
- Browser check with API runtime: Novaterra sees tenant menus plus `Plan`, but not `Plataforma` or `Operaciones`.
- Browser check with API runtime: `Plan` shows contracted status and Novaterra full pilot modules.
- Sidebar session block was visually checked after login and no longer overlaps the prototype note.
- Follow-up: for `superadmin`, the menu label changes from `Plan` to `Monitorizacion` and the screen becomes an operational/economic monitor with MRR, AI spend, active agents, active tenants and per-tenant rows.
- Follow-up: `public-entry.js` reapplies the sidebar session block when restoring a stored session, so `Salir` is visible after reload and the user can switch to a tenant account.
- Browser check at `http://127.0.0.1:4190/?cache=platform-monitoring-3#view-plan`: role `superadmin`, screen title `Monitorizacion plataforma`, 4 monitor cards, 2 tenant rows and visible `Salir`.
- Follow-up layout fix: dynamically inserted `Plan/Monitorizacion` screen is now placed before `.app-footer`, so the footer remains the final page element instead of appearing above the panel.
- Supabase check confirmed `pmira@novaterra.org.es` and `admin@novaterra.org.es` are confirmed users with active `owner` membership in `novaterra-demo`.

## Residual Risk

Plan entitlements and platform economics are still prototype configuration. Production should persist subscriptions, invoices, AI usage, agent runs and tenant cost allocation in Supabase before connecting billing or budget enforcement.
