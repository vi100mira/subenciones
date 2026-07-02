# Opportunity Requirements Package - 2026-07-01

## Intent

Make each opportunity detail useful for real submission preparation, not only for fit scoring.

## Files Touched

- `prototype/opportunity-requirements.js`
- `prototype/index.html`
- `prototype/stitch-theme.css`
- `docs/product/prd.md`

## Verification

- `npm run check:stability` passes.
- Browser check at `http://127.0.0.1:4190/?cache=requirements-modal#view-opportunities`: opening an opportunity modal shows requirements, required documents, submission steps and scoring criteria.
- Browser check confirmed `Preparar documentacion con agente` closes the modal, opens `Candidatura`, and inserts a preparation note for the documentary agent.
- Browser check at `http://127.0.0.1:4190/?cache=workspace-package-1#view-opportunities`: opening an opportunity, clicking `Preparar documentacion con agente`, and landing in `Candidatura` shows the full imported documentary package above the active candidature.
- Follow-up UI decision: the active candidature now appears as the first Workspace panel with internal tabs for summary, requirements, documents, steps, checklist and draft. The old duplicated workbench is hidden while a documentary package is active.
- Browser check at `http://127.0.0.1:4190/?cache=workspace-tabs-1#view-workspace`: the active candidature is the first panel, tab switching works for `Documentos` and `Borrador`, the duplicate workbench is hidden, and a 390px viewport has no body-level horizontal overflow.
- Follow-up UI decision: the readable fit analysis belongs inside the active candidature, not in a blocking modal. Workspace now has an `Analisis` tab and the active card `Ver` action switches to it.
- Follow-up fix: any `Ver` action inside `Candidatura` now promotes/opens that opportunity in the tabbed candidature package and selects `Analisis`; it no longer opens the generic opportunity modal from this context.
- Preparing documentation now also promotes that opportunity to the active Workspace candidature, keeping the tabbed package and candidate list aligned.
- Workspace now reads the same public/private opportunity corpus as the Opportunities screen, so a private prepared opportunity can also become the active candidature.
- Browser verification at `http://127.0.0.1:4190/?cache=workspace-analysis-inline#view-workspace`: clicking `Ver` produced no `Analisis legible` modal, created `#documentary-agent-package`, and selected the `Analisis` tab.

## Residual Risk

The package is prototype-normalized from known opportunity types and fallback rules. Productive extraction still needs the documentary agent to parse official bases/PDFs, persist evidence snippets, and mark uncertain requirements for human review.
