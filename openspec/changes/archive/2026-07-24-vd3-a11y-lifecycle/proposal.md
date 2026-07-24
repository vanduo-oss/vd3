# vd3-a11y-lifecycle

## Why

An accessibility/lifecycle audit of the carried surface found seven narrow,
non-breaking defects where a component or composable installs global state or
listeners without symmetric teardown, or presents ARIA that misleads assistive
tech. Each is a correction against an existing vd3 source (no framework port),
several by mirroring a pattern already proven in a sibling composable
(`useFocusTrap`, `useSuggest`).

1. **`useKeyboardNav` never cleans up and can no-op.** It attaches its
   `keydown` listener synchronously in `setup()` (dead when the template ref is
   still `null`) and imports no lifecycle hook, so the listener is never
   removed — a leak plus a silent failure.
2. **`VdModal` has no focus management and leaks its Escape handler.** It
   declares `role="dialog"`/`aria-modal` but Tab escapes to the page, focus is
   never restored to the trigger, and its `window` `keydown` handler is removed
   only on open→false — unmount-while-open leaks it and hijacks Escape
   page-wide.
3. **`VdOffcanvas` can permanently lock the page.** It sets
   `document.body.style.overflow = "hidden"` on open but `onBeforeUnmount` only
   detaches the keydown listener, so unmounting while open strands the scroll
   lock. It is modal (scroll-lock + backdrop) yet the `<aside>` carries only
   `aria-label` (no dialog role, no focus trap).
4. **`useTimepicker` is keyboard-inoperable.** It builds a `role="listbox"` of
   `role="option"` items and forces `readOnly`, but wires no Arrow/Enter
   handling, so keyboard users can open the popup but never pick a time.
5. **`VdTabs` violates the WAI-ARIA tabs pattern.** Tabs respond only to click
   (no keyboard), every tab is a Tab stop (no roving tabindex), panels are a
   bare `<div>` (no `role="tabpanel"`/`aria-labelledby`), tabs have no
   `aria-controls`, and `role="tablist"` sits on the outer wrapper rather than
   the tabs' direct parent.
6. **`VdCustomSelect` exposes a dangling IDREF and no active-option cue.** The
   trigger's `aria-labelledby` fell back to a literal (`"custom-select"`) that
   no element carries, and arrow keys moved a visual-only `activeIndex` with no
   `aria-activedescendant`/`aria-controls` and no option ids, so screen readers
   announced no active option.
7. **`VdRating` is not a valid radiogroup.** `aria-checked` marked *every* star
   up to the current value (a radiogroup has exactly one checked), every star
   was a Tab stop, and arrow handling changed the value but never moved DOM
   focus.

## What Changes

All corrections reuse existing vd3 building blocks; none add runtime deps,
`vd-*` classes (bar one reused-pattern CSS selector), exports, or browser
access outside lifecycle hooks.

- **`useKeyboardNav`** — move `addEventListener` into `onMounted` (ref now
  populated), capture the resolved element, remove it in `onUnmounted`; drop
  the dead `count` variable. Mirrors the `onMounted`+`onUnmounted` keydown
  pattern in `useFocusTrap` (68 lines).
- **`VdModal`** — drive focus trapping from the existing `useFocusTrap`
  (activate on open; deactivate + restore focus to the previously-focused
  element on close) and add `onBeforeUnmount`/`onScopeDispose` that
  unconditionally (SSR-guarded) removes the Escape handler.
- **`VdOffcanvas`** — reset `document.body.style.overflow` in
  `onBeforeUnmount`; add `role="dialog"`/`aria-modal="true"` + `useFocusTrap`
  treatment like `VdModal`.
- **`useTimepicker`** — add a `keydown` handler on the input mirroring
  `useSuggest` (287 lines): ArrowDown/ArrowUp move a roving highlight over the
  `.vd-timepicker-item`s (`aria-activedescendant` + `scrollIntoView`), Enter
  selects the highlighted option reusing the existing per-item select logic,
  Escape closes. A `.vd-timepicker-item.is-highlighted` rule (mirroring the
  existing `:hover` style) gives the roving cue a visible state.
- **`VdTabs`** — roving tabindex (`0` active / `-1` rest), `@keydown`
  ArrowLeft/Right/Home/End moving selection **and** focus, `id` +
  `aria-controls` per tab, panels wrapped as `role="tabpanel"` +
  `aria-labelledby`, and `role="tablist"` moved onto the tabs' direct parent
  (`.vd-tab-list`). Unique id base via the repo's existing `useId()` pattern
  (as in `VdSlider`/`VdSwitch`).
- **`VdCustomSelect`** — stable per-option ids, `aria-controls` (listbox id) +
  `aria-activedescendant` (active option id) on the trigger, and removal of the
  dangling `aria-labelledby` (the button's visible text is its accessible
  name). Id base via `useId()`.
- **`VdRating`** — `aria-checked` only on the star equal to `current`; roving
  tabindex (`0` on the selected/first star, `-1` rest); DOM focus moves to the
  active star as arrows change it.
- **Tests** — each fix ships a Vitest + jsdom regression that fails before the
  fix and passes after; the `useKeyboardNav` spec is rewritten to mount a real
  component with a bound ref and assert teardown.

## Non-goals

- **No API breaks.** Every public signature, prop, emit, slot, `vd-*` class,
  `--vd-*` custom property, and `data-*`/`localStorage` contract is unchanged.
  The ARIA/keyboard/lifecycle changes are additive corrections.
- **No visual redesign.** No component restyles; the one new CSS selector
  (`.vd-timepicker-item.is-highlighted`) reuses the existing hover background so
  keyboard highlight matches pointer hover.
- No new components, composables, exports, tokens, or runtime dependencies; no
  new abstraction (the existing `useFocusTrap` is reused, not re-authored).
- No `window.Vanduo*` layer, IIFE, or DOM-scan auto-init — vd3 pure-Vue rules
  stand; all browser access remains inside `onMounted`/`onScopeDispose`/
  `onBeforeUnmount`.
- No changes to the old repos (core, framework, vue, vd2, satellites) — they
  stay read-only reference.

## Impact

- Package: `@vanduo-oss/vd3`. No exports-map, prop, emit, or class-contract
  changes. **Semver: patch** — additive a11y/lifecycle fixes, no breakage for
  vd3 consumers.
- API compatibility (vd2 → vd3, old `@vanduo-oss/vue`): these are pure
  improvements — `VdModal`/`VdOffcanvas` now trap and restore focus and never
  leak global handlers; `VdTabs`/`VdRating`/`VdCustomSelect` now satisfy their
  WAI-ARIA roles; `useTimepicker` becomes keyboard-operable; `useKeyboardNav`
  now tears down. No consumer code edits required.
- Build/test: `pnpm build` chain unchanged; `check:classes` re-run because
  components and `css/components/timepicker.css` change (stays green). The
  suite grows by one rewritten spec (`use-keyboard-nav`) plus regression cases
  in six other specs.
- Docs: `vd3-docs` may note the improved keyboard/focus contracts for
  `VdModal`, `VdOffcanvas`, `VdTabs`, `VdCustomSelect`, `VdRating`, and the
  timepicker composable (docs sync happens in the docs repo's own change).
- Changelog: one unreleased `@vanduo-oss/vd3` entry — a11y/lifecycle hardening
  across the six components/composables (packages only, per policy).
