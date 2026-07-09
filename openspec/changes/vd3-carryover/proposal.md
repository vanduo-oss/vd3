# vd3-carryover

## Why

After `vd3-token-css-foundation`, `@vanduo-oss/vd3` ships the full token + CSS
substance but its `.` export still exposes only `VD3_VERSION` — there are no
components, no composables, and no theme API, so nothing in the vd3 line can
actually be built with yet. The old `@vanduo-oss/vue` package (read-only
reference) already contains a mature Vue 3 surface: 38 SFC components, 7 layout
primitives, 31 composables, a theme layer, a plugin, and utilities. This change
carries over everything that is *pure Vue* — unmodified where possible, with
surgical retargeting where the old code depended on `@vanduo-oss/core` (token
data), `@vanduo-oss/framework` (IIFE runtime), or `pinia` (toast store), none
of which exist in the standalone, zero-runtime-dep vd3 line.

## What Changes

- **Components (37 of 38)**: copy every SFC from `vue/src/components/` into
  `src/components/` — all except **`VdMenu`**, which imports the
  `window.Vanduo*`-delegating `useDropdown` and is therefore **deferred to the
  `vd3-rewrites` change** (the only component in that situation; `VdFlow` was
  audited and does *not* import `useFlow` — it is self-contained and carries
  over). `form-types.ts` (VdRadioGroup/VdSelect prop interfaces) comes along.
- **Layout primitives (7)**: `VdBox`, `VdCenter`, `VdCover`, `VdFrame`,
  `VdInline`, `VdStack`, `VdSwitcher` from `vue/src/components/primitives/`.
- **Pure composables (18)**: `useAffix`, `useDatepicker`, `useFocusTrap`,
  `useGlass`, `useKeyboardNav`, `useMorph`, `useMorphBadges`,
  `useNavbarGlassScroll`, `useParallax`, `useScrollspy`, `useSidenav`,
  `useStepper`, `useSuggest`, `useTheme`, `useThemeBridge`, `useTimepicker`,
  `useTooltips`, `useWaypoint`. The 12 excluded ones (`useDropdown`,
  `useDraggable`, `useImageBox`, `useRipple`, `useSpotlight`, `useTimeline`,
  `useExpandingCards`, `useFlow`, `useTabs`, `useValidate`, `useSearch`,
  `usePopover`) are NOT carried — they either delegate to `window.Vanduo*`
  globals or follow the framework's DOM-scan init pattern, and are rewritten
  pure in `vd3-rewrites`.
- **useToast REWRITTEN** (`vue/src/composables/useToast.ts`, 123 lines,
  mirroring `framework/js/components/toast.js` defaults): the pinia
  `defineStore` becomes a module-scope `reactive()` singleton with an
  **identical public API** (`useToast`, `useToastStore`, `ToastType`,
  `ToastPosition`, `ToastEntry`, `ToastOptions`, the flexible `show()`
  signature, `dismiss`/`success`/`error`/`warning`/`info`, reactive `queue`).
  The public API is locked by a type-level test written and committed BEFORE
  the rewrite. The pinia peer dependency stays dropped. **BREAKING** (vs old
  `@vanduo-oss/vue`): the pinia store meta-API (`$patch`, `$subscribe`,
  `$reset`, devtools) is gone; the documented surface is unchanged.
- **Theme layer retargeted**: `useTheme` (204 lines) keeps its whole
  preference model (`setThemeDefaults` / `getThemeDefaults` /
  `defaultPreference` / `loadPreference` / `applyPreference` /
  `persistPreference` / `defaultPrimary` / `isDefaultPrimary`, `vanduo-*`
  localStorage keys, `data-*` attribute application) but its
  `@vanduo-oss/core` import is retargeted to vd3's own generated token data:
  `scripts/build-tokens.mjs` gains a fourth consumer-facing emit, a gitignored
  `src/theme/generated/tokens.data.ts`, which vite inlines into the lib
  bundle. `dist/tokens.js` + `dist/tokens.d.ts` are **dropped** — the package
  root becomes the one JS token-data surface; `./tokens.json` stays exported
  for non-JS tooling (see design.md). `useThemeBridge` (23 lines) carries
  unmodified.
- **Plugin**: `VanduoVue` keeps its exported name and `themeDefaults` install
  option so old docs/app code ports 1:1, but **BREAKING**: the IIFE loading is
  deleted — `loadVanduoRuntime` is removed, `src/shims.d.ts` (the
  `@vanduo-oss/framework/iife` module shim) is not carried, and nothing
  references `window.Vanduo*` anywhere in `src/`.
- **Utilities & types**: `utils/sanitizeHtml.ts` (129 lines), `types.ts`
  (`StatusVariant`), and the `TreeNode` type re-export carry verbatim. The
  barrel `src/index.ts` mirrors the old barrel minus the deferred/deleted
  entries and keeps `VD3_VERSION`.
- **Class-coverage gate**: `vue/scripts/check-class-coverage.mjs` (136 lines)
  is carried to `scripts/check-class-coverage.mjs`, with its default CSS path
  repointed at `dist/vd3.min.css` and its remediation message repointed at
  `css/`. Wired as a `check:classes` script, appended to the `build` chain,
  and added as a CI step.
- **Test bootstrap (all new — the old vue repo shipped no tests)**: every
  carried component gets a vitest mount spec (rendered `vd-*` classes,
  props→class mapping, emits, `v-model` where applicable); every carried
  composable gets a jsdom behavior spec; the useToast API type-lock spec lands
  first.
- **CI/gates wiring**: `pnpm build:tokens` runs after install in CI (the
  generated `tokens.data.ts` must exist before typecheck/test on a fresh
  clone); `check:classes` runs after build.

## Non-goals

- No rewrites of the 12 delegating/DOM-scan composables and no `VdMenu` —
  that is the `vd3-rewrites` change. (Scope note for that change: `useTabs`,
  `useValidate`, and `useFlow` turn out to be DOM-scan reimplementations
  rather than true `window.Vanduo*` delegators, so their "rewrite" is a
  redesign away from DOM-scan init, not an un-delegation.)
- No new components, props, variants, or CSS — carried code is byte-faithful
  except for the documented retargets (imports, plugin, toast store).
- No Nuxt module, no accent-color change (both deferred from the old
  package-feedback round).
- No npm publish; version stays `0.1.0` pre-release.
- No docs-site work beyond flagging the new surface for vd3-docs — the docs
  repo keys off this change once it exists.
- No changes to the old repos (core, framework, vue, vd2, satellites) — they
  remain strictly read-only.

## Capabilities

### New Capabilities

- `components`: the carried SFC component + layout-primitive surface, its
  parity contract with the old `@vanduo-oss/vue` markup/classes/props/emits,
  the toast stack, the per-component mount-spec requirement, and the
  class-coverage gate against `dist/vd3.min.css`.
- `composables`: the 18 carried pure composables, the useToast singleton
  rewrite with its type-locked API, the per-composable jsdom spec
  requirement, and the exclusion guard (no `window.Vanduo*` anywhere).
- `theme-runtime`: the theme preference model (defaults, storage, `data-*`
  application), the generated-token-data import strategy, `useThemeBridge`,
  and the `VanduoVue` plugin.

### Modified Capabilities

- `design-tokens`: `token-build-generator` and `token-data-module` change —
  the generator emits `src/theme/generated/tokens.data.ts` (gitignored TS
  source, inlined into the lib bundle) instead of `dist/tokens.js` +
  `dist/tokens.d.ts`; export-surface parity is asserted at the package root.
  `dist/tokens.json` and the CSS partials are untouched.
- `repo-scaffold`: `quality-gates` and `continuous-integration` change — a
  fresh clone now bootstraps with `pnpm build:tokens` before
  typecheck/test/lint gates can pass, and the CI run order gains
  `build:tokens` (after install) and `check:classes` (after build).

## Impact

- Package: `@vanduo-oss/vd3` stays `0.1.0` (pre-release, unpublished). The
  `.` export grows from one constant to the full component/composable/theme
  surface; no exports-map entries change. `sideEffects` stays CSS-only.
- Semver / API compatibility (vd2 → vd3 migration notes, old
  `@vanduo-oss/vue@0.3.0` → `@vanduo-oss/vd3`):
  - Specifier: `@vanduo-oss/vue` → `@vanduo-oss/vd3`; token data moves from
    `@vanduo-oss/core` to the vd3 package root (same names:
    `DEFAULTS`, `PALETTE_OPTIONS`, `PRIMARY_COLORS`, `NEUTRAL_COLORS`,
    `RADIUS_OPTIONS`, `FONT_OPTIONS`, `THEME_MODES`, `tokens` + type unions).
  - **BREAKING**: `loadVanduoRuntime` no longer exists (no IIFE, no
    `window.Vanduo*`). Apps that awaited it just delete the call.
  - **BREAKING**: the 12 delegating composables and `VdMenu` are absent until
    `vd3-rewrites` lands.
  - **BREAKING**: pinia is no longer a peer; `useToastStore()` returns the
    module singleton, not a pinia store (documented members identical;
    `$patch`/`$subscribe`/devtools integration gone).
  - Everything else is 1:1: component names/props/emits/slots, rendered
    `vd-*` classes, `StatusVariant` vocabulary (`danger` canonical), theme
    behavior and `vanduo-*` localStorage keys, `sanitizeHtml`.
- Build: `build` chain becomes `clean → build-tokens → build-css → vite →
  vue-tsc → check:classes`; `build-tokens` additionally writes
  `src/theme/generated/tokens.data.ts` and stops writing `dist/tokens.js` /
  `dist/tokens.d.ts`.
- Tooling: `.gitignore`, ESLint/Prettier ignores gain `src/theme/generated/`;
  vitest suite grows from 5 spec files to ~65 (44 component + 19 composable +
  theme/plugin/API-lock specs); `tests/build-tokens.spec.ts` retargets its
  token-data assertions from `dist/tokens.js` to the generated TS module and
  the root export. No new dependencies (pinia explicitly NOT added).
- Changelog: one unreleased `@vanduo-oss/vd3` entry (packages only, per
  policy).
