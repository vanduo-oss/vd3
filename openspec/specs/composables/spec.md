# composables Specification

## Purpose
TBD - created by archiving change vd3-carryover. Update Purpose after archive.
## Requirements
### Requirement: pure-composable-carryover

The package root MUST export the 18 pure composables carried from the old
`@vanduo-oss/vue` package — `useAffix`, `useDatepicker`, `useFocusTrap`,
`useGlass`, `useKeyboardNav`, `useMorph`, `useMorphBadges`,
`useNavbarGlassScroll`, `useParallax`, `useScrollspy`, `useSidenav`,
`useStepper`, `useSuggest`, `useTheme` (module), `useThemeBridge`,
`useTimepicker`, `useTooltips`, `useWaypoint` — with identical option
surfaces and behavior. All browser access SHALL occur inside
`onMounted`/`onScopeDispose`-style lifecycle hooks or behind
client guards so importing and calling during SSR is safe, and every
listener/observer a composable installs MUST be removed on unmount.

#### Scenario: carried composables are exported

- **GIVEN** the built package
- **WHEN** the root module's named exports are enumerated
- **THEN** all 18 carried composables are present

#### Scenario: SSR-safe module evaluation

- **GIVEN** a non-browser environment (no `window`/`document` at import time)
- **WHEN** the package root module is imported
- **THEN** no browser API is touched during evaluation

#### Scenario: teardown on unmount

- **GIVEN** a harness component using a carried composable that installs DOM
  listeners or observers (e.g. `useWaypoint`)
- **WHEN** the harness unmounts
- **THEN** the composable's listeners/observers are disconnected

### Requirement: toast-singleton

`useToast` MUST be implemented as a module-scope `reactive()` singleton with
no pinia import (pinia stays out of the peer dependencies), exposing the
exact public API of the old pinia store: `useToastStore()` and `useToast()`
returning `{ queue, show, dismiss, success, error, warning, info }`, the
`ToastType` / `ToastPosition` / `ToastEntry` / `ToastOptions` types, the
flexible `show()` signature (`show('msg')`, `show('msg', 'success', 3000)`,
`show('msg', { … })`, `show({ message, … })` — each returning the entry id),
and defaults mirroring `framework/js/components/toast.js`
(`duration: 5000`, `position: "top-right"`, `dismissible: true`,
`showProgress: true`, `solid: false`). The public API SHALL be locked by a
type-level test committed BEFORE the rewrite lands.

#### Scenario: type lock precedes the implementation

- **GIVEN** the change's task ordering
- **WHEN** the useToast rewrite is implemented
- **THEN** `tests/useToast-api.spec.ts` already pins the exported names,
  types, and `show()` overloads, and the rewrite passes it unmodified

#### Scenario: singleton is shared across callers

- **GIVEN** two components calling `useToast()` / `useToastStore()`
- **WHEN** one shows a toast
- **THEN** the other observes the same entry in the same reactive `queue`

#### Scenario: flexible show signature

- **GIVEN** the singleton
- **WHEN** `show("saved", "success", 3000)` and
  `show({ message: "hi", position: "bottom-center" })` are called
- **THEN** both return distinct string ids and the queued entries carry the
  given type/duration/position with unspecified fields at the framework
  defaults

#### Scenario: no pinia anywhere

- **GIVEN** the `src/` tree and `package.json`
- **WHEN** searched for `pinia`
- **THEN** no import and no dependency/peer entry exists

### Requirement: composable-behavior-specs

Every composable exported from the package root MUST have a jsdom behavior
spec that mounts a harness, drives the relevant DOM/events, and asserts the
composable's observable effects and its cleanup on unmount.

#### Scenario: every exported composable is covered

- **GIVEN** the composable exports in `src/index.ts`
- **WHEN** `pnpm test` runs
- **THEN** each has at least one passing behavior spec

### Requirement: pure-rewrite-surface

The package root MUST export the 12 rewritten composables — `useDropdown`,
`useDraggable`, `useImageBox`, `useRipple`, `useSpotlight`, `useTimeline`,
`useExpandingCards`, `useFlow`, `useTabs`, `useValidate`, `useSearch`,
`usePopover` — each preserving its old shim's public call signature
(`useX(root: Ref<HTMLElement | null>)` remains a valid call). Extensions
(an optional `options` argument, a returned controller) MUST be optional
and documented. No file under `src/` SHALL reference a `window.Vanduo*`
global, cast to a `Vanduo*` type, or import `@vanduo-oss/framework`; no
composable SHALL install document-wide auto-init. All browser access MUST
occur inside `onMounted`/`onScopeDispose`-style lifecycle hooks or behind
client guards (SSR-safe under vite-ssg), and teardown MUST remove exactly
the calling instance's listeners, observers, and generated DOM — never
other instances' wiring.

#### Scenario: rewritten composables are exported

- **GIVEN** the built package
- **WHEN** the root module's named exports are enumerated
- **THEN** all 12 rewritten composables are present

#### Scenario: shim call sites compile unchanged

- **GIVEN** old code calling `useDropdown(root)` with
  `root: Ref<HTMLElement | null>` and discarding the result
- **WHEN** it is compiled against the vd3 types
- **THEN** it typechecks and behaves without modification

#### Scenario: no framework globals or delegation

- **GIVEN** the `src/` tree
- **WHEN** it is searched for `window.Vanduo`, `Vanduo*` global casts, or
  `@vanduo-oss/framework` imports
- **THEN** no match exists

#### Scenario: per-instance teardown does not affect siblings

- **GIVEN** two mounted harnesses each wiring its own root with the same
  composable
- **WHEN** one harness unmounts
- **THEN** the other harness's wiring keeps working (its listeners and
  state classes still respond)

### Requirement: use-ripple-rewrite

`useRipple` MUST reproduce `framework/js/components/ripple.js` (74 lines)
within the given root: every `.vd-ripple` / `[data-vd-ripple]` element
gets `mousedown` and passive `touchstart` handlers that append a
`.vd-ripple-wave` span sized to `max(width, height)` of the element and
positioned so the wave centers on the pointer coordinates (element center
when coordinates are unavailable). The wave SHALL remove itself on
`animationend`, and teardown MUST remove the handlers and any lingering
`.vd-ripple-wave` elements under the root.

#### Scenario: wave spawns at the pointer

- **GIVEN** a mounted harness with a 100×40 `.vd-ripple` button
- **WHEN** `mousedown` fires at client coordinates inside the button
- **THEN** a `.vd-ripple-wave` child exists with width/height `100px` and
  `left`/`top` placing its center at the pointer position

#### Scenario: wave is removed after the animation

- **GIVEN** a spawned wave
- **WHEN** its `animationend` event fires
- **THEN** the wave element is detached from the DOM

#### Scenario: teardown clears waves

- **GIVEN** a harness with an in-flight wave
- **WHEN** the harness unmounts
- **THEN** no `.vd-ripple-wave` remains and the trigger no longer spawns
  waves

### Requirement: use-search-registry

`useSearch` MUST reproduce the `framework/js/components/search.js`
(107 lines) source registry as a module-scope singleton: `register(source)`
throws on a missing/empty `name`, a non-function `fetch`, or a duplicate
`name`, and stores a frozen record with `label` defaulting to `name`,
`icon` defaulting to `null`, and `limit` defaulting to `10`;
`unregister(name)` returns a boolean; `list()` returns a frozen array;
`query(text, { signal?, limitPerSource? })` trims the text, resolves
immediately with empty per-source results for an empty query, otherwise
fetches all sources in parallel (passing `{ signal, limit }`), coerces
non-array results to `[]`, captures per-source errors as
`{ results: [], error }`, and rethrows `AbortError`. The registry SHALL
survive component unmount (process-global by design, SSR caveat
documented). The shim signature `useSearch(root)` MUST keep working; the
composable SHALL return the registry API.

#### Scenario: duplicate registration throws

- **GIVEN** a registered source named `docs`
- **WHEN** `register({ name: "docs", fetch })` is called again
- **THEN** an error is thrown and `list()` still contains one `docs` entry

#### Scenario: query aggregates and isolates failures

- **GIVEN** two sources where one resolves results and one rejects
- **WHEN** `query("token")` resolves
- **THEN** the resolving source's results are present and the failing
  source contributes `{ results: [], error }` without rejecting the whole
  query

#### Scenario: empty query short-circuits

- **GIVEN** registered sources with spy `fetch` functions
- **WHEN** `query("   ")` resolves
- **THEN** every source reports empty results and no `fetch` was invoked

#### Scenario: registry outlives the component

- **GIVEN** a harness that registered a source and then unmounted
- **WHEN** `list()` is read from a new caller
- **THEN** the source is still registered

### Requirement: use-expanding-cards-rewrite

`useExpandingCards` MUST reproduce
`framework/js/components/expanding-cards.js` (148 lines) within the root's
`.vd-expanding-cards` containers (skipping
`data-vd-expanding-cards="manual"`): clicking a `.vd-expanding-card` makes
it the single `is-active` card and focuses it; every card gets
`tabindex="0"` (unless authored), `role="button"`, and `aria-pressed`
mirroring `is-active` (kept in sync via a MutationObserver); ArrowLeft/
ArrowRight (plus ArrowUp/ArrowDown only when the container is
column-direction), Home, and End move activation among visible cards.
Teardown MUST disconnect the observer and remove all handlers.

#### Scenario: click activates exactly one card

- **GIVEN** a container with three cards, the first active
- **WHEN** the third card is clicked
- **THEN** only the third card has `is-active` and `aria-pressed="true"`

#### Scenario: arrow keys move activation

- **GIVEN** focus on the active second card in a row-direction container
- **WHEN** ArrowRight then End are pressed
- **THEN** activation moves to the third card, then to the last card, with
  focus following

#### Scenario: manual containers are skipped

- **GIVEN** a container with `data-vd-expanding-cards="manual"`
- **WHEN** the composable mounts and a card is clicked
- **THEN** no wiring occurred and no `is-active` toggling happens

### Requirement: use-validate-rewrite

`useValidate` MUST reproduce `framework/js/components/validate.js`
(196 lines) for `[data-vd-validate]` / `.vd-validate` forms in the root:
the ten rules (`required`, `email`, `url`, `number`, `min`, `max`,
`minVal`, `maxVal`, `pattern` with the 100-char ReDoS cap, `match`) parsed
from pipe-separated `data-vd-rules` with `:`-joined params, first failing
rule wins; messages from `data-vd-msg-<rule>` overrides falling back to
the built-in catalog with `{0}` substitution; modes `blur` (default) /
`input` / `submit` from `data-vd-validate-mode` with the documented
per-field override, blur mode revalidating on input once a field is
marked; field state via `is-valid` / `is-invalid`, `aria-invalid`, and a
generated `.vd-validate-error` (`role="alert"`, linked by
`aria-describedby`); submit validating all fields, focusing the first
invalid field, preventing submission when invalid, and always dispatching
`validate:submit` with `{ valid }`. The `match` rule SHALL resolve by
element id first and then by `[name]` (shim's documented extension). A
returned controller with `validate(): boolean` and
`addRule(name, validator, message?)` SHALL be documented as optional
extensions.

#### Scenario: blur validation and error rendering

- **GIVEN** a field with `data-vd-rules="required|email"` in a blur-mode
  form
- **WHEN** it blurs empty
- **THEN** the field has `is-invalid`, `aria-invalid="true"`, and a
  `.vd-validate-error` with `role="alert"` showing "This field is
  required", linked via `aria-describedby`

#### Scenario: parameterized message substitution

- **GIVEN** a field with `data-vd-rules="min:5"` and value `"abc"`
- **WHEN** it is validated
- **THEN** the error text is "Minimum 5 characters required"

#### Scenario: invalid submit is blocked and announced

- **GIVEN** a form with one failing field
- **WHEN** the form submits
- **THEN** submission is prevented, the failing field receives focus, and
  `validate:submit` fires with `detail.valid === false`

#### Scenario: match honors ids

- **GIVEN** `data-vd-rules="match:val-pass"` and an input with id
  `val-pass`
- **WHEN** both fields hold the same value and validation runs
- **THEN** the rule passes

### Requirement: use-timeline-rewrite

`useTimeline` MUST reproduce `framework/js/components/timeline.js`
(255 lines) for `.vd-timeline.vd-timeline-animated` containers in the
root: per-item `--vd-timeline-reveal-delay` staggering (140 ms steps,
index capped at 7); instant reveal of all items when
`prefers-reduced-motion: reduce` matches or IntersectionObserver is
unavailable; otherwise IO-driven `is-revealed` (rootMargin
`0px 0px -10% 0px`, threshold 0.15, unobserve after reveal). Containers
with `.vd-timeline-playback` SHALL instead start unrevealed and wire
`[data-vd-timeline-prev|next|play|pause]` controls in the parent scope:
next/prev reveal/unreveal the prefix boundary item, play steps every
800 ms and auto-pauses at the end, buttons keep `disabled` /
`aria-disabled` / `aria-pressed` state. Teardown MUST disconnect the
observer and stop playback timers.

#### Scenario: staggered reveal on intersection

- **GIVEN** an animated timeline with three items
- **WHEN** the items intersect
- **THEN** each gains `is-revealed` and carries reveal delays of 0 ms,
  140 ms, and 280 ms

#### Scenario: reduced motion reveals immediately

- **GIVEN** `prefers-reduced-motion: reduce` matching
- **WHEN** the composable mounts
- **THEN** every item has `is-revealed` without any observer being created

#### Scenario: playback stepping and button state

- **GIVEN** a `.vd-timeline-playback` timeline with two items and
  prev/next buttons
- **WHEN** next is pressed twice
- **THEN** both items are revealed in order and the next button becomes
  `disabled` with `aria-disabled="true"` while prev is enabled

### Requirement: use-popover-rewrite

`usePopover` MUST merge `framework/js/components/bubble.js` (211 lines)
and `framework/js/components/popover.js` (294 lines) behind the shim's
signature, wiring both markup contracts inside the root:

1. **Attribute-built bubble** (`[data-vd-bubble]` / `[data-vd-popover]`
   without a target attribute): builds a body-appended
   `.vd-bubble-content` (`role="dialog"`, `aria-modal="false"`,
   `data-placement`) with optional `.vd-bubble-header` + close button when
   a title attribute is present, text content by default, and HTML content
   only from `data-vd-bubble-html`/`data-vd-popover-html` passed through
   `sanitizeHtml` (`allowStyle: false`; SVG only with the allow-svg
   attribute). Trigger gets `aria-haspopup="dialog"`, `aria-expanded`,
   `aria-controls`; click toggles (opening closes other bubbles);
   placement from the placement attribute (default `bottom`) with viewport
   clamping; outside-click (capture) and Escape close; `bubble:show` /
   `bubble:hide` dispatch from the trigger.
2. **Target-panel popover** (`.vd-popover-trigger` with
   `data-vd-popover-target`): resolves the panel by selector, ensures
   `.vd-popover-panel` class, id, `role="dialog"`, `aria-modal="false"`;
   trigger modes from `data-vd-popover-trigger` (`click`, `hover` with the
   80 ms leave grace, `focus` with related-target check; default
   `click focus`); placement from `data-vd-popover-placement` (invalid →
   `bottom`) with `data-placement` mirroring, viewport clamping, and
   overflow flip on resize/scroll unless `data-vd-popover-flip="false"`;
   Escape closes the open panel; `popover:show` / `popover:hide` dispatch
   from the trigger.

Teardown MUST remove generated bubble panels, restore trigger ARIA, and
detach all document/window listeners this instance installed.

#### Scenario: bubble builds and toggles

- **GIVEN** a trigger with `data-vd-bubble="Hello"` and
  `data-vd-bubble-title="Info"`
- **WHEN** it is clicked
- **THEN** a `.vd-bubble-content[role="dialog"]` with a header, close
  button, and body text "Hello" becomes visible, the trigger has
  `aria-expanded="true"`, and `bubble:show` fired

#### Scenario: bubble HTML is sanitized

- **GIVEN** `data-vd-bubble-html` containing `<b>hi</b><script>x()</script>`
- **WHEN** the bubble opens
- **THEN** the body renders the bold text and no `script` element exists

#### Scenario: panel popover honors trigger modes

- **GIVEN** a `.vd-popover-trigger` with `data-vd-popover-target="#p"` and
  `data-vd-popover-trigger="hover"`
- **WHEN** the pointer enters the trigger
- **THEN** panel `#p` un-hides with `data-placement` set, and it hides
  after the pointer leaves both trigger and panel

#### Scenario: placement flips on overflow

- **GIVEN** an open panel placed `bottom` whose height overflows the
  viewport bottom
- **WHEN** the flip pass runs
- **THEN** the panel repositions with `data-placement="top"`

#### Scenario: escape and outside click close

- **GIVEN** an open click-mode bubble or popover
- **WHEN** Escape is pressed (or a click lands outside trigger and panel)
- **THEN** it closes, `aria-expanded` returns to `"false"`, and the hide
  event fires

### Requirement: use-flow-rewrite

`useFlow` MUST reproduce `framework/js/components/flow.js` (264 lines) for
`.vd-flow` / `.vd-carousel` elements in the root: slide transforms on
`.vd-flow-track` (or `is-active` fading for `.vd-flow-fade`), looping per
`data-vd-loop` (default true) with modulo wrap, region/carousel ARIA
(`role="region"`, `aria-roledescription="carousel"`, default
`aria-label`), per-slide group roles with "Slide i of n" labels and
`aria-hidden` bookkeeping, a visually-hidden `aria-live="polite"` region
announcing changes, prev/next controls, indicator dots (`role="tab"`,
`aria-selected`, generated labels; bare `.vd-flow-indicators` buttons are
upgraded with `.vd-flow-indicator` per the shim's bridge), ArrowLeft/
ArrowRight keyboard on the focusable container, pointer/touch swipe with
the 50 px threshold and `is-dragging` class, autoplay from
`data-vd-autoplay` with `data-vd-interval` (default 5000 ms) pausing on
mouseenter/focusin and resuming on mouseleave/focusout, and `flow:change`
with `{ current, previous, total }`. A returned controller
(`goTo`/`next`/`prev`) SHALL be documented as an optional extension.
Teardown MUST stop autoplay and remove all listeners.

#### Scenario: navigation updates slides, indicators, and ARIA

- **GIVEN** a three-slide flow with indicators
- **WHEN** `next` is triggered from slide 0
- **THEN** slide 1 is active (transform or `is-active`), indicator 1 has
  `is-active` + `aria-selected="true"`, other slides are
  `aria-hidden="true"`, the live region reads "Slide 2 of 3", and
  `flow:change` fired with `{ current: 1, previous: 0, total: 3 }`

#### Scenario: swipe past the threshold advances

- **GIVEN** a mounted flow
- **WHEN** a pointer drag of more than 50 px leftward completes
- **THEN** the carousel advances one slide and `is-dragging` was applied
  during the drag

#### Scenario: autoplay pauses on hover

- **GIVEN** a flow with `data-vd-autoplay` and `data-vd-interval="100"`
- **WHEN** the pointer enters the carousel
- **THEN** no further slide changes occur until the pointer leaves

### Requirement: use-tabs-rewrite

`useTabs` MUST reach full parity with `framework/js/components/tabs.js`
(317 lines) for `.vd-tabs` containers in the root (superseding the old
shim's subset): tablist ARIA (`role="tablist"` on `.vd-tab-list`,
`role="tab"` + `aria-selected` + roving `tabindex` on `.vd-tab-link`s,
`role="tabpanel"` + `aria-labelledby` on `.vd-tab-pane`s with generated
ids and `aria-controls` back-links); pane resolution by
`data-tab-pane`-attribute, then id, then index; activation on click (and
Enter/Space) skipping `disabled` tabs, toggling `is-active` on tab and
pane and dispatching `tab:change` with `{ tab, pane, tabId }`; keyboard
navigation with ArrowLeft/ArrowRight (horizontal), ArrowUp/ArrowDown
(`.vd-tabs-vertical`), Home/End — moving focus AND activation with
wrap-around, skipping disabled tabs; and auto-activation of the first tab
when none is `is-active` at mount.

#### Scenario: ARIA wiring at mount

- **GIVEN** a `.vd-tabs` container with three links and panes, none active
- **WHEN** the composable mounts
- **THEN** the first tab is activated (`is-active`,
  `aria-selected="true"`, `tabindex="0"`), the others have
  `tabindex="-1"`, and each pane has `role="tabpanel"` labelled by its tab

#### Scenario: arrow navigation wraps and activates

- **GIVEN** focus on the last enabled tab of a horizontal tablist
- **WHEN** ArrowRight is pressed
- **THEN** the first tab receives focus and activation, and `tab:change`
  fires with its `tabId`

#### Scenario: disabled tabs are skipped

- **GIVEN** a middle tab with the `disabled` class
- **WHEN** arrow navigation passes over it
- **THEN** it is never focused or activated

### Requirement: use-spotlight-rewrite

`useSpotlight` MUST reproduce `framework/js/components/spotlight.js`
(325 lines): `[data-vd-spotlight]` triggers in the root parse their JSON
steps (invalid JSON → console error, no tour; steps normalized to
`{ target, title, description }` accepting `content` as a description
alias and dropping step entries without a usable target) and start the
tour on click. The active tour SHALL build a body-appended
`.vd-spotlight-overlay` (`aria-hidden`) and `.vd-spotlight-tooltip`
(`role="dialog"`, `aria-modal="true"`) with per-step title/description
(ids wired to `aria-labelledby`/`aria-describedby`), a footer counter
"i / n", and Back/Skip/Next/Done buttons; the step target gains
`.vd-spotlight-target` and is scrolled into view; the tooltip tracks the
target through scroll/resize and settle frames; Escape and overlay click
stop the tour; starting while active stops the previous tour; stopping
removes all generated DOM and classes, restores focus to the trigger, and
dispatches `spotlight:end` with `{ completedSteps, total, completed }`;
each step dispatches `spotlight:step`. A returned controller
(`start(steps)`, `stop`, `next`, `prev`) SHALL be documented as an
optional extension. Only one tour is active process-wide.

#### Scenario: trigger starts a tour

- **GIVEN** a trigger whose `data-vd-spotlight` holds two valid steps
- **WHEN** it is clicked
- **THEN** the overlay and tooltip exist, step 1's target has
  `.vd-spotlight-target`, the counter reads "1 / 2", and `spotlight:step`
  fired

#### Scenario: completing the tour restores state

- **GIVEN** an active two-step tour on its last step
- **WHEN** Done is clicked
- **THEN** overlay, tooltip, and target classes are gone, focus returns to
  the trigger, and `spotlight:end` fired with
  `{ completedSteps: 2, total: 2, completed: true }`

#### Scenario: escape aborts

- **GIVEN** an active tour on step 1 of 3
- **WHEN** Escape is pressed
- **THEN** the tour stops and `spotlight:end` reports
  `completed: false`

#### Scenario: invalid payload is inert

- **GIVEN** a trigger with malformed JSON in `data-vd-spotlight`
- **WHEN** it is clicked
- **THEN** no overlay is created

### Requirement: use-dropdown-rewrite

`useDropdown` MUST reproduce `framework/js/components/dropdown.js`
(369 lines) for `.vd-dropdown` containers in the root: toggle ARIA
(`aria-haspopup`, `aria-expanded`) and menu ARIA (`role="menu"`,
`aria-hidden`); click toggling with `is-open` on both container and menu,
opening closes other open dropdowns wired by this instance and focuses the
first non-disabled item; closing restores focus to the toggle;
outside-click closes; keyboard on the toggle: Enter/Space/ArrowDown open
(ArrowDown/ArrowUp cycle item focus when open), Home/End jump, Escape
closes with refocus, and printable keys drive a 500 ms typeahead buffer
focusing the first item whose text starts with the buffer; item selection
(click or Enter/Space) marks the item `active`/`is-active`, updates a
button toggle's label to the item text, closes the menu, and dispatches
`dropdown:select` with `{ item, value }` (`data-value` falling back to
text); auto-placement toggling `vd-dropdown-menu-end` / `-start` / `-top`
classes from viewport overflow while respecting explicit
`vd-dropdown-dropup` / `-dropright` / `-dropleft` wrappers. Disabled items
(`.disabled` / `.is-disabled`) MUST be excluded from focus and selection.
A returned controller (`open`/`close`) SHALL be documented as an optional
extension. This requirement is the behavior dependency of `VdMenu`.

#### Scenario: open, focus, and ARIA

- **GIVEN** a closed dropdown
- **WHEN** the toggle is clicked
- **THEN** container and menu gain `is-open`, `aria-expanded="true"` /
  `aria-hidden="false"` are set, and the first enabled item is focused

#### Scenario: selection emits and closes

- **GIVEN** an open dropdown with an item carrying `data-value="b"`
- **WHEN** the item is clicked
- **THEN** `dropdown:select` fires with `detail.value === "b"`, the item
  is `is-active`, the menu closes, and the toggle regains focus

#### Scenario: typeahead focuses a match

- **GIVEN** an open dropdown with items "Alpha", "Beta", "Gamma"
- **WHEN** the key `g` is pressed on the toggle
- **THEN** the "Gamma" item receives focus

#### Scenario: escape closes with refocus

- **GIVEN** an open dropdown with an item focused
- **WHEN** Escape is pressed
- **THEN** the dropdown closes and focus returns to the toggle

### Requirement: use-image-box-rewrite

`useImageBox` MUST reproduce `framework/js/components/image-box.js`
(417 lines): `[data-image-box]` triggers in the root gain
`.vd-image-box-trigger`, click-to-open, `is-broken` marking on image
error, and — for non-button/anchor triggers — `role="button"`,
`tabindex="0"`, an enlarge `aria-label`, and Enter/Space activation. A
single shared backdrop (`.vd-image-box-backdrop`, `role="dialog"`,
`aria-modal="true"`, labelled, focusable) with container, image, close
button (`aria-label`), and caption SHALL be lazily created in `body` and
shared across instances (refcounted: removed when the last consumer
unmounts). Opening resolves the source
`data-image-box-full-src` → `data-image-box-src` → `src` → `href`
(warn + abort when none), sets the caption from `data-image-box-caption`
falling back to `alt` (hidden when empty), locks body scroll via
`body-image-box-open` + `--vd-scrollbar-width`, adds `is-visible`, focuses
the backdrop, and dispatches `imageBox:open` with `{ src }`. Closing —
via backdrop/image/close-button click, Escape, or scrolling more than
50 px from the opening scroll position — MUST unlock scroll, restore focus
to the trigger, dispatch `imageBox:close`, and clear the image source
after the transition.

#### Scenario: open resolves the full-size source

- **GIVEN** an `img[data-image-box]` with `src="thumb.png"` and
  `data-image-box-full-src="full.png"`
- **WHEN** it is clicked
- **THEN** the backdrop is `is-visible` showing `full.png`, body scroll is
  locked, and `imageBox:open` fired with `detail.src` ending in
  `full.png`

#### Scenario: scroll past the threshold dismisses

- **GIVEN** an open image box
- **WHEN** the window scrolls more than 50 px from the opening position
- **THEN** the box closes and focus returns to the trigger

#### Scenario: keyboard access for plain triggers

- **GIVEN** a `div[data-image-box]` trigger
- **WHEN** the composable mounts and Enter is pressed on it
- **THEN** the trigger has `role="button"` and `tabindex="0"`, and the
  box opens

### Requirement: use-draggable-rewrite

`useDraggable` MUST reproduce `framework/js/components/draggable.js`
(819 lines) within the root:

- **Items** (`.vd-draggable` / `[data-draggable]`): ensure
  `draggable="true"`, `tabindex="0"`, `role="option"`,
  `aria-roledescription`, `aria-grabbed`; dragstart applies `is-dragging`
  and `aria-grabbed="true"` and dispatches `draggable:start`; drag
  dispatches `draggable:drag`; dragend applies a transient `is-dropped`
  (removed after 300 ms), resets `aria-grabbed`, and dispatches
  `draggable:end`. Item payload for drops is `data-draggable` falling back
  to trimmed text.
- **Containers** (`.vd-draggable-container`,
  `.vd-draggable-container-vertical`): `role="listbox"` with a default
  `aria-label`; items inside are auto-wired; dragover live-reorders the
  dragged item by the sibling-midpoint rule (vertical containers compare
  Y, horizontal X), ignoring the (0,0) end-of-drag coordinates.
- **Drop zones** (`.vd-drop-zone`): `role="region"`,
  `aria-dropeffect="move"`, default `aria-label`; dragenter adds
  `is-drag-over`, dragleave removes it, drop removes it and dispatches
  `draggable:drop` with the item's data and drop position.
- **Touch fallback**: touchmove past a small threshold mirrors dragstart
  (with `preventDefault` to suppress scrolling), moves a body-level
  `.vd-drag-feedback` element with the pointer, live-toggles
  `is-drag-over` on the zone under the touch point, and touchend performs
  the drop/reorder and cleanup.
- **Keyboard**: Enter/Space activates the item's click action;
  ArrowUp/ArrowLeft and ArrowDown/ArrowRight move the item before/after
  its draggable sibling, keep focus on it, and dispatch
  `draggable:reorder` with the direction; Escape cancels an in-progress
  drag state.

Teardown MUST remove this instance's item/container/zone listeners and
the feedback element when no instance remains. `makeDraggable(el, opts)` /
`removeDraggable(el)` SHALL be documented as optional controller
extensions.

#### Scenario: drag lifecycle classes and events

- **GIVEN** a wired `.vd-draggable-item`
- **WHEN** dragstart then dragend fire on it
- **THEN** `is-dragging` + `aria-grabbed="true"` apply during the drag,
  `draggable:start` and `draggable:end` dispatch, and `is-dropped`
  appears then clears after the drag ends

#### Scenario: container reorder by midpoint

- **GIVEN** a vertical container with items A, B, C and A being dragged
- **WHEN** dragover fires below B's vertical midpoint
- **THEN** A is re-inserted after B in the DOM

#### Scenario: drop zone handshake

- **GIVEN** a `.vd-drop-zone` and an item with `data-draggable="x"`
- **WHEN** dragenter, then drop occur on the zone
- **THEN** `is-drag-over` applies then clears, and `draggable:drop`
  fires with data `"x"`

#### Scenario: keyboard reorder

- **GIVEN** focus on the second of three sibling items
- **WHEN** ArrowUp is pressed
- **THEN** the item moves before the first, keeps focus, and
  `draggable:reorder` fires with direction `up`

### Requirement: use-click-outside

The package root MUST export `useClickOutside`, brought from
`vd2/src/composables/useClickOutside.ts` (50 lines) with its signature
preserved:
`useClickOutside(refs: Ref<HTMLElement | null>[], handler: () => void,
enabled: Ref<boolean>)`. While `enabled` is true it SHALL listen for
capture-phase `pointerdown` on `document` and invoke `handler` when the
event target is contained by none of the refs; the listener attach MUST
be deferred a tick after `enabled` flips true so the activating click
cannot immediately self-close, and it MUST detach when `enabled` flips
false and on scope disposal. The composable MUST be SSR-safe (no document
access when `enabled` is false or off-client).

#### Scenario: outside pointerdown fires the handler

- **GIVEN** an enabled instance watching a panel ref
- **WHEN** a pointerdown lands outside the panel (after the deferred
  attach)
- **THEN** the handler is called once

#### Scenario: inside and pre-attach clicks are ignored

- **GIVEN** `enabled` flipping true in response to a click
- **WHEN** that same click finishes, and a later pointerdown lands inside
  one of the refs
- **THEN** the handler is not called in either case

#### Scenario: disable and dispose detach

- **GIVEN** an attached instance
- **WHEN** `enabled` flips false (or the owning scope unmounts)
- **THEN** subsequent outside pointerdowns do not call the handler

### Requirement: use-doc-search

The package root MUST export `useDocSearch`, porting the behavior core of
`framework/js/components/doc-search.js` (1016 lines) as a data-driven
composable (DOM-scan index building is intentionally dropped): it accepts
a document collection (`{ id, title, content?, category?, keywords?,
href? }[]`, statically or as a ref) plus the donor's behavior options
with the donor defaults — `minQueryLength: 2`, `maxResults: 10`,
`debounceMs: 150`, `highlightTag: "mark"` (validated against a safe-tag
whitelist), `keyboardShortcut: true` (Cmd/Ctrl+K focuses the bound
input). It SHALL expose reactive `query`, `results`, `isOpen`, and
`activeIndex`, and methods `search`, `open`, `close`, `navigate`,
`select`. Search MUST debounce input, ignore queries shorter than
`minQueryLength`, rank title matches above keyword matches above content
matches, cap at `maxResults`, produce an excerpt window around the first
content match, and highlight matches with HTML-escaped source text.
Keyboard behavior on the bound input: ArrowDown/ArrowUp move
`activeIndex` (wrapping), Enter selects the active result, Escape closes.
The global shortcut listener MUST attach on mount and detach on unmount.

#### Scenario: ranking and cap

- **GIVEN** documents where the query matches one title, one keyword set,
  and many bodies, with `maxResults: 3`
- **WHEN** the search settles
- **THEN** at most 3 results return, ordered title match first, keyword
  match second

#### Scenario: short queries do not search

- **GIVEN** `minQueryLength: 2`
- **WHEN** the query is a single character
- **THEN** `results` is empty and `isOpen` is false

#### Scenario: highlight is escaped

- **GIVEN** a document whose title contains `<b>` literally and a
  matching query
- **WHEN** the highlighted title is produced
- **THEN** the `<b>` renders as escaped text and only the configured
  highlight tag wraps the match

#### Scenario: keyboard shortcut focuses the input

- **GIVEN** a mounted instance with `keyboardShortcut: true`
- **WHEN** Cmd/Ctrl+K is pressed anywhere in the document
- **THEN** the bound input receives focus and the default is prevented

#### Scenario: unmount detaches global listeners

- **GIVEN** a mounted instance
- **WHEN** it unmounts
- **THEN** Cmd/Ctrl+K no longer focuses anything and no document
  listeners from the instance remain

### Requirement: use-lazy-load

The package root MUST export `useLazyLoad`, porting
`framework/js/components/lazy-load.js` (425 lines) at both donor levels.
Low level: `observe(el, callback, { threshold?, rootMargin? })` fires the
callback once when the element first intersects and auto-unobserves;
`unobserve(el)` cancels; environments without IntersectionObserver fire
the callback immediately. High level:
`loadSection(url, container, { placeholder?, threshold?, rootMargin?,
onLoaded?, onError? })` renders the placeholder (`"skeleton"` default or
`"spinner"`, using the shipped skeleton/spinner classes; a custom HTML
string is sanitized before injection), rejects non-https/non-relative
URLs, fetches on first intersection with a 10-second abort timeout,
injects the response through the existing `utils/sanitizeHtml`, and
dispatches `lazysection:loading` / `lazysection:loaded` /
`lazysection:error` (bubbling) on the container, rendering an inline
error alert on failure. Root-scoped attribute wiring MUST be supported:
`useLazyLoad(root)` wires `[data-vd-lazy]` elements inside the root using
`data-vd-lazy` (URL) and `data-vd-lazy-placeholder`. All observers and
timers MUST be released on scope disposal.

#### Scenario: observe fires once

- **GIVEN** an observed element
- **WHEN** it intersects twice
- **THEN** the callback ran exactly once and the element is no longer
  observed

#### Scenario: section load lifecycle

- **GIVEN** a container wired to a relative URL with the skeleton
  placeholder and a mocked 200 response
- **WHEN** it intersects
- **THEN** `lazysection:loading` fires, the skeleton renders, and after
  the fetch resolves the sanitized HTML replaces it and
  `lazysection:loaded` fires

#### Scenario: unsafe URL and fetch failure

- **GIVEN** a `javascript:` URL in one container and a rejecting fetch in
  another
- **WHEN** loading is attempted
- **THEN** neither injects content, both dispatch `lazysection:error`,
  and the failure container shows the error alert

#### Scenario: injected content is sanitized

- **GIVEN** a fetched section containing a `<script>` and an inline event
  handler attribute
- **WHEN** injection completes
- **THEN** neither the script element nor the handler attribute exists in
  the container

### Requirement: use-grid

The package root MUST export `useGrid` and `setGridSystem`, porting
`framework/js/components/grid.js` (290 lines). `useGrid(container,
{ mode? })` SHALL manage one container: initial mode from the option or
the container's `data-layout-mode` (default `standard`); applying a mode
toggles `vd-grid-standard`/`vd-grid-fibonacci`, keeps `data-layout-mode`
and the region `aria-label` ("Grid layout: <mode> mode") in sync,
dispatches `grid:modechange` with `{ container, mode }`, and — in
browsers without `:has()` support — applies the donor's inline
`grid-template-columns` Fibonacci fallback per row child count (1fr;
1fr 1.618fr; 2fr 3fr 5fr; 1fr 2fr 3fr 5fr; equal columns beyond four),
clearing inline styles when returning to standard. It SHALL return a
reactive `mode` plus `toggle()` and `setMode(mode)` (invalid modes
ignored), and unmount MUST remove the applied classes, attribute
bookkeeping, and inline fallbacks. `setGridSystem(mode)` SHALL stamp the
document-level default by setting `data-grid="fibonacci"` on `<html>` (or
removing `data-grid` for `standard`), MUST be client-guarded and
non-persisting, and is backed by `[data-grid="fibonacci"]` rules in
`css/core/grid.css` that apply the Fibonacci templates to `.vd-row`s not
inside an explicit `.vd-grid-standard` container (closest explicit
container wins).

#### Scenario: toggle round-trip

- **GIVEN** a container managed by `useGrid` in `standard` mode
- **WHEN** `toggle()` runs
- **THEN** the container has `vd-grid-fibonacci`,
  `data-layout-mode="fibonacci"`, the updated `aria-label`, reactive
  `mode` reads `fibonacci`, and `grid:modechange` fired with that mode

#### Scenario: fallback columns without :has()

- **GIVEN** a fibonacci-mode container in an environment reporting no
  `:has()` support, with a three-column row
- **WHEN** the mode applies
- **THEN** the row's inline `grid-template-columns` is `2fr 3fr 5fr`, and
  switching back to standard clears it

#### Scenario: document default via data-grid

- **GIVEN** a client environment
- **WHEN** `setGridSystem("fibonacci")` then `setGridSystem("standard")`
  run
- **THEN** `<html>` gains then loses `data-grid="fibonacci"`, and
  nothing is written to localStorage

#### Scenario: explicit container beats the document default

- **GIVEN** `data-grid="fibonacci"` on `<html>` and a
  `.vd-grid-standard` container
- **WHEN** the stylesheet is applied
- **THEN** rows inside the standard container use the 12-column template
  while outside rows use the Fibonacci template

