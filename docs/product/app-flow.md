# App Flow

## Primary Navigation

1. Dashboard
2. Opportunities
3. Entity Profile
4. Data Governance
5. Agents
6. Candidate Workspace
7. Audit

## Core Flow

1. Entity completes minimal onboarding: name, public website, admin email, and public-web analysis consent.
2. Entity Research Agent reads the public website within limits and proposes logo, territory, entity type, themes, collectives, and programs.
3. Entity admin reviews suggested facts before they become approved matching context.
4. User lands on dashboard with prioritized live opportunities from the platform public/private-open radar.
5. User searches iteratively with AI: filters, clarifications, exclusions, priorities, and deadline constraints.
6. Matching Agent ranks calls against approved profile facts and explains evidence.
7. User optionally enables tenant-private opportunity sources.
8. Explorer Agent refreshes public sources and, when approved, tenant-private opportunity sources.
9. User opens a call detail panel.
10. System shows fit reasons, risks, deadline confidence, public evidence, and any approved tenant facts used.
11. User preselects one or more candidates for comparison.
12. To promote a candidate, Documentary Agent must build the required Word documentation structure: memoria, checklist, annex/evidence index, and budget guide.
13. If tenant Drive is contracted and authorized, Documentary Agent may use approved tenant documents to personalize wording. If not, it must warn the user and generate only from public evidence plus approved tenant facts.
14. Generated Word files are stored in tenant-scoped Blob and remain editable/downloadable for human review.
15. Only after the documentation package exists can the candidate become an active project.
16. User reviews, edits, and exports.
17. Audit records retrieval, generation, review, project activation, and export.

## Search Modes

- Public/open radar: default mode after onboarding; uses platform-managed public grants, private-open funder calls, and minimal tenant profile.
- Private opportunity radar: optional mode; uses tenant-approved opportunity sources only.
- Combined view: merges public, private-open, and tenant-private opportunities while keeping evidence and scopes visible.
- Historical view: includes closed or archived opportunities only when the user asks for planning or precedent analysis.

## Channel Flow

1. Teams/WhatsApp/email adapter receives a user message or scheduled alert.
2. Adapter passes intent, channel, user identity, and tenant to the orchestrator.
3. Orchestrator applies permissions and calls the right agent.
4. Agent returns a short channel-safe response.
5. Sensitive details and full analysis remain in the web app through a deep link.

## Human Review Gates

- Approve internal knowledge for matching.
- Confirm uncertain eligibility.
- Generate documentation before candidate-to-project activation.
- Approve proposal export or generated Word package.
- Approve any external channel send containing non-public content.
