# Prototype Manager Clarity - 2026-06-26

## Intent

Make the prototype easier for a non-technical grants manager to understand and interact with, while keeping real BDNS radar data distinct from simulated audit, governance, operations, and candidature workflows.

## Changed

- Source map now explains that it shows sources, not opportunities, and colors active, warning, pending, and blocked states.
- Audit events include information points and can be exported as an editable Word-compatible document.
- Governance explains who controls platform and tenant sources, and source rows expose a demo management action.
- Candidature checklist actions now simulate verification, annexing, Word preparation, and Word export.
- Operations copy is less technical and explains what the screen is for.
- Platform explains that a campaign is a controlled superadmin run for sync, evidence preparation, and future embedding regeneration.

## Verification

- Ran `npm run check:stability`; typecheck and line-budget guardrails passed.
- Verified in browser that the source map now distinguishes active, warning, pending, and blocked sources.
- Verified rendered audit info points, governance owner note, operations note, platform campaign explanation, candidature actions, and Word export buttons.
- Clicked `Preparar Word`; the candidature screen added a prepared-memory note and showed a confirmation toast.
- Clicked `Exportar auditoria`; the prototype showed the Word export confirmation toast. The browser automation tool did not capture the local Blob download event, but no console errors were reported.

## Residual Risks

- Actions are prototype-only. They do not persist to Supabase and do not represent real audit records yet.
