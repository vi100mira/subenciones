# Sidebar and Opportunity Toolbar Polish - 2026-06-28

## Changed

- Repositioned the collapsed-sidebar control below the product mark so it no longer interferes with the logo.
- Converted opportunity-card actions from two wide buttons plus two text links into a compact icon toolbar.
- Preserved accessible labels and native hover tooltips for the opportunity actions: analysis, bases, original text, and official API.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Browser geometry check confirmed the collapsed toggle no longer overlaps the logo.
- Browser visual check confirmed opportunity actions render as compact icons.
