## ADDED Requirements

### Requirement: keyboard-nav-lifecycle

`useKeyboardNav(container, options)` MUST attach its `keydown` listener inside
`onMounted` — so the resolved `container` element (populated only after mount)
receives it — capture that resolved element, and remove the exact same
listener from it in `onUnmounted`. No listener SHALL be attached synchronously
during `setup()` (where the template ref is still `null`), and no listener
SHALL survive unmount. The composable MUST remain SSR-safe (no `window`/DOM
access when `window` is undefined).

#### Scenario: arrow navigation works after mount

- **GIVEN** a mounted host whose `container` ref binds a list of items and was
  `null` when `useKeyboardNav` was called in `setup()`
- **WHEN** ArrowDown is dispatched on the container element
- **THEN** `activeIndex` advances and DOM focus moves to the next item,
  proving the listener attached on mount rather than at call time

#### Scenario: listener is removed on unmount

- **GIVEN** a mounted host using `useKeyboardNav`
- **WHEN** the host unmounts
- **THEN** the container's `removeEventListener("keydown", ...)` is called with
  the same handler, and dispatching a further key on the (now-detached)
  element does not change `activeIndex`

### Requirement: timepicker-keyboard-selection

`useTimepicker` MUST make the time listbox keyboard-operable from the (read-only)
input, mirroring `useSuggest`: while the popup is open, ArrowDown/ArrowUp SHALL
move a roving highlight across the `.vd-timepicker-item`s — adding
`is-highlighted` to the highlighted item, setting the input's
`aria-activedescendant` to that item's id, and scrolling it into view — and
Enter SHALL select the highlighted option through the same per-item selection
logic used for clicks (setting the value, marking `is-selected`/`aria-selected`,
closing, and dispatching `timepicker:select` with `{ time, hours, minutes }`
plus `change`). ArrowDown while closed SHALL open the popup; Escape SHALL close
it. The input MUST expose `aria-controls` referencing the popup listbox, and
closing MUST clear the roving state (`aria-activedescendant` and
`is-highlighted`). All new listeners MUST be removed on unmount.

#### Scenario: Arrow keys highlight and Enter selects

- **GIVEN** a focused, open timepicker in 24h/60-min format
- **WHEN** ArrowDown is pressed twice and Enter is pressed
- **THEN** the second option (`01:00`) is highlighted with the input's
  `aria-activedescendant` pointing at it, and Enter sets the input value to
  `01:00`, fires `timepicker:select` with `{ time: "01:00", hours: 1,
  minutes: 0 }`, and closes the popup

#### Scenario: closing clears roving state

- **GIVEN** an open timepicker with a highlighted option
- **WHEN** the popup closes (selection or Escape)
- **THEN** the input has no `aria-activedescendant` and no item carries
  `is-highlighted`

#### Scenario: keyboard wiring is torn down on unmount

- **GIVEN** a mounted host using `useTimepicker`
- **WHEN** the host unmounts
- **THEN** the input's keydown handler is removed and the body-appended popup
  is detached
