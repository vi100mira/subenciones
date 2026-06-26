# Evidence Access and Roles - 2026-06-26

## Intent

Make opportunity analysis inspectable from original public sources and clarify how real login, tenant onboarding, roles, and social pricing should work.

## Changed

- Opportunity detail now links to the official BDNS record and bases URL when available.
- Opportunity cards now expose visible actions for analysis, official source, bases, and extracted text.
- Official announcement links are clickable when present.
- Opportunity detail exposes extracted text used for analysis in an expandable section.
- Added `docs/product/access-onboarding-and-social-pricing.md`.

## Verification

- Ran `npm run check:stability`; typecheck and line-budget guardrails passed.
- Verified with Playwright that opportunity detail exposes official BDNS, bases, announcement links, and an expandable extracted-text section.
- Verified opportunity cards expose clear modes: `Ver analisis`, `Bases`, `Ver texto original usado`, and `API oficial`; the API link is labeled as technical and the text action opens the extracted-text section without being overlapped by the detail panel.
- `Ver analisis` and `Ver texto original usado` now focus and highlight the detail panel so the user sees the result of the action.
- Replaced long scroll behavior with modal views for analysis and original text.
- Activated opportunity filters for `Todas`, `Criticas`, and `Privadas`, with explanatory notes.
- Added an empty-state note when a filter has no results, such as `Privadas` on the current BDNS-only radar.
- Replaced the bare numeric score with a human-readable priority label and a warning that the value is estimated, not eligibility.

## Residual Risks

- Authentication and role gates are documented but not yet implemented in the running prototype.
