# Corporate Drive Connectors

## Local Simulation

During PMV we simulate a company's Drive with a local folder:

```text
data/simulated_drive/Novaterra/
  Subvenciones_vivas/
  Conocimiento_interno_aprobado/
  Sensible/
```

This lets us validate classification, ingestion, audit, and future RAG flow before requesting corporate credentials.

## Google Drive / Google Workspace

Recommended pilot modes:

1. User-delegated OAuth with a user selecting or sharing a specific folder.
2. Shared Drive folder explicitly created for the pilot.
3. Domain-wide delegation only when the Workspace administrator approves a service account and narrow OAuth scopes.

Key rules:

- Prefer least-privilege scopes.
- Avoid broad domain access for the PMV.
- Store folder IDs and cursors, not credentials in code.
- Treat Shared Drives as tenant-scoped sources.
- Record admin approval and scopes in the source connection metadata.

Official references:

- Google Drive API scopes: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Google OAuth scopes: https://developers.google.com/identity/protocols/oauth2/scopes
- Google Workspace domain-wide delegation: https://knowledge.workspace.google.com/admin/apps/control-api-access-with-domain-wide-delegation

## Microsoft 365 / OneDrive / SharePoint

Recommended pilot modes:

1. Delegated Microsoft Graph permissions for a pilot user with access only to a selected folder/library.
2. SharePoint document library created for the pilot.
3. Application permissions only after admin consent and preferably with resource-specific access controls.

Key rules:

- Use Microsoft Graph for OneDrive for Business and SharePoint document libraries.
- Use delta queries to sync changes instead of rereading the whole drive.
- Store `drive_id`, `item_id`, and delta link/cursor per source.
- Avoid broad write permissions unless export/upload is explicitly needed.
- If the organization's email is hosted by Microsoft 365 but the specific email address is only an alias, shared mailbox, unlicensed mailbox, or external contact, it may not be able to complete OAuth or own a OneDrive. In that case, connect a SharePoint document library or an admin-approved application source instead of relying on that individual mailbox.

Official references:

- Microsoft Graph files and OneDrive: https://learn.microsoft.com/en-us/graph/api/resources/onedrive?view=graph-rest-1.0
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft Graph delta query overview: https://learn.microsoft.com/en-us/graph/delta-query-overview
- driveItem delta endpoint: https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0

## Connector Contract

Each corporate connector must provide:

- `source_id`
- stable external file id
- display path
- modified timestamp
- content hash or remote eTag
- mime type
- data class hint
- extracted text or binary stream for extraction
- cursor/delta state for incremental sync

## Security Baseline

- No credentials in repository.
- Encrypt tokens at rest.
- Support token revocation.
- Keep audit events for every sync.
- Allow tenant admin to disable or delete a connection.
- Never let chat channels bypass connector permissions.

## Novaterra Current Signal

This section is a pilot-specific note, not a product assumption.

Public DNS currently suggests the pilot domain `novaterra.org.es` email is routed through Microsoft 365 / Exchange Online:

- MX: `novaterra-org-es.mail.protection.outlook.com`
- SPF: `include:spf.protection.outlook.com`

There is also a Google site verification TXT record, but that only proves Google verified domain ownership for some service; it does not mean Gmail/Drive is the document provider.

For the Novaterra pilot, prefer a Microsoft Graph / SharePoint path first:

1. Ask whether `pmira@novaterra.org.es` is a licensed Microsoft 365 user, shared mailbox, alias, or external identity.
2. If it is a licensed user with OneDrive access, use delegated OAuth for a pilot folder.
3. If it is not a real OAuth-capable user, ask for a SharePoint site/document library for the pilot.
4. If IT cannot grant OAuth yet, use a manual Vercel Blob upload/drop-zone as the interim source.

For other entities, repeat provider discovery instead of assuming Microsoft:

- check MX/SPF/DMARC signals
- ask whether documents live in Google Drive, Microsoft 365/SharePoint, Nextcloud, local NAS, Dropbox, email, or another DMS
- connect the lowest-privilege source available for that entity
