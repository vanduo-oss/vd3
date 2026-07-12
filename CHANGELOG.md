# Changelog

All notable changes to `@vanduo-oss/vd3` are documented here. This file
tracks the package only — never docs-site content.

## Unreleased

- Hardening (`vd3-hardening`): `useTabs` now accepts the framework's dual
  selectors (`.vd-tabs, [data-tabs]` / `.vd-tab-link, [data-tab]`) for markup
  parity (non-breaking superset); `VdThemeSwitcher` returns focus to its toggle
  on Escape and moves focus into the menu on open (a11y); `useDocSearch` yields a
  sensible excerpt for title/category/keyword-only matches; and the glass noise
  effect's inline-SVG `filter="url(#n)"` fragment no longer gets rebased to a
  bogus `effects/%23n` path by lightningcss in the minified bundle (regression
  guarded in `tests/generated-css.spec.ts`).
- New components + composables (`vd3-new-components`): seven new SFCs land —
  `VdBreadcrumb`, `VdFooter`, `VdFab` (with speed-dial), `VdNavbar` (ported
  from `framework/js/navbar.js`: burger + overlay + body-lock + resize/Escape/
  outside close, wired to `useNavbarGlassScroll` for glass/transparent
  variants), `VdThemeSwitcher` (menu + cycle modes) and `VdThemeCustomizer`
  (de-pinia'd onto the vd3 theme layer, `show-palette` prop, `vd:open-customizer`
  window event) — both share the new `useThemePreference` singleton, and
  `VdDocSearch` (combobox/listbox over the new
  `useDocSearch` composable). Five composables are added: `useThemePreference`
  (module-scope reactive theme-preference singleton — the de-pinia'd replacement
  for vd2's theme store and the shared source of truth behind both theme
  controls, with `setTheme`/`setPalette`/`setPrimary`/`setNeutral`/`setRadius`/
  `setFont`/`reset` and a refcounted `prefers-color-scheme` listener),
  `useClickOutside`
  (promoted from vd2, signature intact), `useDocSearch`, `useLazyLoad`
  (IntersectionObserver reveal + `loadSection` with `sanitizeHtml` injection and
  https/relative URL guard), and `useGrid` + `setGridSystem` (per-container
  standard/fibonacci mode with `grid:modechange`, plus a document-level
  `data-grid="fibonacci"` default backed by new `css/core/grid.css` rules that
  apply the Fibonacci templates to `.vd-row`s outside an explicit
  `.vd-grid-standard` container, closest-container-wins). **BEHAVIOR CHANGE**:
  `VdTree`'s `cascade` prop now genuinely defaults to `true` via `withDefaults`
  (the prior type-only `defineProps` + `props.cascade ?? true` never engaged, so
  parent→child check cascade silently never fired); mounting `VdTree` without
  the prop now cascades a parent check to its descendants — pass
  `:cascade="false"` to opt out.
- Rewritten composables + `VdMenu` un-defer (`vd3-rewrites`): the twelve
  delegating/DOM-scan composables deferred at carryover are restored as pure
  Vue rewrites (no `window.Vanduo*`, no framework IIFE) — `useRipple`,
  `useSearch`, `useExpandingCards`, `useValidate`, `useTimeline`, `usePopover`,
  `useFlow`, `useTabs`, `useSpotlight`, `useDropdown`, `useImageBox`,
  `useDraggable` — and `VdMenu` (built on the rewritten `useDropdown`) ships.
  Each preserves the old `useX(root: Ref<HTMLElement | null>)` shim signature
  (call sites port unchanged) while additively returning an optional controller
  and, where relevant, accepting an `options` argument; controllers expose a
  `refresh()` idiom for re-scanning DOM added after mount (idempotent across
  `v-for` re-renders). **Behavior notes**: overlays/instances now tear down
  per-instance (no `destroyAll()` nuking sibling instances) and dismissal
  handlers only emit `*:hide` for panels actually open; `useSearch` returns the
  module-scope `SearchRegistry` (register/unregister/list/query) and is callable
  from app-level code outside component setup.
- Vue surface carryover (`vd3-carryover`): the pure-Vue surface of the old
  `@vanduo-oss/vue` package lands 1:1 — 37 SFC components (all except
  `VdMenu`, deferred to `vd3-rewrites` with the 12 delegating/DOM-scan
  composables), the 7 layout primitives, 19 composables (incl. the theme
  layer and `useToast`), `sanitizeHtml`, the `StatusVariant`/`TreeNode`
  types, and the `VanduoVue` plugin. Token data now ships inlined in the lib
  bundle via a generated `src/theme/generated/tokens.data.ts` (same export
  surface as the old `@vanduo-oss/core`: `DEFAULTS`, `PALETTE_OPTIONS`,
  `PRIMARY_COLORS`, `NEUTRAL_COLORS`, `RADIUS_OPTIONS`, `FONT_OPTIONS`,
  `THEME_MODES`, `tokens` + types, re-exported from the package root);
  `dist/tokens.js` + `dist/tokens.d.ts` are **dropped** (`./tokens.json`
  stays). **BREAKING** vs old `@vanduo-oss/vue`: `loadVanduoRuntime` is
  removed (no IIFE runtime, no `window.Vanduo*`), and `useToast` is a
  pinia-free module singleton — identical documented API (`useToastStore`,
  `useToast`, flexible `show()`, typed helpers, reactive `queue`) but the
  pinia meta-API (`$patch`/`$subscribe`/devtools) is gone and pinia is no
  longer a peer. New `check:classes` gate proves every rendered `vd-*`
  class has a selector in `dist/vd3.min.css`.
- Token + CSS foundation (`vd3-token-css-foundation`): vd3 becomes fully
  standalone. DTCG token sources absorbed from the old core repo
  (`tokens/`) with a zero-dependency generator emitting the generated color
  partials (`css/core/generated/`), the typed token-data module
  (`dist/tokens.{js,d.ts}` — same export surface as `@vanduo-oss/core`) and
  `dist/tokens.json`; authored CSS tree absorbed from the old framework
  repo (`css/`, entry `vd3.css`) bundled via lightningcss into
  `dist/vd3(.min).css` and the no-icons `dist/vd3-core(.min).css`; fonts
  and Phosphor icons (regular + fill only) ship in `dist/`. The `./css`,
  `./css/core` and `./tokens.json` exports now resolve.
- Repo scaffold (`init-vd3-scaffold`): package metadata and exports map,
  hardened `.npmrc`, TypeScript/ESLint/Prettier/Stylelint/Vitest tooling,
  SHA-pinned CI workflow, MIT license, stub `src/index.ts` exporting
  `VD3_VERSION`, and a smoke spec. No tokens, CSS, or components yet.
