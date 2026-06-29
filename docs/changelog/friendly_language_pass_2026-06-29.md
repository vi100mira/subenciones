# Friendly Language Pass - 2026-06-29

## Intent

Replace technical product jargon in visible UI with language understandable by a standard entity user or gestor.

## Files Touched

- `prototype/index.html`: updates brand, navigation, platform, operations, and footer wording.
- `prototype/mock-data.js`: renames visible assistants and replaces matching/tenant/embedding-style labels with operational Spanish.
- `prototype/agents-readiness.js`: aligns readiness labels with user-facing assistant names.
- `prototype/entity-activation.js`: changes the entity activation view from tenant/agentic terminology to entity/services/information wording.
- `prototype/ux-actions.js` and `prototype/public-entry.js`: simplify policy, onboarding, audit, and platform wording.
- `prototype/assets/subvenciones-rag-logo.svg`: updates the accessible logo label.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=friendly-language#view-entity`: confirmed brand/topbar use friendly wording and Entity no longer shows `Tenant`, `Agent`, `RAG`, or `agentica`.
- Playwright on `http://localhost:5174/?v=friendly-language#view-agents`: confirmed visible assistant names are Spanish/user-facing, with 1 operative prototype assistant and 5 disabled/in-development services.

## Residual Risks

- Some internal IDs, CSS classes, filenames, and technical docs still use terms such as tenant, agent, RAG, or dashboard. That is intentional unless they are shown directly to the end user.
