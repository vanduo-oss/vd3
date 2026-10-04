# Fix verified quality gaps

Repair reproduced theme/positioning defects and the checks and documentation that missed them. Keep the existing styled, dependency-free component model and public imports. This is compatible corrective work; no package release or remote action is included.

## Scope
Library: theme-derived accents, popover reflow, TypeScript lint coverage, coverage CI, build integrity, size budgets, package documentation and shipped specification reconciliation.
Docs: Button and Accordion examples, token consumers, integration/architecture/accessibility guidance, meaningful theme browser checks and local-artifact verification. No new routes.

## Non-goals
DTCG format migration, headless components, cascade-layer conversion, per-component CSS distribution, Floating UI adoption, app-scoped state redesign, light-dark conversion, or RTL implementation. No new dependencies.

## Accepted manual-review follow-up
Separate temporary docs previews from saved site-dock mode and per-scheme primary colors. Add an opt-in bootstrap persistence policy while preserving ordinary library behavior. Repair dock accent tint, footer columns/contrast and closed mobile Navbar exposure; add the optional compact semantic gradient separator. Correct affected demos and snippets, retain click/tap popovers with keyboard dismissal, and validate the real rendered behavior.
