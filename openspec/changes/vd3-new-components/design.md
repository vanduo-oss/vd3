# Design notes — vd3-new-components

## Context

Three donor classes feed this change: (1) markup-only CSS contracts that
never had JS (`breadcrumbs.css`, `footer.css`, `fab.css`); (2) vanilla
framework behaviors (`navbar.js` 305, `theme-switcher.js` 466,
`font-switcher.js` 245, `doc-search.js` 1016, `lazy-load.js` 425,
`grid.js` 290); (3) vd2 docs-app overlays that were always meant to
graduate (`VdThemeCustomizer.vue` 236, `useClickOutside.ts` 50). All CSS
already ships in vd3 except one small grid addition. vd3 has no pinia and
no `window.Vanduo*`, so promoted code must run on the vd3 theme layer and
plain Vue reactivity.

## Goals / Non-Goals

**Goals:**

- One idiomatic Vue surface per donor capability, with vanilla
  class/attribute/event parity where a vanilla donor exists.
- Reuse before reinvention: `useNavbarGlassScroll` (already carried) for
  the navbar scroll watcher, `sanitizeHtml` for lazy-section injection,
  the `useTheme` module for all persistence/application, `useClickOutside`
  for every outside-close need in this change.
- Keep vd2's markup for the promoted customizer so its CSS
  (`theme-customizer.css`, already in vd3) applies unchanged.

**Non-Goals:**

- Rebuilding vd2's docs-specific overlays (GlobalSearchModal,
  LiveCustomizer) or its search stores.
- A generic positioning engine — panel positioning stays the simple
  donor arithmetic.

## Decisions

### 1. Theme-preference singleton (`useThemePreference`) — the de-pinia'd theme store

`VdThemeSwitcher` and `VdThemeCustomizer` must share live state (vd2 used
a pinia store; the vanilla switcher used module state + `updateUI()`).
Options considered:

- **Per-component local state** — two instances drift; rejected.
- **provide/inject app plugin state** — forces `app.use()` for two
  components and breaks drop-in usage; rejected.
- **Module-scope `reactive()` singleton in the theme layer** — exactly
  the shipped `useToast` precedent; chosen.

`useThemePreference()` (in `src/composables/useTheme.ts`, extending the
existing module rather than adding a new file — per the "extend existing"
rule) lazily initializes from `loadPreference()` on first client call,
exposes the six preference fields readonly-reactively plus setter verbs
mirroring vd2's store API (`setTheme`, `setPalette`, `setPrimary`,
`setNeutral`, `setRadius`, `setFont`, `reset`), and every setter runs
`applyPreference` + `persistPreference`. A `prefers-color-scheme` media
listener re-applies while `theme === "system"` (attached on first
consumer mount, detached when the last consumer unmounts — refcounted,
SSR-safe). Same documented SSR caveat as useToast: module-scope state is
process-global; theme is a client-only concern.

### 2. VdThemeCustomizer promotion rationale

The vd2 overlay is the best-tested UI for the customizer contract and its
CSS (`tc-*`, `.vd-theme-customizer-*`) already ships in vd3 — promoting
it is markup-for-free. The de-pinia surgery is mechanical because the vd2
store's API maps 1:1 onto `useThemePreference()`. Deliberate deltas from
the vd2 source:

- **`show-palette` prop (default `false`)**: vd2 hid the Open
  Color/Fibonacci palette section as a site decision; the framework
  customizer ships it. The component keeps vd2's hidden-by-default
  behavior but restores the capability behind a prop (renders
  `PALETTE_OPTIONS` buttons wired to `setPalette`).
- **font-switcher absorption**: the Font Family select (already in the
  vd2 markup) is the `font-switcher.js` replacement — same
  `FONT_OPTIONS`, same `data-font` application and
  `vanduo-font-preference` persistence via the theme layer. A standalone
  font switcher would duplicate one `<select>`; rejected.
- **`vd:open-customizer` window event listener is kept** (cheap, lets
  apps open the panel without a template ref) alongside the exposed
  `open`/`close`/`toggle`.
- The `@/stores/theme` import and pinia types are gone; token data
  (`PRIMARY_COLORS` etc.) now comes from the vd3 root export.

### 3. VdThemeSwitcher: component, not DOM-scanner

`theme-switcher.js` scans for `[data-toggle="theme"]` and menu
containers; a Vue component owns its own markup instead. Both donor UIs
are kept as one component with a `menu` boolean prop (default `true`):
menu mode renders the vd2-proven `.vd-theme-switcher[data-theme-ui=
"menu"]` markup (toggle + `menuitemradio` options, `aria-checked`,
ArrowUp/Down/Escape, outside close); cycle mode renders a single button
cycling system → light → dark. Icons/labels use the donor's Phosphor
mapping (`ph-desktop`/`ph-sun`/`ph-moon`, "Theme: X"). The
`ThemeCustomizer` cross-notification and tooltip plumbing from the donor
are dropped — the singleton makes cross-component sync automatic, and
tooltips are the app's business (`useTooltips` exists).

### 4. VdNavbar wraps behavior around slots, reusing useNavbarGlassScroll

`VdNavbar` renders `nav.vd-navbar` with `brand` / default (menu) /
`actions` slots and owns only *behavior*: burger toggle wiring, overlay
creation, `body-navbar-open` lock, Escape/outside/resize close, and
mobile submenu toggling — all per `navbar.js`. The scroll-watcher half of
`navbar.js` (`vd-navbar-scrolled` past `data-scroll-threshold` or own
height, for `glass`/`transparent` variants) is **already carried** as
`useNavbarGlassScroll`; the component calls it instead of duplicating
(design rule: extend existing). Breakpoint resolution reads
`--vd-breakpoint-lg` with the donor's 992 px fallback so CSS stays the
source of truth.

### 5. useDocSearch is data-driven; DOM-scan indexing is dropped

`doc-search.js` builds its index by scanning
`.doc-content section[id]` — a static-docs-page assumption that is
meaningless inside an arbitrary Vue app (and vd2 replaced it with its own
stores). The composable therefore takes
`{ data: DocSearchDoc[] }` (id/title/content/category/keywords…) plus the
donor's behavior options (`minQueryLength` 2, `maxResults` 10,
`debounceMs` 150, `highlightTag` `mark` with a safe-tag whitelist,
`keyboardShortcut` Cmd/Ctrl+K) and reproduces the donor's ranking
(title > keyword > content), excerpting around the first match, and
HTML-escaped highlighting. It returns reactive
`{ query, results, isOpen, activeIndex }` + `search/open/close/navigate/
select` so `VdDocSearch` is a thin markup shell (combobox ARIA per the
donor's `setupAria`) and headless use stays possible. Callbacks
(`onSelect`…) become Vue emits on the component / return-value hooks on
the composable.

### 6. useLazyLoad keeps both donor levels

The low-level observer wrapper (fire-once callback, `threshold`/
`rootMargin`, auto-unobserve, full disconnect on scope dispose) is the
generally useful primitive. The high-level `loadSection` carries because
vd3-docs needs it and it exercises real security paths the donor already
solved: URL guard (https/relative only), 10 s abort timeout, and
sanitized injection — which in vd3 routes through the existing
`utils/sanitizeHtml` instead of the donor's private `_sanitizeNode`.
Placeholder markup (`skeleton` | `spinner` | custom HTML string, custom
going through the sanitizer) reuses the shipped skeleton/spinner classes.
The `[data-vd-lazy]` attribute wiring survives as root-scoped composable
behavior (not document auto-init).

### 7. Grid: per-container composable + document-level `data-grid` default

`grid.js` has two jobs tangled together: per-container mode switching and
the page's "which grid system" story. They split:

- **`useGrid(container, options?)`** — ports the per-container behavior:
  `vd-grid-standard`/`vd-grid-fibonacci` classes, `data-layout-mode`
  attribute (also readable as initial mode), region `aria-label`,
  `grid:modechange` event, and the no-`:has()` inline
  `grid-template-columns` fallback (1 / 1-1.618 / 2-3-5 / 1-2-3-5 /
  equal). Returns reactive `{ mode }` + `toggle`/`setMode`. The donor's
  `[data-grid-toggle]` button scanning becomes the caller's template
  binding — a Vue app binds a click to `toggle()` (with `aria-pressed`
  spec'd on the consuming pattern, not scanned).
- **`setGridSystem(mode)`** — new document-level default: stamps
  `data-grid="fibonacci"` (or removes the attribute for `standard`) on
  `<html>`, mirroring how the theme layer stamps `data-theme`. A new rule
  block in `css/core/grid.css` applies the Fibonacci template to rows
  under `[data-grid="fibonacci"]` except inside an explicit
  `.vd-grid-standard` container (closest-wins). Not persisted — it is an
  app bootstrap decision, unlike user theme preferences.

### 8. VdFab's speed-dial is the only stateful part of the CSS-contract trio

`VdBreadcrumb` and `VdFooter` are pure markup (props/slots → classes).
`fab.css` however styles `.vd-fab-menu.is-open .vd-fab-actions` — a
behavior hook with no vanilla JS donor. Minimal Vue state covers it: an
`is-open` ref on the menu arrangement, trigger `aria-expanded`, Escape +
`useClickOutside` close. No positioning logic — CSS owns it.

### 9. VdTree fix: `withDefaults`, not runtime `??`

The bug: `cascade?: boolean` without a declared default is
absent-cast to `false` by Vue's boolean-prop rules, so
`props.cascade ?? true` is dead code — `??` never sees `undefined`. Fix
at the declaration (`withDefaults(defineProps<…>(), { cascade: true })`)
and delete the runtime `??`. This is the semantically-correct fix (the
docs and the vanilla `tree.js` both cascade by default) but it flips
behavior for anyone who relied on the bug — hence the documented
behavior-change note rather than a silent patch. The mount spec pins the
new default and the `:cascade="false"` opt-out.

## Risks / Trade-offs

- [Singleton theme state across SSR requests] → same accepted trade-off
  as useToast; lazy client-only init, documented caveat.
- [Promoted customizer drifts from vd2's look] → markup carried
  byte-close and the CSS is the same file the vd2 site loads; mount spec
  asserts the `tc-*` structure.
- [Dropping doc-search DOM indexing strands someone] → the data shape
  accepts exactly what the DOM scan produced (id/title/content/category),
  so an app can still scan its own DOM and feed the result in.
- [New `[data-grid]` CSS interacts with explicit containers] →
  closest-wins precedence is spec'd with a scenario; `check:classes` and
  stylelint gate the addition.
- [`VdNavbar` double-managing scroll state with `useNavbarGlassScroll`] →
  the component adds zero scroll logic of its own; the composable is the
  single writer of `vd-navbar-scrolled`.

## Migration Plan

Additive pre-release change; no rollout machinery. vd2 → vd3 note: overlay
imports become package imports; `useThemeStore()` → `useThemePreference()`
(same fields/verbs). The `VdTree` cascade default flip is the one
behavior change and ships with an explicit changelog callout and the
`:cascade="false"` escape hatch.

## Open Questions

- None blocking. (Whether `setGridSystem` should ever persist was
  considered: no — page-level design decision, not a user preference;
  revisit only if vd3-docs grows a user-facing grid toggle.)
