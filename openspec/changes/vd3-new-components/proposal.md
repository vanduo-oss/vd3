# vd3-new-components

## Why

vd3's CSS tree (absorbed from the old framework) styles several surfaces
that have **no Vue counterpart anywhere in the old vue package**:
breadcrumbs, footers, FABs, the navbar's mobile/scroll behavior, the
theme switcher/customizer UI, doc search, lazy loading, and the
Fibonacci grid mode. In the old line these were either vanilla-only
(`framework/js/`) or lived as private overlays inside the vd2 docs app.
vd3 is the standalone Vue line — these capabilities need first-class,
tested, exported components/composables. This change also fixes a real
inherited bug: `VdTree`'s `cascade` prop was written as `cascade ?? true`
but Vue casts an absent optional boolean prop to `false`, so the intended
cascade-on default never applied.

## What Changes

Vanilla sources are named with line counts; old repos stay read-only
donors.

- **`VdBreadcrumb`** — markup-only, CSS-contract component (no vanilla JS
  donor; contract is `css/components/breadcrumbs.css`): `nav >
  ol.vd-breadcrumb > li.vd-breadcrumb-item` from an `items` prop or slot,
  `aria-current="page"` + `.vd-breadcrumb-current` on the last/current
  item, separator variants (`slash` default, `chevron`, `arrow`, `dot`,
  `pipe`) and `sm`/`lg` sizes as modifier classes.
- **`VdFooter`** — markup-only, CSS-contract component
  (`css/components/footer.css`): `.vd-footer` with column-count
  (`vd-footer-2col/3col/4col`), `dark` and `sm`/`lg` modifiers, and
  slot-driven sections (`.vd-footer-section`, `-heading`, `-list`,
  `-link`, `-brand`, `-social`, `-copyright`).
- **`VdFab`** — markup-only, CSS-contract component
  (`css/components/fab.css`): `.vd-fab` button with size
  (`sm`/`lg`), variant (`secondary`/`success`/`danger`, `glass`),
  `extended`, and fixed-position (`bottom-right` default, `bottom-left`,
  `top-right`, `top-left`, `center`) modifiers; plus the `.vd-fab-menu`
  speed-dial arrangement (`is-open` toggling `.vd-fab-actions`) as the
  one stateful nicety — trigger `aria-expanded`, Escape/outside close via
  `useClickOutside`.
- **`VdNavbar`** ← `navbar.js` (305 lines): mobile menu toggle
  (`is-open`/`is-active` classes, generated `.vd-navbar-overlay`,
  `body-navbar-open` scroll lock, `aria-expanded`/`aria-hidden`), Escape
  and outside-click close, auto-close on resize past
  `--vd-breakpoint-lg`, mobile dropdown submenu toggling, and the
  glass/transparent scroll-watcher — the latter **reusing the already
  carried `useNavbarGlassScroll`** instead of reimplementing it.
- **`VdThemeSwitcher`** ← `theme-switcher.js` (466 lines), reusing the
  vd3 theme layer (`useTheme` module) for persistence + application:
  cycle-button and menu UIs (`.vd-theme-switcher` markup, per-mode
  Phosphor icons and labels, `aria-checked` menu options with full
  keyboard support), system-preference tracking via
  `prefers-color-scheme`, state shared through the new theme-preference
  singleton.
- **`VdThemeCustomizer`** — **PROMOTED** from
  `vd2/src/overlays/VdThemeCustomizer.vue` (236 lines): de-pinia'd onto
  the theme-preference singleton, keeps the teleported panel + trigger +
  overlay markup, panel positioning, Escape close, and reset; gains a
  **`show-palette` prop** (default `false`, restoring the palette section
  vd2 hid) and **absorbs `font-switcher.js` (245 lines)** — the Font
  Family select drives `data-font` + `vanduo-font-preference` through the
  theme layer, so no separate font-switcher component is created.
  Outside-click close via the sanctioned new `useClickOutside`.
- **`useClickOutside`** — sanctioned NEW composable brought from
  `vd2/src/composables/useClickOutside.ts` (50 lines): capture-phase
  `pointerdown` outside a set of refs while an `enabled` ref is true,
  deferred attach so the opening click can't self-close.
- **`VdDocSearch` + `useDocSearch`** ← `doc-search.js` (1016 lines): the
  composable owns index/query/debounce/scoring/highlight/keyboard state
  over a caller-supplied document collection; the component renders the
  `.vd-doc-search` combobox/listbox markup with grouped results,
  excerpts, highlighted matches, footer hints, empty state, Cmd/Ctrl+K
  shortcut, and full ARIA (combobox, `aria-activedescendant`,
  `aria-expanded`). DOM-scan indexing is dropped (data-driven only — see
  design.md).
- **`useLazyLoad`** ← `lazy-load.js` (425 lines): low-level
  once-per-element IntersectionObserver `observe`/`unobserve`, plus the
  high-level `loadSection(url, container, options)` HTML-section fetcher
  (skeleton/spinner/custom placeholder, https/relative-URL guard,
  10 s abort, sanitized injection via the existing `sanitizeHtml`,
  `lazysection:loading/loaded/error` events) and the `[data-vd-lazy]`
  attribute wiring within a root.
- **`useGrid` + `setGridSystem`** ← `grid.js` (290 lines): per-container
  standard⇄Fibonacci mode (`vd-grid-standard`/`vd-grid-fibonacci`
  classes, `data-layout-mode` attribute, `aria-label`, `grid:modechange`
  event, `:has()` fallback inline columns) with a reactive `mode` and
  `toggle`/`setMode` controls; `setGridSystem(mode)` is the new
  document-level default setter stamping a **`data-grid` attribute** on
  `<html>`, backed by a new `[data-grid="fibonacci"]` rule block in
  `css/core/grid.css`.
- **`VdTree` cascade-default bug fix**: `cascade` moves to
  `withDefaults(..., { cascade: true })` so the documented default
  (cascade on) actually applies; the `?? true` dead branch is removed.
  Inherited from the old vue repo; **documented behavior change** for
  markup that relied on the buggy off-by-default.
- CSS: only the `[data-grid]` grid rules are new; every other class
  contract already ships in `css/components/*` (breadcrumbs, footer,
  fab, navbar, theme-switcher, theme-customizer, doc-search) — the
  class-coverage gate proves it.
- Theme layer: a module-scope reactive **theme-preference singleton**
  (`useThemePreference()`, useToast pattern) is added so
  `VdThemeSwitcher` and `VdThemeCustomizer` share one live preference —
  the de-pinia'd replacement for vd2's theme store (see design.md).
- Tests: mount spec per new SFC, jsdom spec per new composable, singleton
  spec for the preference state.

## Non-goals

- No rewrites of the 12 delegating composables and no `VdMenu` — that is
  the sibling `vd3-rewrites` change.
- No DOM-scan document indexing in `useDocSearch` (the framework's
  selector-driven index build targets static doc pages; vd3 consumers
  pass data).
- No standalone `VdFontSwitcher` — `font-switcher.js` capability is
  absorbed by the customizer + theme layer.
- No persistence for the grid system (`setGridSystem` is not stored in
  localStorage; the framework version had none either).
- No `GlobalSearchModal`/`LiveCustomizer` promotion from vd2 — docs-app
  overlays stay app-level.
- No new runtime npm dependencies; no pinia.
- No changes to the old repos (core, framework, vue, vd2, satellites).
- No npm publish; version stays pre-release.

## Capabilities

### Modified Capabilities

- `components`: seven new exported SFCs (`VdBreadcrumb`, `VdFooter`,
  `VdFab`, `VdNavbar`, `VdThemeSwitcher`, `VdThemeCustomizer`,
  `VdDocSearch`) plus the `VdTree` cascade-default behavior fix.
- `composables`: four new exported composables (`useClickOutside`,
  `useDocSearch`, `useLazyLoad`, `useGrid` + the `setGridSystem`
  helper).
- `theme-runtime`: the shared reactive theme-preference singleton
  consumed by the switcher and customizer.

## Impact

- Package: `@vanduo-oss/vd3` `.` export grows by 7 components,
  4 composables, `setGridSystem`, and `useThemePreference`. No
  exports-map changes; `sideEffects` stays CSS-only. Additive on the
  unpublished pre-release line — **semver: minor-equivalent**, with one
  scoped behavior change:
  - **BREAKING (behavioral, `VdTree`)**: `cascade` now defaults to
    `true` as documented. Old `@vanduo-oss/vue` / carryover-era markup
    that mounted `VdTree` with `checkbox` and *without* `cascade` and
    relied on the buggy non-cascading default must now pass
    `:cascade="false"` explicitly. Called out in the changelog and
    migration notes.
- API compatibility (vd2 → vd3 migration notes):
  - vd2's private overlays map to public components:
    `VdThemeSwitcher.vue` / `VdThemeCustomizer.vue` imports move from
    `@/overlays/*` to `@vanduo-oss/vd3`, and `useThemeStore()` (pinia)
    call sites become `useThemePreference()` (same field names:
    `palette`/`theme`/`primary`/`neutral`/`radius`/`font`, same setter
    verbs). `useClickOutside` keeps its vd2 signature.
  - Vanilla-framework users of `navbar.js`, `theme-switcher.js`,
    `doc-search.js`, `lazy-load.js`, `grid.js` get equivalents whose
    class/attribute/event contracts match (`grid:modechange`,
    `lazysection:*`, `body-navbar-open`, …).
- CSS: `css/core/grid.css` gains the `[data-grid]` document-default
  rules — the only stylesheet change; `dist/vd3.min.css` grows
  accordingly.
- Build/test: mount + behavior specs for every new export;
  `check:classes` gate covers the seven new components' rendered `vd-*`
  classes; docs sync flagged for vd3-docs.
- Changelog: one unreleased `@vanduo-oss/vd3` entry (packages only, per
  policy) including the `VdTree` behavior-change note.
