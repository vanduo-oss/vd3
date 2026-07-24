## ADDED Requirements

### Requirement: modal-focus-management

`VdModal` MUST manage focus for its `role="dialog"`/`aria-modal="true"` panel
via the existing `useFocusTrap` composable: on open it SHALL record the
previously-focused element, move focus into the panel (first focusable, or the
panel itself when none), and trap Tab/Shift+Tab so focus cycles within the
panel; on close it SHALL deactivate the trap and restore focus to the recorded
element. The `window` `keydown` (Escape) handler MUST be removed unconditionally
on teardown via `onBeforeUnmount`/`onScopeDispose` (SSR-guarded), so a modal
unmounted while open cannot leak a global handler that hijacks Escape. All
browser access stays inside lifecycle hooks (SSR-safe).

#### Scenario: Tab focus is trapped within the panel

- **GIVEN** an open `VdModal` with more than one focusable element
- **WHEN** Tab is pressed on the last focusable (or Shift+Tab on the first)
- **THEN** focus wraps to the first (respectively last) focusable inside the
  panel and never leaves it

#### Scenario: focus returns to the opener on close

- **GIVEN** an element focused before a `VdModal` opens
- **WHEN** the modal opens and then closes
- **THEN** focus moved into the dialog on open and is restored to that opener
  element on close

#### Scenario: no Escape leak after unmount-while-open

- **GIVEN** a `VdModal` mounted open
- **WHEN** it is unmounted without closing and Escape is dispatched on `window`
- **THEN** no `close` or `update:open` is emitted (the global handler was
  detached)

### Requirement: offcanvas-dialog-scroll-lock

`VdOffcanvas` MUST present its panel as a modal dialog — `role="dialog"`,
`aria-modal="true"`, focus-trapped via `useFocusTrap` with focus restored to
the opener on close, matching `VdModal`. It MUST also release the body scroll
lock it applies on open (`document.body.style.overflow`) in `onBeforeUnmount`
(SSR-guarded), so a panel unmounted while open never leaves the page
permanently unscrollable. Browser access stays inside lifecycle hooks.

#### Scenario: panel is a modal dialog

- **GIVEN** an open `VdOffcanvas`
- **WHEN** the `<aside>` is inspected
- **THEN** it carries `role="dialog"` and `aria-modal="true"`

#### Scenario: scroll lock is released on unmount

- **GIVEN** an open `VdOffcanvas` that set `document.body.style.overflow` to
  `"hidden"`
- **WHEN** it is unmounted while still open
- **THEN** `document.body.style.overflow` is reset to `""`

### Requirement: tabs-aria-keyboard

`VdTabs` MUST implement the WAI-ARIA tabs pattern: `role="tablist"` on the tab
buttons' direct parent (`.vd-tab-list`, not the outer wrapper); each tab a
`role="tab"` with a stable `id`, `aria-controls` referencing the panel, and a
roving `tabindex` (`0` on the active tab, `-1` on the rest); the panel container
a `role="tabpanel"` with an `id` and `aria-labelledby` referencing the active
tab. `@keydown` ArrowLeft/ArrowRight (wrapping), Home, and End MUST move both
selection (emitting `update:modelValue`) and DOM focus to the target tab. Click
selection is unchanged.

#### Scenario: ARIA wiring and roving tabindex

- **GIVEN** a `VdTabs` with the second tab active
- **WHEN** the rendered DOM is inspected
- **THEN** `.vd-tab-list` has `role="tablist"`, each tab has an `id` and
  `aria-controls` equal to the panel's `id`, the panel has `role="tabpanel"`
  with `aria-labelledby` equal to the active tab's `id`, and only the active
  tab has `tabindex="0"` (the rest `-1`)

#### Scenario: arrow keys move selection and focus

- **GIVEN** a `VdTabs` with the first tab active and focused
- **WHEN** ArrowRight (then ArrowLeft wrapping, Home, End) are pressed
- **THEN** `update:modelValue` emits the target tab id and DOM focus moves to
  that tab button

### Requirement: custom-select-active-descendant

`VdCustomSelect` MUST expose no dangling IDREF and MUST announce the active
option to assistive tech. Each option SHALL have a stable `id`; the trigger
button SHALL carry `aria-controls` referencing the listbox's `id` and, while
open, `aria-activedescendant` referencing the active option's `id` (absent when
closed). The former dangling `aria-labelledby` fallback MUST be removed (the
button's visible text is its accessible name).

#### Scenario: active descendant tracks the active option

- **GIVEN** a `VdCustomSelect` with no `id`/`name`
- **WHEN** it is opened and the active option moves with the arrow keys
- **THEN** the button's `aria-activedescendant` equals the active option's `id`
  and always resolves to an element that exists; when closed it is absent

#### Scenario: no dangling IDREF

- **GIVEN** a rendered `VdCustomSelect`
- **WHEN** the trigger's `aria-controls` is resolved
- **THEN** it points at the listbox element that exists, and no
  `aria-labelledby` references a non-existent id

### Requirement: rating-radiogroup-roving

`VdRating` MUST be a valid `role="radiogroup"`: `aria-checked="true"` on exactly
the star equal to `current` (all others `false`), and a roving `tabindex` — `0`
on the selected star (the first star when nothing is selected), `-1` on the
rest (all `-1` when `readonly`). Arrow keys MUST move DOM focus to the newly
active star as they change the value.

#### Scenario: exactly one checked radio

- **GIVEN** a `VdRating` with `modelValue` 3
- **WHEN** the stars are inspected
- **THEN** exactly one star has `aria-checked="true"` (the third) and exactly
  one star has `tabindex="0"`

#### Scenario: focus follows the arrow keys

- **GIVEN** a `VdRating` with `modelValue` 3 and its active star focused
- **WHEN** ArrowRight is pressed
- **THEN** `update:modelValue` emits 4 and DOM focus moves to the fourth star
