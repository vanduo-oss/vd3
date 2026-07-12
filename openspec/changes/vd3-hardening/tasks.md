# Tasks

Four independent, non-breaking fixes. Each pairs its implementation with the
existing spec that already covers the surface (extend, don't add files) and
asserts the new contract AND that prior behavior is unchanged.

## 1. useTabs dual selectors

- [x] 1.1 In `src/composables/useTabs.ts`, widen the container selector to
      `.vd-tabs, [data-tabs]` in the mount/`refresh` scan, in `ownedBy`
      (`el.closest(".vd-tabs, [data-tabs]")`), and in the `show()` container
      lookups; widen the link selector to `.vd-tab-link, [data-tab]` in
      `linksOf` and in `closestLink`. Leave panes
      (`.vd-tab-pane, [data-tab-pane]`), ARIA wiring, keyboard, activation, and
      `tab:change` untouched. Pure additive superset.
- [x] 1.2 Extend `tests/composables/use-tabs.spec.ts`: an attribute-only
      container (`[data-tabs]` with `[data-tab]` links and
      `[data-tab-pane]` panes) wires at mount (ARIA, roving tabindex,
      first-tab activation) and activates on click/arrow; a class-based
      container still wires exactly as before (regression guard).

## 2. VdThemeSwitcher focus a11y

- [x] 2.1 In `src/components/VdThemeSwitcher.vue`, on Escape while `open` is
      true (both `onToggleKeydown` and `onMenuKeydown`), close the menu AND
      return focus to the `.vd-theme-switcher-toggle` button (donor
      `handleMenuKeydown`). On open via click/Enter/Space (the `toggleMenu`
      click path — Enter/Space on the `<button>` dispatch `click`), move focus
      into the menu via `nextTick(focusActiveOption)`, matching the existing
      ArrowDown-to-open path and the donor `openMenu`. Cycle mode
      (`menu=false`) and all markup/props/emits unchanged.
- [x] 2.2 Extend `tests/components/vd-theme-switcher.spec.ts`: opening by
      click focuses the active (or first) `menuitemradio`; Escape from the open
      menu closes it and moves focus back to the toggle button; the existing
      arrow-open and selection cases still pass.

## 3. useDocSearch excerpt alignment

- [x] 3.1 In `src/composables/useDocSearch.ts`, align the `excerptOf`
      "no content match" branch (`matchPos === -1`) with `doc-search.js`'s
      leading-window intent: return `content.substring(0, EXCERPT_LENGTH)` with
      a trailing ellipsis only when `content.length > EXCERPT_LENGTH`, and an
      empty/whitespace-only body yields an empty excerpt — never a bare
      `"..."` or a broken fragment. The windowed-match branch is unchanged.
- [x] 3.2 Extend `tests/composables/use-doc-search.spec.ts`: a title-only doc
      with no `content` matched by title yields an empty excerpt (result still
      renders); a doc matched by title whose short body lacks the term returns
      the body intact (no stray ellipsis); a long non-matching body truncates
      with a trailing ellipsis. The existing windowed-match test still passes.

## 4. glass.css lightningcss url() fix

- [x] 4.1 In `css/effects/glass.css`, restructure the `.vd-glass::after`
      noise `data:image/svg+xml` URI so lightningcss does not rebase the SVG's
      internal `filter='url(%23n)'` reference into an asset path — the built
      bundle must keep a valid internal SVG fragment reference to the inline
      `<filter id="n">`. Preserve the rendered texture (same fractalNoise
      params, size, opacity). Record it as the fourth carried-CSS divergence.
- [x] 4.2 Add a build-output assertion (jsdom/string check over
      `dist/vd3.css` and `dist/vd3.min.css`) that the glass-noise data-URI
      contains no `effects/%23n` (or `effects/#n`) rebase artifact and its
      internal filter reference resolves to `#n` — guarding against
      re-regression of the lightningcss rebasing.

## 5. Build, gates, and validation

- [x] 5.1 `mise exec node@24 -- pnpm build` green (clean → build-tokens →
      build-css → vite → vue-tsc → `check:classes`); the class-coverage gate
      stays green with the `VdThemeSwitcher` and `glass.css` edits, and the
      rebuilt `dist/vd3.css` / `dist/vd3.min.css` show the corrected glass
      fragment.
- [x] 5.2 `mise exec node@24 -- pnpm test` green (extended tabs / doc-search /
      theme-switcher specs + glass build-output assertion + full suite).
- [x] 5.3 `mise exec node@24 -- pnpm lint`, `pnpm format:check`,
      `pnpm typecheck` green.
- [x] 5.4 CHANGELOG: one unreleased `@vanduo-oss/vd3` entry — tabs dual
      selectors, theme-switcher focus a11y, doc-search excerpt fix, glass
      noise-filter build fix (packages only, per policy).
- [x] 5.5 Flag the `useTabs` attribute-markup support and theme-switcher
      keyboard contract for vd3-docs (docs sync happens in the docs repo's own
      change).
- [x] 5.6 `openspec validate vd3-hardening --strict` green.
