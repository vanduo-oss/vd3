# Tasks

Non-breaking sanitizer/lifecycle fixes plus a coverage-and-gate hardening pass.
Each code fix pairs with a Vitest + jsdom regression that fails before / passes
after; coverage additions assert true behavior.

## 1. sanitizeHtml SVG allowlist (case fix)

- [x] 1.1 In `src/utils/sanitizeHtml.ts`, normalise `el.nodeName.toUpperCase()`
      for the allowlist check and the `SVG` branch, and match `SAFE_SVG_ATTRS`
      case-insensitively (store lowercase, incl. `viewbox`) so an HTML-mode
      DOMParser's lowercase SVG node names are recognised.
- [x] 1.2 Covered by `tests/utils/sanitize-html.spec.ts` (task 3): `<circle>`
      survives under `allowSvg` while `<foreignObject>`/`onload` are dropped.

## 2. sanitizeHtml allowStyle scrub

- [x] 2.1 Add a dependency-free `isUnsafeStyle` blocklist (rejects `url(`,
      `expression(`, `position: fixed|sticky`) and, when `allowStyle` is on and
      the `style` value is unsafe, drop the attribute. Document in JSDoc that
      `allowStyle` is a permit with a minimal scrub, not a full CSS sanitizer.

## 3. sanitizeHtml direct tests

- [x] 3.1 Add `tests/utils/sanitize-html.spec.ts`: `<script>`/`<img onerror>`
      flatten to text; `javascript:`/`data:`/mixed-case `JaVaScRiPt:` hrefs
      removed while http/mailto survive; `onclick`/`onload` stripped;
      `allowSvg` keeps `<circle>`/`d`/`viewBox` and drops
      `<foreignObject>`+`onload`; `allowStyle` false-vs-true incl. the scrub;
      DOMParser-undefined SSR fallback escaping to text.

## 4. class-coverage gate widening

- [x] 4.1 In `scripts/check-class-coverage.mjs`, additively scan
      `src/composables/*.ts` for `vd-*` literals in `classList.add(...)` and
      `.className` assignments (trailing-dash literal → dynamic prefix).
- [x] 4.2 Add the genuinely-unstyled `.vd-validate-error` selector (the message
      element `useValidate` injects) to `css/components/forms.css`.
- [x] 4.3 `pnpm run check:classes` stays green (310 static + 26 dynamic).

## 5. useDatepicker keyboard coverage

- [x] 5.1 Add cases to `tests/composables/use-datepicker.spec.ts`:
      ArrowUp/ArrowDown (±7 days + month re-render across a boundary),
      Home/End, PageUp/PageDown, and a min/max fixture where ArrowLeft at the
      min boundary lands on the first selectable day.

## 6. useDropdown auto-placement coverage

- [x] 6.1 Add geometry-stub cases to `tests/composables/use-dropdown.spec.ts`
      (mirroring the popover geometry-stub pattern): right-edge overflow adds
      `vd-dropdown-menu-end`; low room below adds `vd-dropdown-menu-top`.

## 7. useClickOutside immediate attach

- [x] 7.1 In `src/composables/useClickOutside.ts`, pass `{ immediate: true }` to
      the `watch` so an instance created with `enabled` already true attaches on
      mount.
- [x] 7.2 Add a case to `tests/composables/use-click-outside.spec.ts` asserting
      an initially-true `enabled` fires the handler on the first outside
      pointerdown.

## 8. useStepper quiet mount

- [x] 8.1 In `src/composables/useStepper.ts`, add a `dispatch` flag to `setStep`
      and call it with `false` for the initial paint so no `stepper:change`
      fires on mount.
- [x] 8.2 In `tests/composables/use-stepper.spec.ts`, replace the test that
      pinned the spurious mount event with one asserting no `stepper:change` on
      mount; navigation cases still dispatch.

## 9. Build, gates, and validation

- [x] 9.1 `mise exec node@24 -- pnpm build` green (incl. `check:classes`).
- [x] 9.2 `mise exec node@24 -- pnpm test` green (new sanitize spec + regression
      additions + corrected stepper case + full suite).
- [x] 9.3 `pnpm lint`, `pnpm format:check`, `pnpm stylelint`, `pnpm typecheck`
      green.
- [x] 9.4 CHANGELOG: unreleased `@vanduo-oss/vd3` "Fixed" entries (packages
      only).
- [x] 9.5 Flag the now-working sanitized-SVG body and quieter stepper mount for
      `vd3-docs` (docs sync happens in the docs repo's own change).
- [x] 9.6 `openspec validate vd3-sanitize-coverage --strict` green.
