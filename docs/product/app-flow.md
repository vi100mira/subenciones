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

1. Entity completes minimal onboarding: name, slug, owner/admin, territory, entity type, themes, alerts, and consent.
2. User lands on dashboard with prioritized live opportunities from the platform public radar.
3. User searches iteratively with AI: filters, clarifications, exclusions, priorities, and deadline constraints.
4. Matching Agent ranks calls against the minimal profile and explains evidence.
5. User optionally enables tenant-private opportunity sources.
6. Explorer Agent refreshes public sources and, when approved, tenant-private opportunity sources.
7. User opens a call detail panel.
8. System shows fit reasons, risks, deadline confidence, public evidence, and any approved tenant facts used.
9. Documentary Agent extracts requirements into a checklist.
10. Drafting Agent creates a proposal outline.
11. User reviews, edits, and exports.
12. Audit records retrieval, generation, review, and export.

## Search Modes

- Public radar: default mode after onboarding; uses platform-managed public opportunities and minimal tenant profile.
- Private opportunity radar: optional mode; uses tenant-approved opportunity sources only.
- Combined view: merges public and tenant-private opportunities while keeping evidence and scopes visible.
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
- Approve proposal export.
- Approve any external channel send containing non-public content.
