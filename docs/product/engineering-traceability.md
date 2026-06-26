# Engineering Traceability

This project treats human traceability as a core product and engineering requirement. The goal is not only to make the PMV work, but to keep every change understandable, reviewable, and reversible.

## Change Size

- Prefer small diffs with one clear intention.
- Split work when a change is likely to exceed about 250 changed lines.
- Avoid opportunistic refactors and formatting sweeps.
- Add abstractions only when they remove real complexity or match an existing local pattern.

## Change Notes

For non-trivial work, add a changelog note in `docs/changelog/` with:

- intent
- files or areas touched
- verification performed
- known residual risks
- privacy, tenant-isolation, or audit implications when relevant

## Code Organization

- Keep mock data outside UI control flow.
- Keep prototype UI separate from backend functions.
- Keep Supabase migrations focused on one schema concern.
- Keep scripts purpose-specific and documented by filename and usage.
- Prefer domain names that a product owner can recognize.

## Review Gates

Before closing a task, verify the narrowest meaningful surface:

- browser check for prototype UI
- typecheck or tests for TypeScript/API work
- migration review for schema/RLS changes
- sample input/output for scripts or ingestion workers

If verification cannot be performed, record why and what risk remains.

## AI Agent Use

Agents working in this repository should:

- announce intended files before editing
- avoid hidden broad rewrites
- preserve human approval gates
- explain changes by intent and file
- keep evidence and provenance visible in grant matching flows
- never cross tenant-private data boundaries for convenience
