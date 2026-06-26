# Traceability Guardrails - 2026-06-26

## Intent

Add explicit human-traceability rules for agent-assisted development so the PMV remains understandable, auditable, and safe to evolve.

## Changed

- Added repository guardrails to `AGENTS.md`.
- Added `docs/product/engineering-traceability.md` with change-size, changelog, organization, review, and AI-agent expectations.
- Created local Codex skill `traceable-saas-coding` under the user skills directory.

## Verification

- Ran `quick_validate.py` against `C:\Users\vicent mira\.codex\skills\traceable-saas-coding`; result: valid.

## Residual Risks

- The skill is local to this Codex environment. Other tools or machines must copy or recreate the same guardrails.
