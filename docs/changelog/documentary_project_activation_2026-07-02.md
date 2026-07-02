# Documentary Project Activation - 2026-07-02

## Intent

Make candidate activation truthful: a preselected grant does not become an active project until the Documentary Agent has prepared a Word documentation package and exposed its data-source decisions.

## Files Touched

- `prototype/opportunity-requirements.js`: adds tenant document package state, visible agent decisions, Word downloads, and the project activation gate.
- `prototype/workspace-flow.js`: shows candidature state as documentation pending, documentation prepared, or project active.
- `prototype/ui-polish.js`: changes grid activation into document preparation and labels active rows by documentation state.
- `prototype/opportunity-chat.js`: updates conversational actions so "activate" means prepare documentation, not bypass the gate.
- `prototype/ux-actions.js`: exposes the existing Word-compatible download helper for the documentation package.
- `prototype/stitch-theme.css`: adds responsive state rail, decision cards, and generated Word document cards.
- `prototype/index.html`: bumps cache keys for changed prototype assets.
- `api/candidature-document-package.ts`: adds tenant-authenticated backend persistence for generated Word packages in Blob with audit event.
- `prototype/operations-platform.js`: shows that candidature document Blob persistence is blocked by missing Blob token, not by missing endpoint.
- `scripts/platform/verify-candidature-document-package.mjs`: adds a dry-run/apply verifier for tenant-authenticated document package persistence.
- `package.json`: exposes the verifier as `npm run tenant:verify-document-package`.
- `prototype/opportunity-requirements.js`: makes each visible `Descargar Word` a native download link with Word-compatible content, and keeps a JS fallback for package downloads.
- `prototype/opportunity-requirements.js`: enriches generated Word content with grant-specific memory sections, checklist controls, budget alerts, and prebuilt annexes derived from each required document.
- `prototype/opportunity-requirements.js`: upgrades the document package to template v4; each mandatory document becomes a constructed Word piece with inferred fields, evidence, status, unique filename and human-pending limits instead of remaining a passive checklist item.
- `prototype/stitch-theme.css`: adds visible download feedback and clearer generated-document cards.
- `prototype/stitch-theme.css`: adds a constructed-document summary list for the `Documentos` tab.
- `docs/product/app-flow.md`: documents the candidate-to-project gate.
- `docs/product/agentic-architecture.md`: documents the Documentary Agent output contract.

## Verification

- `npm run check:stability` passed: TypeScript and line-budget guardrails.
- Browser check at `http://127.0.0.1:4190/?cache=document-project-flow#view-opportunities`: grid action shows `Preparar`, opens `Candidatura`, renders `Preparar documentacion Word`, records Drive/Blob/human-review decisions, exposes Word download buttons, and only then allows `Activar como proyecto`.
- Browser check confirmed the final package shows `Proyecto activo`, the candidate card shows `Proyecto activo`, and console errors are empty.
- Responsive check at 390px viewport on `#view-workspace`: no body-level horizontal overflow with the project stage and document actions visible.
- Browser check at `http://127.0.0.1:4190/?cache=document-package-backend#view-opportunities`: package generation attempted backend Blob persistence; local environment returned missing `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, UI showed the fallback reason, kept Word downloads available, and still required document generation before project activation.
- Environment audit: `.env.local` contains Supabase server credentials, but does not contain `BLOB_READ_WRITE_TOKEN`; real Blob write verification remains pending until that server-only variable is configured.
- `npx vercel env ls` confirmed the linked Vercel Preview environment has Supabase variables but no `BLOB_READ_WRITE_TOKEN`.
- Privacy adjustment: the candidature document API returns tenant Blob pathname, hash and size, not a public Blob URL for direct sharing.
- `npm run tenant:verify-document-package` dry-run reports the exact remaining prerequisites without secrets: `TENANT_AUTH_OR_TOKEN` and `BLOB_READ_WRITE_TOKEN`.
- Browser check at `http://127.0.0.1:4190/?cache=native-word-links#view-workspace`: in `Documentos`, `Descargar Word` renders as an `<a download="memoria-...doc">` with `data:application/msword` content and accepts click.
- Browser check at `http://127.0.0.1:4190/?cache=rich-doc-downloads#view-workspace`: existing local packages migrate to template v2; generated document cards show richer summaries; the annex Word payload contains `Anexo 1`, requirement provenance, prefilled content and human-pending fields; clicking `Descargar paquete Word (4)` updates the visible feedback to `Descarga iniciada: 4 documentos Word solicitados`.
- Browser check at `http://127.0.0.1:4190/?cache=constructed-docs-2#view-workspace`: existing packages migrate to template v4; `Documentos` shows 6 constructed requirement pieces plus the base package; `Descargar paquete Word (10)` is visible; requirement files use `pieza-...doc` filenames without collisions; a sample Word contains `Documento construido en la medida posible`, `Construible ahora` and `Pendiente humano/oficial`.

## Residual Risk

Word files are generated as editable Word-compatible `.doc` files. Backend Blob persistence now has an endpoint, but real Blob write verification is pending because `BLOB_READ_WRITE_TOKEN` is absent from the local environment.
