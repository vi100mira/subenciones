# Private-open entity search methodology

## Purpose

Provide a repeatable method for researching private-open funders that the product has not handled before. The goal is not to scrape everything. The goal is to decide, with evidence, whether a private entity exposes a usable funding opportunity, a monitor-only source, a relationship-based lead, or nothing reliable.

This method applies to foundations, banking social programmes, obra social, corporate social responsibility lines, federations, associations, prizes, challenge calls and private platforms.

## Operating Principles

- Start from official or funder-controlled evidence.
- Separate funder identity from call identity. A funder page is not yet an opportunity.
- Do not create a live tenant alert from low-confidence evidence.
- Prefer precise child opportunities over broad parent indexes.
- Preserve the path a human would follow to verify the result.
- Keep tenant-private information out of public/private-open source discovery.
- Use manual review when automation is blocked, ambiguous or relationship-based.

## Unseen Entity Protocol

### 1. Identify the funder

Capture the official identity before looking for calls:

- legal or public name;
- official website domain;
- known programme names;
- territory;
- funder type: foundation, banking foundation, corporate CSR, federation, prize, platform, relationship-based;
- themes relevant to third-sector tenants.

Reject or pause if the only evidence is a third-party blog, press mention, social post or tenant memory without a funder-controlled URL.

### 2. Find the source entry point

Search the official domain first. Useful paths and labels:

- convocatorias, ayudas, becas, premios, proyectos sociales;
- accion social, obra social, fundacion, sostenibilidad, responsabilidad social;
- bases, documentos, descargas, solicitud, formulario, inscripcion;
- archivo, resoluciones, seleccionados, beneficiarios.

If the official site points to an external application platform, keep both URLs. The platform URL alone is not enough unless the official site links to it.

### 3. Split parent indexes from child opportunities

Classify each found page:

- `parent_index`: list of calls, territories or programmes.
- `child_call`: concrete edition with title, dates, territory, documents or application route.
- `basis_document`: PDF, DOCX or official page with rules.
- `application_channel`: form, platform, email, sede or application URL.
- `result_or_archive`: selected projects, resolved calls, old edition.
- `news_or_beneficiary`: useful signal, but not enough for live opportunity.

Only `child_call` plus basis or application evidence can become a review candidate.

### 4. Follow the navigation to bases

For each child call, keep:

- start URL;
- intermediate labels a human would click;
- final bases URL or final verification URL;
- application URL if separate;
- status facts: opening, closing, state, resolution, amount, territory.

If several PDFs on the same domain match generic words like "bases", prefer the one that also matches source-specific tokens such as funder, territory, year, programme or call slug. A human-curated `basis_url` with navigation path wins over neighboring same-domain PDFs.

### 5. Decide lifecycle

Use these statuses:

- `viva`: clear bases or official current evidence and not closed.
- `revision_humana`: evidence exists but bases, deadline, eligibility, amount or channel are uncertain.
- `archivada`: evidence-backed call that is closed, resolved, expired or useful for traceability.
- `descartada`: irrelevant, duplicate, non-funding line, blocked without manual support or insufficient evidence after review.
- `monitor_only`: official funder or programme worth watching, but no live concrete call yet.

Closed with evidence is archived, not discarded.

### 6. Assign confidence

- `high`: official child call plus exact basis URL, status/date facts and navigation path.
- `medium`: official page or PDF with call language and partial status/date facts; needs human confirmation before alerting tenants.
- `low`: index, news, nearby PDF, old edition, unclear call, blocked fetch or relationship clue.
- `none`: no usable official evidence reached.

Low and none cannot create tenant alerts.

## Variability Patterns

| Pattern | Example handling |
| --- | --- |
| Territorial funder page with document cards | Keep status page and bases PDF. Archive if closed. |
| Parent page with many territories | Keep parent as monitor-only and create one child source per territory/edition. |
| External application platform | Keep official page as provenance and application URL as channel. |
| PDF-only call | Accept only if the PDF is official/funder-controlled and has call title plus deadline/status. |
| News/beneficiary article | Use as signal or manual lead; do not treat as open call. |
| Relationship programme | Require manual note/contact evidence before creating review candidate. |
| Cookie/403/JS blocked page | Do not infer missing bases. Use manual fallback or browser-assisted evidence capture. |
| Old closed edition | Archive with evidence and monitor for next edition. |

## Search Stop Conditions

Stop automatic search and request human verification when:

- only a homepage or broad CSR page is found;
- only a news item or selected-projects page is found;
- the site blocks automatic fetch and no curated basis URL is known;
- the scanner finds multiple plausible PDFs but source-token match is weak;
- title, year, territory or deadline contradict each other;
- application route requires login and no public bases are visible.

Stop and discard when:

- the page is not a funding, grant, prize, sponsorship or collaboration line;
- the opportunity is outside target geography and not reusable as a platform source;
- official source cannot be identified after manual review;
- evidence is duplicate of an already tracked call.

## Data Contract

Every accepted source or review candidate should use the intake template in `data/private-open-funders/source-intake-template-v1.json`.

Required before tenant alert:

- `id`;
- `name`;
- `url`;
- `funder_type`;
- `territory`;
- `opportunity_status`;
- `deadline_text`;
- `deadline_confidence`;
- `evidence_quality`;
- `watch_fields`;
- `basis_confidence`;
- `navigation_path`;
- either `basis_url` or `manual_fallback`.

Required before live/recommended status:

- exact call title;
- official current status or deadline;
- basis URL or official page with rules;
- applicant eligibility evidence;
- application channel;
- human review decision.

## Human Review Questions

- Is this a specific call or only a funder/programme page?
- Does the final document actually correspond to this title, territory and year?
- Is the opportunity still open as of the review date?
- Can a tenant understand where the evidence came from?
- Would recommending this require tenant-private facts or sensitive data?
- Should the row be live, review, archived, discarded or monitor-only?

## Examples

- Fundacion la Caixa Comunitat Valenciana 2026: official territorial page plus document card. Status closed, exact bases PDF, archived with evidence.
- Fundacion Bancaja CaixaBank Capaces 2026: official call page plus application URL and bases PDF. Status exhausted deadline, archived with evidence.
- Ford relationship evidence: beneficiary/news evidence only. Manual fallback, not live.

## Acceptance Criteria

The method is working when a new private funder can be processed into one of these outcomes without special-case code:

- high-confidence live/review candidate;
- archived evidence-backed call;
- monitor-only parent source;
- manual fallback request;
- discarded non-opportunity.

The product should always be able to answer: what did we find, where did we find it, why do we trust it, and what should a human do next?
