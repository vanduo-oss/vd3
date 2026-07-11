# vd3-rewrites

## Why

`vd3-carryover` deliberately left a hole in the surface: the 12 old-line
composables that delegated to `window.Vanduo*` globals (or reproduced the
framework's DOM-scan init) were excluded, and `VdMenu` — the one SFC that
imports one of them (`useDropdown`) — was deferred with them. vd3 bans the
IIFE runtime outright, so those composables cannot be carried; they must be
rewritten pure-Vue against their vanilla sources. Until that happens, apps
migrating from old `@vanduo-oss/vue@0.3.0` lose dropdowns, drag-and-drop,
lightboxes, carousels, validation, guided tours, and the menu component —
the last gap between the vd3 line and the old package's documented surface.

## What Changes

Each rewrite names its vanilla source in `framework/js/` (read-only donor)
with line counts, per project rules. Every old shim's public API —
`useX(root: Ref<HTMLElement | null>): void` — is preserved exactly;
extensions (an optional `options` argument and/or a returned controller) are
optional and documented per item. Behavior parity targets the **vanilla
source** (options surface, ARIA, keyboard, state classes, custom events),
not the shim's thin wrapper.

- **`useRipple`** ← `ripple.js` (74 lines): pointer-position
  `.vd-ripple-wave` spawn on `.vd-ripple` / `[data-vd-ripple]`, removal on
  `animationend`, wave cleanup on teardown.
- **`useSearch`** ← `search.js` (107 lines): the process-global search-source
  registry (`register` / `unregister` / `list` / `query`) becomes a
  module-scope singleton (useToast pattern); the shim's `useSearch(root)`
  lifecycle signature keeps working and now also returns the registry.
- **`useExpandingCards`** ← `expanding-cards.js` (148 lines): click /
  Enter / Space activation, Arrow / Home / End roving focus,
  `role="button"` + `aria-pressed` sync via MutationObserver,
  `is-active` state class.
- **`useValidate`** ← `validate.js` (196 lines): the 10 declarative rules,
  `data-vd-rules` piping, blur / input / submit modes,
  `is-valid` / `is-invalid` + `.vd-validate-error` (role=alert,
  `aria-invalid`, `aria-describedby`), `validate:submit` event; keeps the
  shim's documented per-field `data-vd-validate-mode` override and
  match-by-element-id extension.
- **`useTimeline`** ← `timeline.js` (255 lines): staggered
  IntersectionObserver reveal for `.vd-timeline-animated`, reduced-motion
  instant reveal, and the `.vd-timeline-playback` stepped-control mode
  (prev / next / play / pause buttons with disabled + `aria-pressed`
  bookkeeping).
- **`usePopover`** ← **merge of `bubble.js` (211 lines) + `popover.js`
  (294 lines)**: one composable wires both markup contracts — the
  attribute-built rich bubble (`[data-vd-bubble]` / `[data-vd-popover]`,
  body-appended `.vd-bubble-content`, sanitized HTML via the existing
  `sanitizeHtml`) and the target-panel primitive (`.vd-popover-trigger` +
  `data-vd-popover-target`, click | hover | focus triggers, placement flip).
  See design.md for the merge rationale.
- **`useFlow`** ← `flow.js` (264 lines): slide/fade carousel with controls,
  indicators, keyboard arrows, pointer/touch swipe, autoplay pause-on-hover/
  focus, live-region announcements, `flow:change`; keeps the shim's
  indicator bridge (bare `<button>`s inside `.vd-flow-indicators` gain
  `.vd-flow-indicator`).
- **`useTabs`** ← `tabs.js` (317 lines): full parity — the old shim was a
  minimal reimplementation; the rewrite restores roving tabindex, tablist/
  tab/tabpanel ARIA wiring, Home/End + orientation-aware arrows,
  Enter/Space, disabled skip, three-way pane resolution, first-tab
  auto-activation, and `tab:change`.
- **`useSpotlight`** ← `spotlight.js` (325 lines): JSON-driven guided tour
  from `[data-vd-spotlight]` triggers, overlay + step tooltip built on
  `body`, Back/Skip/Next/Done controls, Escape / overlay-click stop, focus
  restore, `spotlight:step` / `spotlight:end`; programmatic
  `start` / `stop` / `next` / `prev` exposed as a documented extension.
- **`useDropdown`** ← `dropdown.js` (369 lines): toggle + menu ARIA
  contract, `is-open` state classes, outside-click close, full keyboard set
  (open keys, arrow cycling, Home/End, Escape-with-refocus, 500 ms
  typeahead), item selection (`active`/`is-active`, button-label update,
  `dropdown:select`), viewport-aware auto-placement classes.
- **`useImageBox`** ← `image-box.js` (417 lines): shared singleton
  lightbox backdrop, dual-source resolution
  (`data-image-box-full-src` → `data-image-box-src` → `src` → `href`),
  captioning, scroll-lock with scrollbar compensation, click / Escape /
  scroll-past-threshold dismissal, focus restore, broken-image marking,
  keyboard access for non-interactive triggers, `imageBox:open/close`.
- **`useDraggable`** ← `draggable.js` (819 lines): HTML5 drag + touch
  fallback + keyboard reorder, list containers
  (`.vd-draggable-container[-vertical]`, `role="listbox"`, midpoint
  auto-sort), drop zones (`.vd-drop-zone`, `is-drag-over`,
  `draggable:drop`), drag feedback element, `aria-grabbed` bookkeeping, the
  five `draggable:*` events.
- **`VdMenu` un-deferred**: the 68-line donor SFC from the old vue repo
  carries byte-faithful (label/items/align props, `select` emit,
  `.vd-dropdown` markup with menu/menuitem roles) — the only edit is that
  its `useDropdown` import now resolves to the pure rewrite.
- Barrel: `src/index.ts` gains the 12 composable exports and `VdMenu`.
- Tests: one jsdom behavior spec per rewritten composable and a `VdMenu`
  mount spec, satisfying the existing `composable-behavior-specs` /
  `component-mount-specs` requirements.

## Non-goals

- No new components beyond un-deferring `VdMenu`, and no new CSS — every
  class these composables toggle already ships in vd3's `css/` tree
  (`ripple.css`, `bubble.css`, `popover.css`, `spotlight.css`,
  `draggable.css`, `image-box.css`, `flow.css`, `tabs.css`, `timeline.css`,
  `expanding-cards.css`, `dropdown.css`, `forms.css`).
- No `window.Vanduo*` compatibility layer, no document-wide auto-init, no
  `Vanduo.register` lifecycle — pure per-instance composables only.
- No re-introduction of the framework's global `destroyAll()` semantics:
  teardown is per-instance by design (documented behavior improvement).
- No SFC wrappers for these behaviors (e.g. a `VdCarousel`) — that is
  future work; this change restores the composable surface only.
- No changes to the old repos (core, framework, vue, vd2, satellites) —
  strictly read-only donors.
- No npm publish; version stays pre-release.

## Capabilities

### Modified Capabilities

- `composables`: the 12 delegating/DOM-scan composables are rewritten
  pure-Vue with vanilla-source behavior parity (one requirement per item);
  the carryover-era exclusion requirement is removed and replaced by a
  pure-rewrite surface + no-delegation guard.
- `components`: `VdMenu` joins the exported surface (the carried-surface
  requirement drops its exclusion clause; a new requirement specifies the
  menu's contract).

## Impact

- Package: `@vanduo-oss/vd3` `.` export grows by 12 composables + `VdMenu`.
  No exports-map changes. `sideEffects` stays CSS-only. Additive on the
  unpublished pre-release line — **semver: minor-equivalent, no breakage**
  for vd3 consumers.
- API compatibility (vd2 → vd3 migration notes, old `@vanduo-oss/vue@0.3.0`
  → `@vanduo-oss/vd3`):
  - The 12 composables and `VdMenu` are **restored with their old names
    and call signatures** — `useX(root)` call sites port unchanged, and
    `VdMenu` props/emits/markup are identical. This closes the last
    "absent until vd3-rewrites" breaking note from `vd3-carryover`.
  - **Behavioral deltas vs the old shims (documented, intentional):**
    (1) unmounting one consumer no longer tears down *every* instance on
    the page (the shims called the framework's global `destroyAll()`);
    (2) no `window.Vanduo*` / `@vanduo-oss/framework/iife` is ever touched
    — apps that loaded the IIFE for these composables delete that setup;
    (3) `useTabs` gains the vanilla keyboard/ARIA behavior the old shim
    lacked; (4) `useSearch(root)` still works but the registry is reached
    through the composable's return value instead of `window.VanduoSearch`.
  - Custom-event contracts (`dropdown:select`, `flow:change`,
    `tab:change`, `validate:submit`, `imageBox:*`, `draggable:*`,
    `spotlight:*`, `bubble:show/hide`, `popover:show/hide`) are unchanged,
    so listeners written against the framework keep working.
- Build/test: suite grows by ~13 spec files; `pnpm build` chain unchanged;
  `check:classes` re-run because a component (`VdMenu`) is added.
- Docs: vd3-docs needs pages for the 12 composables + `VdMenu` (docs sync
  flagged; happens in the docs repo's own change).
- Changelog: one unreleased `@vanduo-oss/vd3` entry (packages only, per
  policy).
