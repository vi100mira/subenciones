# Entity Onboarding Clarity - 2026-06-26

## Intent

Clarify that entity profile data in the prototype is not scraped or approved by default, and define a safer onboarding model for real tenants.

## Changed

- Entity screen now shows Novaterra as an editable pilot example, not a generic approved entity.
- Removed unexplained readiness percentages from the entity screen.
- Replaced approved internal facts with suggested facts pending review.
- Added safe activation flow to `docs/product/access-onboarding-and-social-pricing.md`.

## Verification

- Ran `npm run check:stability`; typecheck and line-budget guardrails passed.
- Verified with Playwright that the entity screen shows Novaterra as an editable pilot, removes unexplained percentages, and marks facts as suggested or unapproved.

## Residual Risks

- The running prototype still uses static mock data; real onboarding, email invite, auth, consent logging, and tenant activation are not implemented yet.
