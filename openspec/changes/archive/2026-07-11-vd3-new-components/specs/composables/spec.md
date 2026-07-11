## ADDED Requirements

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
