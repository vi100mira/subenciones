# Entity Public Profile Agent

## Decision

Tenant creation starts from minimal public information, not a full manually completed profile. The minimum required inputs are entity name, public website, admin email, and explicit consent to analyze public web content. Logo upload is optional because the agent should first try to discover an official logo from the entity website.

The agent produces candidate facts, not approved facts. Matching can use them only after human review or in clearly marked preview mode.

## Reasonable Loop Limits

Default initial run:

- maximum 12 pages
- maximum depth 2 from the submitted website
- maximum 90 seconds wall time
- maximum 3 MB normalized text
- same-domain pages only unless an official social/legal profile is explicitly linked
- one AI interpretation pass after deterministic extraction
- stop immediately on sensitive personal data and mark for review

Recurring run:

- weekly or monthly cheap hash/etag detection
- AI only if relevant public pages changed or an admin requests reanalysis
- no daily AI loop for stable entity websites by default

## Loop

1. Create tenant shell from name, website, admin email, and consent.
2. Discover homepage, about, programs, projects, contact, news, transparency, and logo candidates.
3. Extract deterministic metadata first: title, meta tags, schema.org, favicon/logo links, headings, contact geography, and linked pages.
4. Run AI once to propose facts: legal form, territory, collectives, programs, activity themes, languages, partners, and funding relevance.
5. Store facts as `pending_review` with evidence URL and confidence.
6. Invite entity admin to approve, edit, or reject facts and upload/replace logo.
7. Match approved facts against platform public/private-open opportunities.

## Stop Conditions

The loop stops when the page budget is reached, no useful new links remain, confidence drops below review threshold, sensitive content is detected, or a reviewable profile has enough evidence for territory, themes, collectives, and programs.

## Output Contract

Every fact must include:

- fact label and value
- source URL
- extracted snippet or selector
- confidence
- data class
- review status
- last checked timestamp

No inferred fact becomes tenant-approved context without human review.
