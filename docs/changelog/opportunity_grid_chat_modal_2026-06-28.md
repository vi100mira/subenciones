# Opportunity Grid Chat Modal - 2026-06-28

## Intent

Make Opportunities a grid-first workspace, reduce scrolling, and move analysis into modal actions.

## Files Touched

- `prototype/ui-polish.js`: makes grid the only active opportunity view, opens analysis/text in modals from row actions, and replaces plain search with a radar chat entry point.
- `prototype/opportunity-chat.js`: adds a local conversational assistant over active opportunities without external AI calls or data movement.
- `prototype/stitch-theme.css`: hides the side detail panel in Opportunities and styles the grid-only layout plus chat modal.
- `prototype/index.html`: loads the chat module and bumps asset versions.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=grid-chat#view-opportunities`: confirmed grid-only layout, no visible cards, hidden side detail panel, row `Ver` opens analysis modal, chat returns ranked results, and chat result `Ver` opens the analysis modal.

## Residual Risks

- The chat is prototype-local ranking over loaded opportunities. Production should route natural-language search through a tenant-aware backend/RAG path with audit events and clear data boundaries.
