# Source evidence skill

## Purpose

Guide grant-source analysis so every public or private-open opportunity is backed by clear bases, a navigable evidence trail, or an explicit human verification URL.

## Public Sources

- Prefer structured official APIs when available, such as BDNS/SNPSAP.
- Keep the official record URL, bases URL, extracted text, deadline trace and confidence.
- If BDNS gives no structured deadline or bases, keep the official announcement as fallback and mark `requires_human_review`.
- Do not infer eligibility from title alone.

## Private-Open Sources

- Start only from official funder pages, official documents, or public beneficiary evidence.
- Search same-origin links to depth 2 before declaring bases missing.
- Prioritize links containing: convocatoria, ayudas, bases, PDF, solicitud, formulario, FAQ, proyectos sociales.
- Clear bases require: official page or PDF, call title, deadline or closed status, eligible applicant text, and application channel or form.
- Return the navigation path to the bases: start page, intermediate page, final page or PDF.
- When a funder publishes a territorial call page plus separate documentation cards, keep both: the status page where dates were found and the final bases PDF where conditions are defined.
- Closed private-open calls with clear bases should be archived with evidence, not discarded and not shown as live opportunities.
- If AI cannot verify that the page is bases, show the best verification URL to a human.

## Confidence Gates

- `High`: human-curated official `basis_url` with navigation path, or exact official document with strong source-token match.
- `Medium`: same-origin page or PDF with call/bases language plus deadline/status evidence and enough source-specific match for human review.
- `Low`: possible evidence, but likely an index, neighboring call, news item, or insufficiently matched document.
- Low-confidence evidence must not create a live tenant alert. It should become `Revision humana` or manual fallback.
- A curated `basis_url` always outranks neighboring same-domain PDFs discovered during crawling.
- An active/open status with a past ISO deadline is invalid until the source is reclassified as archived or monitor-only.

## Manual Fallback

Use manual intake when:

- the funder blocks automatic fetch;
- the scan only reaches a homepage or news item;
- the opportunity is relationship-based;
- a tenant reports a real funding line but public bases are missing.

Required manual fields:

- official URL or PDF;
- call title;
- deadline text or closed status;
- summary of bases or funding conditions;
- who provided it;
- reviewer note.

Manual input creates a review candidate only. It must not create an approved tenant alert automatically.

## Lifecycle

- `Viva`: clear bases or official current evidence and not closed.
- `Revision humana`: evidence exists but bases, deadline, eligibility or channel are uncertain.
- `Descartada`: not relevant, duplicate, not a funding line, blocked without manual support, or insufficient evidence after review.
- `Archivada`: previously live or evidence-backed candidate that is closed, resolved, expired, or kept for historical traceability.

## Output Contract

Every source analysis should return:

- source id and name;
- status and recommendation;
- verification URL;
- navigation path;
- best evidence;
- status facts such as official state, opening date, closing date and expected resolution when present;
- bases confidence;
- manual fallback fields when required;
- reason for discard or archive when applicable.

## Verification

Run `npm run platform:verify-source-evidence -- --today=YYYY-MM-DD` after changing the private-open catalogue or evidence rules. The verifier checks URL shape, curated bases, navigation paths, closed-status facts and active sources with past deadlines.
