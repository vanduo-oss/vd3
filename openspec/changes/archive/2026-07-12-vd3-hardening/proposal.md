# vd3-hardening

## Why

The Phase 3 composable/component rewrites (`vd3-rewrites`, `vd3-new-components`)
reached vanilla-source behavior parity on the big surfaces, but four small
quality/accessibility gaps were consciously deferred rather than block those
larger changes. Each is a narrow, non-breaking correction against a named
`framework/js` (or `framework/css`) donor:

1. **`useTabs` markup parity.** The rewrite matched the donor's *behavior* but
   narrowed its *selectors*: it wires only class-based markup
   (`.vd-tabs` containers, `.vd-tab-link` links), while `tabs.js` also accepts
   the attribute forms `[data-tabs]` / `[data-tab]`. Panes already accept the
   dual `.vd-tab-pane, [data-tab-pane]` selector, so container and link markup
   is the only asymmetry. Authors porting attribute-flavored tab markup from
   the old framework silently get no wiring.
2. **`VdThemeSwitcher` keyboard a11y.** The menu-mode switcher opens and
   navigates by arrows, but two focus behaviors present in the
   `theme-switcher.js` donor were left out: pressing Escape while the menu is
   open does not return focus to the toggle button (focus is stranded on the
   menu, which is now hidden), and opening the menu by click / Enter / Space
   does not move focus into the menu (only the ArrowDown-to-open path focuses
   an option). Both are WCAG-relevant keyboard-trap / focus-management defects.
3. **`useDocSearch` excerpt for metadata-only matches.** The port's
   "no content match" branch diverges from `doc-search.js`'s `getExcerpt`: for
   a document matched on title / category / keyword whose body does not contain
   the query — including the common data-driven case of a document supplied
   with **no `content` at all** — the branch can yield a degenerate excerpt.
   The donor was DOM-scan fed and never saw an empty body; the data-driven port
   does, so the branch needs to be pinned to always produce a sensible excerpt.
4. **`glass.css` lightningcss `url()` rebasing artifact.** `css/effects/glass.css`
   is carried byte-identical from the framework donor. Its `.vd-glass::after`
   noise texture is an inline `data:image/svg+xml` URI whose SVG references its
   own inline `<filter id="n">` via `filter='url(%23n)'`. lightningcss parses
   that nested reference as a rebasable asset URL and, in the built bundle,
   rewrites it to `filter='url('effects/%23n')'` — adding an `effects/` path
   prefix **and** nesting single quotes that break the SVG attribute value. The
   fractalNoise filter therefore never applies in `dist/vd3.css` /
   `dist/vd3.min.css`. This is a real carried bug from the framework's own
   bundle, verified in the current `dist/`.

## What Changes

Each item names its read-only donor with line counts, per project rules. All
four are supersets or corrections — no existing behavior is removed.

- **`useTabs`** ← `framework/js/components/tabs.js` (317 lines): container and
  link resolution become dual selectors matching the donor —
  `.vd-tabs, [data-tabs]` for containers (the mount scan, ownership check,
  and the `show()` container lookup) and `.vd-tab-link, [data-tab]` for links
  (`linksOf`, the delegated click/keydown `closest()` lookup). Panes already
  use `.vd-tab-pane, [data-tab-pane]`. Pure additive superset: class-based
  markup keeps wiring exactly as before; attribute-flavored markup now wires
  too. No change to ARIA, keyboard, activation, or the `tab:change` event.
- **`VdThemeSwitcher`** ← `framework/js/components/theme-switcher.js`
  (466 lines): the menu-mode component adopts the donor's two missing focus
  behaviors. On Escape while the menu is open (from either the toggle or the
  menu handler), focus returns to the `.vd-theme-switcher-toggle` button
  (donor `handleMenuKeydown`: `closeMenu(...); toggle.focus()`). On open via
  click / Enter / Space, focus moves into the menu — to the active option, or
  the first option (donor `openMenu`: focuses the active `menuitemradio`).
  Cycle mode (`menu=false`) is untouched. No markup, prop, or emit changes.
- **`useDocSearch`** ← `framework/js/components/doc-search.js` (1016 lines):
  the excerpt "no content match" branch is aligned with the donor's
  leading-window intent while fixing the donor's empty-body degeneracy. When
  the query matches only title / category / keyword and the body contains no
  term (or is empty), the excerpt is the leading window of `content`
  (`content.substring(0, EXCERPT_LENGTH)`), with a trailing ellipsis only when
  the content was actually truncated, and an **empty** body yields an **empty**
  excerpt — never the donor's degenerate bare `"..."` and never a broken
  fragment. Windowed excerpts around a real content match are unchanged.
- **`glass.css`** ← `framework/css/effects/glass.css` (154 lines, carried
  identical): the `.vd-glass::after` noise data-URI is restructured so
  lightningcss cannot mis-rebase the SVG's internal filter reference. The
  built `dist/vd3.css` / `dist/vd3.min.css` must keep a syntactically valid
  data-URI whose internal filter reference resolves to the inline
  `<filter id="n">` (no `effects/` prefix, no nested-quote corruption), so the
  fractalNoise texture actually renders. This makes `css/effects/glass.css`
  the fourth deliberate divergence from the byte-identical carried CSS tree.
- Tests: the existing `use-tabs`, `use-doc-search` composable specs and the
  `vd-theme-switcher` component spec gain cases for the new contracts; a CSS
  build-output assertion pins the glass-noise fragment integrity in the bundle.

## Non-goals

- **No API breaks.** Every public signature — `useTabs(root)`,
  `useDocSearch(docs, options)`, the `VdThemeSwitcher` props/emits, and every
  `vd-*` class / `data-*` attribute contract — is unchanged. The selector and
  excerpt changes are supersets/corrections; existing call sites and markup
  keep working without edits.
- **No visual redesign.** Glass surfaces, tab styling, the theme-switcher
  menu, and doc-search result cards keep their current appearance. The glass
  fix restores the *intended* noise texture (currently silently broken); it
  does not restyle anything.
- No new components, composables, CSS classes, tokens, or exports; no new
  runtime dependencies; `sideEffects` stays CSS-only.
- No `window.Vanduo*` compatibility layer, no document-wide auto-init, no
  IIFE loading — the vd3 pure-Vue rules stand.
- No changes to the old repos (core, framework, vue, vd2, satellites) — they
  remain strictly read-only donors.
- No npm publish; the version stays on the unpublished pre-release line.

## Capabilities

### Modified Capabilities

- `composables`: `use-tabs-rewrite` widens its container/link selectors to the
  donor's dual form; `use-doc-search` pins the excerpt "no content match"
  branch so a metadata-only (or empty-body) match yields a sensible excerpt.
- `components`: `vd-theme-switcher-component` gains the donor's Escape-refocus
  and open-focus-into-menu keyboard behaviors.
- `css-distribution`: `authored-css-tree` records `css/effects/glass.css` as a
  fourth deliberate divergence (noise data-URI restructured); a new
  `glass-noise-fragment-integrity` requirement pins the built bundle's SVG
  filter reference as valid.

## Impact

- Package: `@vanduo-oss/vd3`. No exports-map, prop, emit, or `vd-*` class
  changes. Additive/corrective on the unpublished pre-release line —
  **semver: patch-equivalent, no breakage** for vd3 consumers.
- API compatibility (vd2 → vd3 migration, old `@vanduo-oss/vue@0.3.0` →
  `@vanduo-oss/vd3`):
  - `useTabs` now wires the same `[data-tabs]` / `[data-tab]` attribute markup
    the old framework's `tabs.js` did, closing a silent-no-op gap for authors
    porting attribute-flavored tab markup — a **superset**, so class-based
    markup is unaffected.
  - `VdThemeSwitcher` keyboard focus now matches the framework
    `theme-switcher.js` donor (Escape refocuses the toggle; click/Enter/Space
    open focuses into the menu). No consumer code changes; purely improved
    keyboard/AT behavior.
  - `useDocSearch` result excerpts for title/category/keyword-only matches are
    now guaranteed sensible; the `DocSearchResult` shape and the windowed-match
    excerpt are unchanged.
  - The glass noise texture now renders in the shipped CSS; consumers loading
    `@vanduo-oss/vd3/css` get the intended frosted-glass grain instead of a
    silently dropped filter. Visual delta is the *restoration* of the designed
    texture, not a redesign.
- Build/test: `pnpm build` chain unchanged; `check:classes` re-run because a
  component (`VdThemeSwitcher`) and a CSS partial (`glass.css`) change; the
  suite grows by a handful of assertions in three existing spec files plus one
  CSS build-output assertion.
- Docs: vd3-docs may note the `useTabs` attribute-markup support and the
  theme-switcher keyboard contract (docs sync flagged; happens in the docs
  repo's own change).
- Changelog: one unreleased `@vanduo-oss/vd3` entry — tabs dual selectors,
  theme-switcher focus a11y, doc-search excerpt fix, glass noise-filter build
  fix (packages only, per policy).
