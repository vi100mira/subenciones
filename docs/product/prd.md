# PRD: Subvenciones RAG MVP

## Problem Statement

Social-impact entities need to find relevant live grants, understand eligibility, and prepare proposals without losing control of internal or sensitive data. Current tools tend to focus on drafting forms, but the harder problem is trusted matching, evidence, deadlines, and data governance.

## Product Thesis

The product should deliver value before asking for private documents. The first paid value is an AI-assisted opportunity radar over a platform-managed public corpus. A tenant only needs a minimal, low-risk profile to search, filter, and iterate over relevant opportunities.

The private RAG layer is optional and should focus on the entity's own approved opportunity sources: calls received by email, PDFs from funders, Drive/SharePoint folders with grant opportunities, federation alerts, historical opportunities, and approved internal facts used to improve matching. It is not a default ingestion of all company or entity data.

## Value Proposition

- Find live public and private opportunities without checking many portals manually.
- Iterate by natural language: territory, topic, funder type, cofinancing, deadline, eligible activity, or risk.
- Explain why an opportunity may fit or not fit, with evidence and uncertainty.
- Turn long bases into requirements, deadlines, checklists, and next actions.
- Let entities start with minimal data and add private context only when it clearly improves precision.
- Keep private opportunity sources isolated per tenant.

## Target Users

- Grants and project managers in NGOs and social enterprises.
- Direction/strategy roles deciding whether to pursue a call.
- Data/privacy administrators approving what internal knowledge can be used.

## Jobs To Be Done

- Discover relevant public calls from the platform radar.
- Optionally discover private/entity-specific opportunities from approved tenant sources.
- Refine searches iteratively with AI without exposing broad internal data.
- Understand why a call may fit or not fit the entity.
- See what internal facts were used in the recommendation.
- Identify missing information and documentation.
- Produce a proposal outline and checklist for human review.
- Receive alerts through web, Teams, WhatsApp, or email without leaking sensitive data.

## MVP Scope

- Static clickable prototype with realistic mock data.
- One pilot entity profile, implemented as a generic tenant rather than a bespoke customer.
- Minimal tenant onboarding: name, slug, owner/admin, logo/color, territory, entity type, thematic interests, alert preferences, and consent.
- Platform public radar over reusable public sources and platform vectorization campaigns.
- Public grant/opportunity list with status and deadline confidence.
- Iterative AI search over opportunities with filters, clarifying questions, and explainable ranking.
- Optional tenant-private opportunity radar for approved private sources.
- Private knowledge snippets with data classes.
- Agentic cockpit with specialist agents and audit trail.
- Matching detail with evidence, risks, internal facts, and next actions.
- Eligibility checklist and proposal outline screens.
- Tenant isolation model: each entity has its own source map, private knowledge, permissions, audit trail, and matching configuration.

## Non-Goals

- No broad ingestion of company/entity data during onboarding.
- No requirement to connect Drive/SharePoint before receiving value.
- No live BDNS/GVA/LABORA ingestion in the visual prototype.
- No real WhatsApp/Teams integration yet.
- No automated submission to public portals.
- No use of sensitive beneficiary data.

## Core Use Cases

- A new entity completes minimal onboarding and immediately searches the platform public radar.
- A grants manager opens the dashboard and sees urgent/relevant calls.
- A user refines a search iteratively: "solo Comunitat Valenciana", "sin cofinanciacion", "prioriza fundaciones privadas", "descarta europeas".
- An entity admin adds a private source containing opportunities received by email or stored in Drive.
- A user asks the Explorer Agent to refresh opportunities.
- A user opens a recommendation and sees evidence and warnings.
- A privacy owner reviews what internal data is approved for matching.
- A team receives a channel alert and follows a deep link into the app.

## Success Metrics

- Time from signup to first useful opportunity list.
- Users trust why a match was recommended.
- Users can identify unsuitable calls faster.
- Users understand what data is used and what is blocked.
- Percentage of value delivered using only minimal profile and platform-public data.
- Private source adoption only when it improves precision, not because onboarding forced it.
- The prototype is credible enough to discuss with a pilot entity before backend investment, while preserving a generic multi-tenant model.
