## ADDED Requirements

### Requirement: html-sanitizer

The package root MUST export `sanitizeHtml(input, options?)` — a
dependency-free whitelist sanitizer and the library's only XSS guard for
raw-HTML sinks (consumed by `usePopover`, `useTooltips`, `useLazyLoad`). It
SHALL flatten any non-allow-listed element to its text content, keep only
`http`/`https`/`mailto` on `<a href>` (removing `target`/`rel`), and strip
event-handler and unknown attributes. The tag and attribute allowlists MUST be
matched **case-insensitively** so allow-listed SVG survives under
`allowSvg: true` — an HTML-mode `DOMParser` yields lowercase SVG node names, so
`<svg>`/`<circle>`/`<path>` and their safe geometry attributes (`d`, `viewBox`,
`cx`, `cy`, `r`, …) SHALL be kept while `<foreignObject>` and event handlers are
dropped. `allowStyle` MUST default to `false`; when `true` it is a permit with a
minimal CSS blocklist scrub only — the whole `style` attribute is dropped when
its value contains `url(`, `expression(`, or `position: fixed|sticky` — and it
MUST NOT be treated as a full CSS sanitizer. In a non-DOM (SSR) environment,
where `DOMParser` is undefined, the function MUST fail closed and return
HTML-escaped text.

#### Scenario: unknown tags and handlers flatten to text

- **GIVEN** input `"<b>hi</b><script>alert(1)</script>"` and
  `'<img src="x" onerror="steal()">after'`
- **WHEN** `sanitizeHtml` runs with default options
- **THEN** the `<b>` is kept, the `<script>` and `<img>` elements are gone (the
  script's text survives as inert text, the img flattens away), and no
  `onerror` attribute remains

#### Scenario: href protocols are filtered case-insensitively

- **GIVEN** anchors with `href` values `https://ex.com`, `mailto:a@b.com`,
  `javascript:alert(1)`, `data:text/html,<x>`, and `JaVaScRiPt:alert(1)`
- **WHEN** `sanitizeHtml` runs
- **THEN** the http/https/mailto hrefs survive and the javascript/data/mixed-case
  hrefs are removed while the anchor element and its text are kept

#### Scenario: allow-listed SVG survives under allowSvg

- **GIVEN** an `<svg viewBox=… onload=…>` containing a `<circle onclick=…>`, a
  `<path d=…>`, and a `<foreignObject>`
- **WHEN** `sanitizeHtml(input, { allowSvg: true })` runs
- **THEN** the `<svg>`, `<circle>`, and `<path>` (with `viewBox`/`d`) are kept,
  and `onload`/`onclick` and `<foreignObject>` are dropped; without `allowSvg`
  the whole SVG flattens to text (no `<circle>` survives)

#### Scenario: allowStyle scrubs dangerous CSS

- **GIVEN** `'<div style="color:red">'`, `'<div style="background:url(...)">'`,
  and `'<div style="position:fixed">'`
- **WHEN** `sanitizeHtml(input, { allowStyle: true })` runs
- **THEN** the safe `color:red` style is kept while the `url(...)` and
  `position:fixed` styles are dropped; with the default `allowStyle: false` the
  `style` attribute is always removed

#### Scenario: SSR fails closed to escaped text

- **GIVEN** a non-DOM environment where `DOMParser` is undefined
- **WHEN** `sanitizeHtml('<b>hi</b><img onerror="a()">')` runs
- **THEN** the result is HTML-escaped text (`&lt;b&gt;…`) with no live markup

### Requirement: stepper-mount-quiet

`useStepper` MUST apply the derived initial step (from the first `.is-active`
item, defaulting to index 0) on mount WITHOUT dispatching `stepper:change` —
applying the starting step is not a user-visible change (its `current` would
equal `previous`), so no event SHALL fire until an actual navigation
(`next`/`prev`/`setStep`, or a click / Enter / Space on a
`.vd-stepper-clickable` item). The initial paint MUST still mark
`.is-completed`/`.is-active` and set `aria-current="step"` on the active item.

#### Scenario: no stepper:change on mount

- **GIVEN** a `.vd-stepper` whose second item carries `.is-active`
- **WHEN** the composable mounts
- **THEN** no `stepper:change` event is dispatched, yet the first item is
  `.is-completed`, the second is `.is-active` with `aria-current="step"`

#### Scenario: navigation still dispatches

- **GIVEN** a mounted stepper
- **WHEN** `next()` (or a click on a clickable item) advances the step
- **THEN** `stepper:change` fires with `{ current, previous, total }`

## MODIFIED Requirements

### Requirement: use-click-outside

The package root MUST export `useClickOutside`, brought from
`vd2/src/composables/useClickOutside.ts` (50 lines) with its signature
preserved:
`useClickOutside(refs: Ref<HTMLElement | null>[], handler: () => void,
enabled: Ref<boolean>)`. While `enabled` is true it SHALL listen for
capture-phase `pointerdown` on `document` and invoke `handler` when the
event target is contained by none of the refs; the listener attach MUST
be deferred a tick after `enabled` becomes true (**including when `enabled` is
already true at mount** — the watch runs immediately so an instance created
enabled attaches, not only on a false→true transition), so the activating click
cannot immediately self-close, and it MUST detach when `enabled` flips
false and on scope disposal. The composable MUST be SSR-safe (no document
access when `enabled` is false or off-client).

#### Scenario: outside pointerdown fires the handler

- **GIVEN** an enabled instance watching a panel ref
- **WHEN** a pointerdown lands outside the panel (after the deferred
  attach)
- **THEN** the handler is called once

#### Scenario: an already-true enabled attaches on mount

- **GIVEN** an instance created with `enabled` already `true` at mount
- **WHEN** the deferred attach tick elapses and a pointerdown lands outside all
  refs
- **THEN** the handler is called (the watch ran immediately on mount rather than
  waiting for a false→true transition)

#### Scenario: inside and pre-attach clicks are ignored

- **GIVEN** `enabled` flipping true in response to a click
- **WHEN** that same click finishes, and a later pointerdown lands inside
  one of the refs
- **THEN** the handler is not called in either case

#### Scenario: disable and dispose detach

- **GIVEN** an attached instance
- **WHEN** `enabled` flips false (or the owning scope unmounts)
- **THEN** subsequent outside pointerdowns do not call the handler
