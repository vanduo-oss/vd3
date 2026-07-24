# vd3-sanitize-coverage

## Why

A security-and-coverage audit of the carried surface found a broken XSS-guard
feature, an under-specified sanitizer option, two composable lifecycle defects,
and blind spots in the test/gate net. Each is a correction against an existing
vd3 source (no framework port); several make the code match a contract the spec
already implies.

1. **`sanitizeHtml`'s SVG allowlist is case-broken.** `SVG_ALLOWED` is
   UPPERCASE, but an HTML-mode `DOMParser` gives SVG elements a **lowercase**
   `nodeName`, so `allowed.includes(el.nodeName)` never matches an SVG node and
   with `allowSvg: true` every `<svg>` is stripped to text — a dead feature that
   contradicts the composables spec (the sanitized bubble/popover body must keep
   SVG under the allow-svg attribute).
2. **`allowStyle` passes `style` through unsanitized.** With `allowStyle: true`
   the raw `style` value survives verbatim (a CSS-injection / clickjacking sink
   on untrusted HTML). Internal callers all pass `allowStyle: false`, but the
   option is public and undocumented as unsafe.
3. **`sanitizeHtml` has zero direct tests** despite being the library's only XSS
   guard and a public export.
4. **The class-coverage gate is blind to composable-injected classes.**
   `scripts/check-class-coverage.mjs` walks only `src/components/`, yet many
   `vd-*` classes are injected imperatively by `src/composables/*.ts` via
   `el.className` / `classList.add`. One such class (`.vd-validate-error`) is
   genuinely unstyled.
5. **`useDatepicker` grid navigation is thinly tested** (only ArrowRight).
6. **`useDropdown` viewport-overflow auto-placement is never exercised.**
7. **`useClickOutside` never attaches when `enabled` is already true at mount.**
   Its `watch` lacks `{ immediate: true }`, contradicting its JSDoc (which
   promises the listener is active whenever `enabled` is true).
8. **`useStepper` fires a spurious `stepper:change` on mount.**
   `setStep(currentIndex)` at init unconditionally dispatches, even though
   `current === previous` (no real change).

## What Changes

All corrections reuse existing vd3 building blocks; none add runtime deps,
exports, or browser access outside lifecycle hooks. The one new `vd-*` selector
styles an already-injected element.

- **`src/utils/sanitizeHtml.ts`** — normalise the tag name with
  `.toUpperCase()` before the allowlist check and the `SVG` branch, match
  `SAFE_SVG_ATTRS` case-insensitively (stored lowercase, incl. `viewbox`), and
  add a minimal dependency-free `allowStyle` scrub that drops a kept `style`
  value containing `url(`, `expression(`, or `position: fixed|sticky`. JSDoc
  documents that `allowStyle` is a permit with a blocklist scrub, not a full CSS
  sanitizer.
- **`tests/utils/sanitize-html.spec.ts`** (new) — `<script>` / `<img onerror>`
  flatten to text; `javascript:` / `data:` / mixed-case `JaVaScRiPt:` hrefs
  removed while http/mailto survive; `onclick`/`onload` stripped; `allowSvg`
  keeps `<circle>`/`d`/`viewBox` but drops `<foreignObject>`+`onload`;
  `allowStyle` false-vs-true incl. the scrub; DOMParser-undefined SSR fallback.
- **`scripts/check-class-coverage.mjs`** — additively widen the walk to scan
  `src/composables/*.ts` for `vd-*` literals in `classList.add(...)` and
  `.className` assignments (a trailing-dash literal is treated as a dynamic
  prefix). Add the missing `.vd-validate-error` selector to
  `css/components/forms.css`.
- **`tests/composables/use-datepicker.spec.ts`** — ArrowUp/ArrowDown (±7 days +
  month re-render at a boundary), Home/End, PageUp/PageDown, and a min/max
  fixture where ArrowLeft at the min boundary lands on the first selectable day.
- **`tests/composables/use-dropdown.spec.ts`** — geometry-stub cases (mirroring
  `use-popover.spec.ts`) asserting `vd-dropdown-menu-end` on right-edge overflow
  and `vd-dropdown-menu-top` on low room below.
- **`src/composables/useClickOutside.ts`** — pass `{ immediate: true }` to the
  `watch`; regression test asserts an initially-true `enabled` attaches on mount.
- **`src/composables/useStepper.ts`** — skip the `stepper:change` dispatch on the
  initial paint (a `dispatch` flag); regression test asserts no event on mount;
  the existing test that pinned the spurious event is corrected.

## Non-goals

- **No API breaks.** Every public signature, prop, emit, slot, `vd-*` class,
  `--vd-*` custom property, and `data-*`/`localStorage` contract is unchanged.
  The one added selector (`.vd-validate-error`) styles an element `useValidate`
  already injects.
- No new components, composables, exports, tokens, or runtime dependencies; no
  new abstraction.
- No `window.Vanduo*` layer, IIFE, or DOM-scan auto-init — vd3 pure-Vue rules
  stand; all browser access stays inside lifecycle hooks / client guards.
- `sanitizeHtml` remains a client-side whitelist guard, not a replacement for
  DOMPurify / server-side sanitization; `allowStyle` is not made safe for
  fully-untrusted CSS.
- No changes to the old repos (core, framework, vue, vd2, satellites).

## Impact

- Package: `@vanduo-oss/vd3`. **Semver: patch** — a security/lifecycle bug-fix
  set plus a coverage/gate hardening pass; no breakage for vd3 consumers.
- API compatibility (vd2 → vd3, old `@vanduo-oss/vue`): pure improvements —
  `sanitizeHtml` now honours `allowSvg` and scrubs `allowStyle`; `useClickOutside`
  attaches when created already-enabled; `useStepper` stops emitting a mount-time
  `stepper:change`. No consumer code edits required.
- Build/test: `pnpm build` chain unchanged; `check:classes` now also covers
  composable-injected classes and stays green with the added
  `.vd-validate-error` selector. The suite grows by one new spec
  (`sanitize-html`) plus regression cases in datepicker/dropdown/click-outside
  and the corrected stepper mount case.
- Docs: `vd3-docs` may note the now-working sanitized-SVG bubble/popover body
  and the quieter stepper mount (docs sync happens in the docs repo's own
  change).
- Changelog: unreleased `@vanduo-oss/vd3` entries — sanitizer and composable
  hardening (packages only, per policy).
