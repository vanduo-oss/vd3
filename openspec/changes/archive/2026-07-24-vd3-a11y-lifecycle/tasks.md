# Tasks

Seven independent, non-breaking a11y/lifecycle fixes. Each pairs its
implementation with a Vitest + jsdom regression that fails before the fix and
passes after; existing behavior stays covered.

## 1. useKeyboardNav lifecycle

- [x] 1.1 In `src/composables/useKeyboardNav.ts`, import `onMounted`/
      `onUnmounted`, attach the `keydown` listener in `onMounted` on the
      resolved `container` element, capture that element, and remove the
      listener in `onUnmounted`; delete the dead `count` variable (fold its
      clamp into `setItems`). Mirror the `useFocusTrap` keydown pattern.
- [x] 1.2 Rewrite `tests/composables/use-keyboard-nav.spec.ts` to mount a real
      host component with a bound ref (not a hand-fed element): keep the
      arrow/Home/End/Enter/Escape/`setItems` coverage and add a case asserting
      the listener is removed on unmount.

## 2. VdModal focus management + teardown

- [x] 2.1 In `src/components/VdModal.vue`, drive focus trapping from
      `useFocusTrap(panel)` (activate on open, deactivate + restore focus to
      the previously-focused element on close) and add
      `onBeforeUnmount`/`onScopeDispose` that unconditionally (SSR-guarded)
      removes the Escape `keydown` handler.
- [x] 2.2 Extend `tests/components/vd-modal.spec.ts`: unmount-while-open then
      Escape emits nothing; Tab cycles focus within the panel; focus returns to
      the opener on close. Existing Escape/backdrop cases still pass.

## 3. VdOffcanvas scroll-lock reset + dialog ARIA

- [x] 3.1 In `src/components/VdOffcanvas.vue`, reset
      `document.body.style.overflow` in `onBeforeUnmount` (SSR-guarded); add
      `role="dialog"`/`aria-modal="true"` + `tabindex="-1"` and `useFocusTrap`
      treatment like `VdModal`.
- [x] 3.2 Extend `tests/components/vd-offcanvas.spec.ts`: open then unmount
      resets body overflow; the panel exposes the dialog role/aria-modal. The
      toggle scroll-lock case still passes.

## 4. useTimepicker keyboard selection

- [x] 4.1 In `src/composables/useTimepicker.ts`, give the popup/items ids, add
      a roving `highlight()` and a shared `selectAt(index)`, and wire an input
      `keydown` handler mirroring `useSuggest` (ArrowDown/ArrowUp highlight +
      `aria-activedescendant` + `scrollIntoView`, Enter selects, Escape/closed
      handling); set `aria-controls`; clear roving state on close; remove the
      handler on unmount. Add `.vd-timepicker-item.is-highlighted` to
      `css/components/timepicker.css` (reusing the hover background).
- [x] 4.2 Extend `tests/composables/use-timepicker.spec.ts`: Arrow keys +
      Enter select a time (value, `timepicker:select`, close, cleared
      `aria-activedescendant`). Existing focus/click/Escape/teardown cases
      still pass.

## 5. VdTabs WAI-ARIA tabs

- [x] 5.1 In `src/components/VdTabs.vue`, add roving tabindex, `@keydown`
      ArrowLeft/Right/Home/End moving selection + focus (via button refs),
      per-tab `id` + `aria-controls`, a `role="tabpanel"` panel with `id` +
      `aria-labelledby`, and move `role="tablist"` onto `.vd-tab-list`. Unique
      id base via `useId()`.
- [x] 5.2 Update `tests/components/vd-tabs.spec.ts`: assert tablist on the
      direct parent, the tab/tabpanel/roving-tabindex wiring, and arrow/Home/End
      navigation moving selection + focus. Existing click/v-model cases pass.

## 6. VdCustomSelect active-descendant + IDREF fix

- [x] 6.1 In `src/components/VdCustomSelect.vue`, add stable option ids,
      `aria-controls` (listbox id) + `aria-activedescendant` (active option id,
      absent when closed) on the trigger, and remove the dangling
      `aria-labelledby`. Id base via `useId()`.
- [x] 6.2 Update `tests/components/vd-custom-select.spec.ts`: `aria-controls`
      resolves to the listbox, `aria-activedescendant` tracks the active option
      and is absent when closed, and no dangling `aria-labelledby` remains.

## 7. VdRating radiogroup + roving

- [x] 7.1 In `src/components/VdRating.vue`, set `aria-checked` only on the star
      equal to `current`, apply a roving tabindex (`0` on the selected/first
      star, `-1` rest; all `-1` when readonly), and move DOM focus to the active
      star as arrows change it (via button refs).
- [x] 7.2 Update `tests/components/vd-rating.spec.ts`: exactly one
      `aria-checked` + one tab stop, and arrow keys move DOM focus. Existing
      click/hover/readonly/step cases pass.

## 8. Build, gates, and validation

- [x] 8.1 `mise exec node@24 -- pnpm build` green (clean → build-tokens →
      build-css → vite → vue-tsc → `check:classes`); the class-coverage gate
      stays green with the component and `timepicker.css` edits.
- [x] 8.2 `mise exec node@24 -- pnpm test` green (rewritten `use-keyboard-nav`
      spec + the six regression additions + full suite).
- [x] 8.3 `mise exec node@24 -- pnpm lint`, `pnpm format:check`,
      `pnpm stylelint`, `pnpm typecheck` green.
- [x] 8.4 CHANGELOG: one unreleased `@vanduo-oss/vd3` entry — a11y/lifecycle
      hardening across the six components/composables (packages only).
- [x] 8.5 Flag the improved keyboard/focus contracts for `vd3-docs` (docs sync
      happens in the docs repo's own change).
- [x] 8.6 `openspec validate vd3-a11y-lifecycle --strict` green.
