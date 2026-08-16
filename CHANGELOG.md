# Changelog

All notable changes to `@vanduo-oss/vd3` are documented here. This file
tracks the package only — never docs-site content.

## 1.6.0 — 2026-08-16

### Added

- **`VdCodeSnippet` chrome mode** — when any of `html` / `css` / `js` /
  `shell` / `vue` / `json` is set, the component renders the collapsible
  tabbed “View Code” widget the CSS already described (toggle, tablist,
  panes, raw-source copy). Simple mode (`code` / `language` / `copyable`)
  is unchanged. Optional `highlight(code, language)` injects escaped HTML
  via `v-html`; without it, source is text-interpolated. vd3 does not
  tokenize and does not depend on cbun or highlight.js. Cbun `.vd-tk-*`
  spans map onto `--vd-code-*` inside `.vd-code-snippet`. In both simple
  and chrome modes, Copy lives in the snippet header (top-right), not
  overlaid on the code body.
- **`VdButton` `ink` variant** — `.vd-btn-ink`: transparent fill, a single
  2px outline (not `.vd-btn-ring`). Hover fills black in light and primary
  in dark; the label uses `--vd-text-on-primary`. Existing `outline` /
  `ghost` / ring treatments are unchanged.

### Fixed

- **Snippet Copy header** — Copy stays in `.vd-code-snippet-header` (top-right)
  for simple and chrome modes. Simple mode no longer paints the control over
  the `<pre>`.
- **Button SR children** — a `.vd-visually-hidden` child inside `.vd-btn`
  is taken out of flow so a new-tab hint cannot wrap onto a second line
  and un-center the label.
- **Snippet chrome tabs** — the active tab stays a key that still exists
  when `html` / `css` / `js` / … props change after mount. Tabs get
  `aria-controls` / pane `role="tabpanel"` linkage and Left/Right/Home/End
  navigation, matching `VdTabs`.

## 1.5.0 — 2026-08-15

### Added

- **Oola Dock** — `VdDock` + `VdDockItem` + `useDockOrientation`. Fat Seemore
  glass pill that morphs horizontal ↔ vertical through a square waypoint
  (480ms / 720ms). Slots `#brand`, default items, `#actions`. `position`
  `fixed` (viewport chrome) or `contained` (absolute in a relative parent).
  Dock-own `--vd-dock-radius` (default 1.25rem, up to a full pill) — not the
  theme `RadiusOption` cap of 0.5rem. Optional Open Color `tint`, Seemore
  `glass` step (default 34), `itemLayout` stack/inline, and `placement`
  (`bottom` | `top` | `left` | `right`, default `bottom` — morph pairs
  `bottom` ↔ `left` and `top` ↔ `right`). Opt-in `cycle="edges"` walks
  brand click through `bottom` → `left` → `top` → `right` without changing
  default `toggle()`. When both `v-model:placement` and
  `v-model:orientation` are bound, placement wins if those updates land out
  of order — a stale orientation no longer snaps back to the previous edge.
  Persist is opt-in via
  `getStoragePrefix() + "dock-orient"`. Instance-scoped morph state (not a
  module singleton). Brand is a slot; the package does not bake an oola / ū
  mark. A narrow viewport forces the pair's horizontal edge without
  overwriting that stored preference, and the brand hover style does not
  apply while the control is `aria-disabled`.

## 1.4.0 — 2026-08-14

### Added

- **Auth screens** — headless `VdAuthCard`, `VdLogin`, `VdSignUp`, and
  `VdForgotPassword`. They emit `submit` / `social` and never fetch; parents
  own sessions, CSRF tokens, and OAuth SDKs. Password fields use WHATWG
  autocomplete tokens (`current-password` / `new-password` / `email`) and a
  real reveal button (`aria-pressed`), never `autocomplete="off"`.
- **Form primitives for those screens** — `VdCheckbox` (boolean v-model),
  `VdOtpInput` (paste-to-fill, `autocomplete="one-time-code"`), `VdInput`
  `#prefix` / `#suffix` slots plus `revealPassword`, `VdCard` `glass`.
- **Data table** — `useTableState` (search → sort → page, or `manual` for
  server-sliced rows) and `VdDataTable` (sortable `aria-sort` headers, cell
  slots, selection, sticky header, skeleton loading, `VdEmptyState`, composed
  `VdPagination`). Presentational `VdTable` is unchanged.

## 1.3.0 — 2026-08-12

### Added

- **Seemore Glass** — Fibonacci strength-step frosted material system.
  Canonical modifiers `.vd-glass-{1,2,3,5,8,13,21,34,55,89}` bundle blur, tint,
  border, saturate, grain, and elevation so thickness reads as one coherent
  step. Steps 34/55/89 extend toward a ~100 marketing ceiling (89 extreme;
  next fib 144 omitted). Blur rises only modestly past the 20px GPU soft-cap;
  tint / edge / saturate / grain / elevation carry most of the extra weight.
  Prefer 1–21 for UI chrome. Base `.vd-glass` / `.vd-glass-md` map to step 5.
  Legacy `.vd-glass-sm|lg|xl` remain as aliases for steps 3 / 8 / 13. New
  `.vd-glass-adaptive` applies a theme-aware tint wash on top of any step.
  Scroll-activated glass and navbar glass no longer transition
  `backdrop-filter` (proxy opacity / fill / border only). Navbar scrolled
  frost clamps to the step-21 soft-cap (20px). Reduced transparency /
  contrast / motion preferences are baked into the shared glass rules.
  `VdModal` `glass` uses a light frosted panel (step-13 defaults) over a soft
  wash backdrop — not opaque dark chrome.
- **Decorative Surfaces** — Layer 5 `.vd-surface` with variants
  `mesh`, `stripe`, `noise`, `aurora`, `dots`, `grid` and Fibonacci intensity
  modifiers `.vd-surface-{3,5,8}` for reusable hero / marketing backdrops
  (especially under Seemore Glass).
- **Floating navbar** — opt-in `.vd-navbar-float` (and `VdNavbar` `float`
  prop) insets fixed/sticky top bars with responsive Fibonacci spacing and a
  large capsule radius. Default navbar stays edge-to-edge. Glass chrome uses a
  light frosted wash + inset specular highlight inspired by Avaz Bokiev’s
  MIT CodePen “Apple Liquid Glass UI (2025)”
  (https://codepen.io/samarkandiy/pen/MYwQwZZ); still no
  `backdrop-filter` animation; reduced-transparency hardens to solid.
  Scrolled frost keeps a translucent **white** wash in light _and_ dark
  (near-transparent in dark — no grey fog / `--vd-glass-bg-dark`). Float
  capsules optically center brand/content (`padding-top`/`padding-bottom`
  tweak + brand `line-height: 1` / zero bottom margin). Dist CSS restore
  keeps unprefixed `backdrop-filter` (LightningCSS otherwise emits only
  `-webkit-`, which Chromium ignores — that was the dark grey-fog glitch).

## 1.2.3 — 2026-08-12

### Added

- Optional **`storagePrefix`** on `app.use(VanduoVue, { storagePrefix })` and
  `setStoragePrefix` / `getStoragePrefix` so multi-app same-origin hosts can
  isolate theme preference `localStorage` keys. Default remains `vanduo-*`
  (back-compat); no automatic migration between prefixes.

## 1.2.2 — 2026-08-09

### Added

- **Liquid Gradient** effect: vanilla WebGL interactive atmosphere bound to
  primary / neutral / background theme tokens, with `--vd-liquid-*`
  customization knobs. Opt-in via `.vd-liquid-gradient` +
  `useLiquidGradient(root)` / `createLiquidGradient(canvas)`. Inspired by
  Cameron Knight’s MIT CodePen (vanilla reimplementation; no Three.js).

### Fixed

- Native `<select>` (and custom-select button) **chevron no longer tiles**
  when a consumer overrides fill with the `background` shorthand. Focus /
  disabled / dark theme rules that swap the caret `background-image` now
  also re-declare `background-repeat`, `background-position`, and
  `background-size`. Prefer `background-color` (or explicit longhands) when
  tinting selects so other background layers stay intact.

## 1.2.1 — 2026-08-02

### Added

- `VdModal` gains an opt-in **`glass`** prop that applies the existing
  `.vd-modal-glass` / `.vd-modal-glass-backdrop` classes (same idea as
  `VdFab`’s `glass`). CSS was already shipped; the prop wires it for Vue
  consumers. Fallthrough attrs bind on the dialog root (`inheritAttrs: false`)
  so glass token overrides on `<VdModal>` land correctly through Teleport.
- Opt-in **stepper scroll-reveal**: containers with `.vd-stepper-animated` get
  a staggered IntersectionObserver reveal (mirrors timeline). `useStepper`
  accepts optional `UseStepperOptions` (`staggerMs`, `maxStaggerIndex`);
  prefers-reduced-motion and missing `IntersectionObserver` reveal immediately.

### Fixed

- Outline, ghost, and plain buttons with `.is-loading` now keep a **visible
  spinner**. `.is-loading` blanks the label with `color: transparent`, and the
  legacy `::after` spinner (and `.vd-btn-spinner`) used `currentColor`, so
  transparent-fill treatments painted an invisible spinner. Solid variants
  already pinned white/black; outline/ghost/plain now pin their accent colours
  the same way.
- **Spotlight** cutout is a body-level `.vd-spotlight-highlight` instead of a
  9999px box-shadow on the target. Transformed ancestors (e.g. cards with
  `translateZ(0)`) no longer trap the dimming shadow so later siblings stay
  undimmed; geometry animates between steps.
- **Morph** no longer reverse-animates (“bounce”) at end-of-swap: a short
  `.is-morph-settling` freeze + cooldown blocks re-entrant clicks; default
  duration/easing are snappier (no springy overshoot). Same settle path for
  `useMorphBadges`.
- **Vertical button groups** (`.vd-btn-group.vd-btn-group-vertical`) no longer
  inherit horizontal edge-sharing margins/radii — jagged left edges and
  squeezed label wrap are gone; labels stay `nowrap` and the stack sizes to
  the widest button.
- **Transfer** move buttons use Phosphor carets via `VdIcon`, match icon-button
  sizing, and gain clearer hover/focus-visible styles.
- **Collections** flush inside a card body clip to the card’s inner radius so
  item hover backgrounds do not square off past rounded corners.
- Stepper connector `::after` is `pointer-events: none` so decorative lines
  never steal clicks from steps.

## 1.2.0 — 2026-07-31

### Added

- Buttons gain an opt-in **ring modifier** (`.vd-btn-ring`, or `:ring="true"` on
  `VdButton`) — a concentric outer stroke separated from the button by a
  transparent gap, for marking one action as the primary one on a screen that
  already uses solid buttons throughout. It layers onto any existing variant,
  size and state rather than being a variant of its own, and because the gap is
  real transparency it reads correctly on cards, glass and imagery. Tunable
  through five `--vd-btn-ring-*` custom properties. The ring is suppressed
  inside `.vd-btn-group`, where buttons deliberately share edges. Additive and
  backward-compatible — no button without the modifier renders differently —
  which is why the release is a minor (`1.1.x → 1.2.0`).

## 1.1.0 — 2026-07-24

### Added

- `VdModal` gains an **`xl` size** (`size="xl"`) — the 987px / fib-16 width that
  already existed as the `--vd-modal-width-xl` token is now reachable through the
  component, joining `sm` / `md` / `lg`. Additive and backward-compatible;
  `size="xl"` maps to the `vd-modal-panel-xl` panel class. This additive feature
  is why the release is a minor (`1.0.x → 1.1.0`).

### Fixed

- Accessibility / lifecycle hardening (`vd3-a11y-lifecycle`), non-breaking:
  - `VdModal` now traps Tab focus within the panel (via `useFocusTrap`),
    restores focus to the opener on close, and no longer leaks its global
    Escape handler when unmounted while open.
  - `VdOffcanvas` now presents as a modal dialog (`role="dialog"`,
    `aria-modal`, focus trap) and resets the `document.body` scroll lock on
    unmount, so unmounting while open can no longer leave the page locked.
  - `VdTabs` now follows the WAI-ARIA tabs pattern: roving tabindex,
    ArrowLeft/Right/Home/End keyboard navigation moving selection and focus,
    per-tab `id`/`aria-controls`, a `role="tabpanel"` panel with
    `aria-labelledby`, and `role="tablist"` on the tab list.
  - `VdCustomSelect` now exposes `aria-controls` + `aria-activedescendant`
    (with stable option ids) and no longer emits a dangling `aria-labelledby`.
  - `VdRating` is now a valid radiogroup: exactly one `aria-checked` star, a
    roving tabindex, and DOM focus that follows the arrow keys.
  - `useTimepicker` is now keyboard-operable (Arrow keys move a roving
    highlight with `aria-activedescendant`; Enter selects; Escape closes).
  - `useKeyboardNav` now attaches its keydown listener on mount and removes it
    on unmount (previously a no-op-prone, never-cleaned-up listener).
- Sanitizer and composable hardening (`vd3-sanitize-coverage`), non-breaking:
  - `sanitizeHtml` now keeps allow-listed SVG under `allowSvg`: the tag/attr
    allowlist is matched case-insensitively, fixing a dead branch that stripped
    every `<svg>` to text (an HTML-mode `DOMParser` lowercases SVG node names).
  - `sanitizeHtml`'s `allowStyle` now applies a minimal CSS blocklist scrub
    (dropping `style` values containing `url(`, `expression(`, or
    `position: fixed|sticky`) instead of passing the raw value through verbatim.
  - `useClickOutside` now attaches on mount when `enabled` is already true
    (previously it reacted only to a false→true transition, contradicting its
    JSDoc).
  - `useStepper` no longer dispatches a spurious `stepper:change` on mount for
    the initial (unchanged) step (`current === previous`). **Behavior change:** a
    consumer that relied on the mount-time event should read the initial step
    directly (or in `onMounted`) instead.
  - Added the missing `.vd-validate-error` selector that styles the message
    `useValidate` injects beneath an invalid field.

### Changed

- Housekeeping (`vd3-token-ci-hygiene`), non-breaking:
  - Removed dead `btn btn-sm btn-outline` classes from `VdThemeCustomizer`'s
    Reset button (it is already styled by `.customizer-reset`).
  - Softened the `dist/tokens.json` `$description` so it no longer implies it is
    the complete `--vd-*` set (non-color props ship only from
    `css/core/tokens.css`).

## 1.0.0 — 2026-07-13

First public release of `@vanduo-oss/vd3` — the standalone Vue 3 line of Vanduo
UI (one package ships its own DTCG tokens, CSS tree, and typed `Vd*`
components/composables; sole peer `vue >=3.3`, no pinia, no IIFE runtime). The
bullets below roll up the development history that makes up 1.0.0 (scaffold →
token/CSS foundation → pure-Vue carryover → composable rewrites → new
components/composables → hardening). Publish prep (`vd3-publish-prep`) added
`publishConfig.access: "public"`, a build-before-publish `release`/`prepack`
flow, a consumer-friendly `engines.node` floor, and dropped the never-fetched
legacy Phosphor SVG webfont from the tarball.

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
