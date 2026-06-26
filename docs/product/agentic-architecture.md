# Agentic Architecture

## Principle

Agents are permissioned services, not autonomous black boxes. Each agent has a scope, allowed data classes, allowed tools, output contract, and audit trail.

## MVP Agents

| Agent | Purpose | Data access | Human gate |
| --- | --- | --- | --- |
| Explorer Agent | Find and refresh grant calls | Public sources | No |
| Match Agent | Explain fit, risks, missing data | Public grants + approved profile facts | Before action |
| Governance Agent | Classify internal snippets and block unsafe use | Metadata + user-provided snippets | Yes for internal approval |
| Documentary Agent | Extract requirements and checklists | Public bases/PDF text | Before final checklist |
| Draft Agent | Create proposal outlines | Public evidence + approved internal facts | Before export |
| Monitor Agent | Produce alerts and reminders | Match summaries + deadlines | Before non-public channel send |

## Orchestrator Responsibilities

- Authenticate user and tenant.
- Resolve intent.
- Check permissions and data policy.
- Route to one or more agents.
- Attach source evidence.
- Store audit events.
- Return channel-safe or app-rich responses.

## Channel Adapters

- Teams, WhatsApp, email, and future channels must stay thin.
- Adapters send intent to the orchestrator and display short responses.
- Full evidence, private facts, and editing remain in the web app.

## Example Channel Request

User: "Busca ayudas de insercion laboral abiertas en Comunitat Valenciana."

Response: "He encontrado 3 candidatas. La mejor encaja por territorio y colectivo, pero falta confirmar el requisito de cofinanciacion. Ver analisis completo: /opportunities/labora-2026."
