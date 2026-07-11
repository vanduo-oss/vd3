# Tasks

Order: theme singleton first (two components depend on it), then the
bug fix and CSS-contract trio (no dependencies), then behavior
components/composables, then wiring and gates. Every new SFC gets a mount
spec under `tests/components/`, every new composable a jsdom spec under
`tests/composables/` (kebab-case names), per the existing coverage
requirements.

## 1. Theme-preference singleton

- [x] 1.1 Extend `src/composables/useTheme.ts` with `useThemePreference()`
      — module-scope `reactive()` singleton: lazy client init from
      `loadPreference()`, six fields, `setTheme`/`setPalette`/
      `setPrimary`/`setNeutral`/`setRadius`/`setFont`/`reset`, every
      setter routed through `applyPreference()` + `persistPreference()`,
      refcounted `prefers-color-scheme` listener for `system` mode,
      SSR caveat doc comment (useToast precedent).
- [x] 1.2 `tests/composables/use-theme-preference.spec.ts`: shared
      singleton, lazy init from seeded storage, setter → attribute +
      storage effects, reset, media-listener attach/detach refcount.

## 2. VdTree cascade-default fix

- [x] 2.1 `src/components/VdTree.vue`: move `cascade` (and only
      `cascade`) into `withDefaults(defineProps<…>(), { cascade: true })`;
      delete the dead `props.cascade ?? true` expression.
- [x] 2.2 Extend `tests/components/vd-tree.spec.ts`: default-mount parent
      check cascades to children; `:cascade="false"` opt-out does not.
- [x] 2.3 Write the behavior-change note (default flip + escape hatch)
      into the changelog entry (task 8.1) and migration notes.

## 3. CSS-contract components

- [x] 3.1 `VdBreadcrumb.vue`: items/slot rendering, current-item
      `aria-current` + `.vd-breadcrumb-current`, separator + size
      modifier classes; no listeners.
- [x] 3.2 `tests/components/vd-breadcrumb.spec.ts`.
- [x] 3.3 `VdFooter.vue`: columns/dark/size modifiers, default +
      copyright slots; no listeners.
- [x] 3.4 `tests/components/vd-footer.spec.ts`.
- [x] 3.5 `VdFab.vue`: class mapping (size/variant incl. `error`→`danger`
      alias, glass, extended, positions), `click` emit, speed-dial
      (`actions` slot → `.vd-fab-menu`, `is-open` + `aria-expanded`,
      Escape + `useClickOutside` close — depends on task 5.1).
- [x] 3.6 `tests/components/vd-fab.spec.ts` incl. speed-dial open/close
      paths.

## 4. VdNavbar

- [x] 4.1 `VdNavbar.vue` ← `framework/js/components/navbar.js` (305):
      slots (brand/menu/actions) + burger; open/close state machine
      (`is-open`/`is-active`, generated overlay, `body-navbar-open`,
      `aria-expanded`/`aria-hidden`); Escape, outside click, overlay
      click, debounced resize-close via `--vd-breakpoint-lg` (992
      fallback); mobile `.vd-navbar-dropdown` submenu toggling; wire
      `useNavbarGlassScroll` for glass/transparent variants
      (`scroll-threshold` prop) — no duplicated scroll logic; full
      cleanup on unmount.
- [x] 4.2 `tests/components/vd-navbar.spec.ts`: toggle round-trip with
      body lock + overlay, Escape/outside/resize close, submenu toggle,
      unmount cleanup, `vd-navbar-scrolled` delegation smoke.

## 5. Promoted vd2 pieces

- [x] 5.1 `src/composables/useClickOutside.ts` ← vd2 donor (50 lines),
      carried with signature intact (capture-phase pointerdown, deferred
      attach, enable/disable + dispose detach).
- [x] 5.2 `tests/composables/use-click-outside.spec.ts`: outside fires,
      inside/pre-attach ignored, disable + unmount detach.
- [x] 5.3 `VdThemeSwitcher.vue` ← `theme-switcher.js` (466): menu mode
      (donor markup: toggle icon/label, `menuitemradio` options,
      `aria-checked`, Arrow/Escape keyboard, outside close via
      `useClickOutside`) + cycle mode (`menu=false`,
      system→light→dark); all state through `useThemePreference()`.
- [x] 5.4 `tests/components/vd-theme-switcher.spec.ts`: selection applies
      + persists, cycle order, keyboard contract, cross-component sync
      with the singleton.
- [x] 5.5 `VdThemeCustomizer.vue` — promote the vd2 donor (236 lines):
      de-pinia onto `useThemePreference()`; keep trigger/overlay/
      teleported-panel markup, desktop positioning + mobile reset,
      Escape/overlay/outside-click closes, `vd:open-customizer` window
      event, exposed `open`/`close`/`toggle`, reset button; add
      `show-palette` prop (default false) rendering the
      `PALETTE_OPTIONS` section; font select = absorbed
      `font-switcher.js` (245) capability via the theme layer; token
      arrays imported from the vd3 root surface.
- [x] 5.6 `tests/components/vd-theme-customizer.spec.ts`: swatch/radius/
      font writes (attribute + storage), palette opt-in, close paths,
      reset, window-event open, unmount listener cleanup.

## 6. Doc search

- [x] 6.1 `src/composables/useDocSearch.ts` ← `doc-search.js` (1016),
      data-driven core: options + donor defaults (minQueryLength 2,
      maxResults 10, debounceMs 150, highlightTag whitelist,
      keyboardShortcut), reactive `query`/`results`/`isOpen`/
      `activeIndex`, debounced ranked search (title > keyword > content),
      excerpting, escaped highlighting, ArrowUp/Down/Enter/Escape,
      Cmd/Ctrl+K global shortcut with mount/unmount lifecycle.
- [x] 6.2 `tests/composables/use-doc-search.spec.ts`: ranking + cap,
      min-length gate, debounce, escaped highlight, keyboard nav wrap,
      shortcut focus + unmount detach.
- [x] 6.3 `VdDocSearch.vue`: combobox/listbox markup shell over the
      composable (`.vd-doc-search*` classes, ARIA incl.
      `aria-activedescendant`, empty state, footer hints), `select`
      emit.
- [x] 6.4 `tests/components/vd-doc-search.spec.ts`: ARIA wiring, result
      rendering + highlight, selection emit + close, empty state.

## 7. Lazy load + grid

- [x] 7.1 `src/composables/useLazyLoad.ts` ← `lazy-load.js` (425):
      fire-once `observe`/`unobserve` (+ no-IO immediate fallback),
      `loadSection` (placeholder skeleton|spinner|sanitized custom, URL
      guard, 10 s abort, `sanitizeHtml` injection, `lazysection:*`
      events, error alert), root-scoped `[data-vd-lazy]` wiring, full
      disposal.
- [x] 7.2 `tests/composables/use-lazy-load.spec.ts` (mock IO + fetch):
      once-only callback, load lifecycle events + injection, unsafe URL
      + failure paths, sanitization, disposal.
- [x] 7.3 `src/composables/useGrid.ts` ← `grid.js` (290): per-container
      mode with classes/attribute/aria/`grid:modechange`, `:has()`
      detection + inline Fibonacci fallback and cleanup, reactive
      `mode` + `toggle`/`setMode`, unmount restore; export
      `setGridSystem(mode)` stamping/removing `data-grid` on `<html>`
      (client-guarded, non-persisting).
- [x] 7.4 `css/core/grid.css`: add the `[data-grid="fibonacci"]` rule
      block applying the Fibonacci templates to `.vd-row`s outside an
      explicit `.vd-grid-standard` container (closest-wins), mirroring
      the existing `.vd-grid-fibonacci` rules; keep stylelint green.
- [x] 7.5 `tests/composables/use-grid.spec.ts`: toggle round-trip +
      event, fallback columns per child count + clearing, invalid mode
      ignored, `setGridSystem` attribute round-trip with no storage
      write, unmount cleanup.

## 8. Barrel, gates, docs

- [x] 8.1 `src/index.ts`: export the 7 components, 4 composables,
      `setGridSystem`, and `useThemePreference` (+ types:
      `BreadcrumbItem`, `DocSearchDoc`/`DocSearchResult`, grid mode
      union, etc.). CHANGELOG: one unreleased `@vanduo-oss/vd3` entry —
      new surface + the `VdTree` cascade behavior-change callout
      (packages only, per policy).
- [x] 8.2 `pnpm build` green via `mise exec node@24 -- pnpm build`;
      `check:classes` gate passes with the seven new components' `vd-*`
      classes covered by `dist/vd3.min.css` (components + CSS changed).
- [x] 8.3 `pnpm test` green via `mise exec node@24 --` (every new export
      covered per `component-mount-specs` /
      `composable-behavior-specs`); `pnpm lint`, `pnpm stylelint`,
      `pnpm format:check`, `pnpm typecheck` green.
- [x] 8.4 Flag the new public surface + the `data-grid` CSS hook for
      vd3-docs (docs sync happens in the docs repo's own change).
- [x] 8.5 `openspec validate vd3-new-components --strict` green.
