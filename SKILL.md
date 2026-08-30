---
name: vanduo-vd3
description: Use when building UIs with @vanduo-oss/vd3 — the standalone Vue 3 design system line of Vanduo (63 components, 40 composables, a runtime theme layer, and its own DTCG tokens + CSS). Covers install, the VanduoVue plugin, the component/composable inventory, the data-*/--vd-*/vanduo-* theming contract, and SSR safety.
---

# @vanduo-oss/vd3

The **Vue3-only line** of the Vanduo design system: one standalone package
that ships its own DTCG tokens, CSS tree, and typed `Vd*` components and
composables. It replaces the old three-package split (`@vanduo-oss/core`
tokens + `@vanduo-oss/framework` CSS/JS + `@vanduo-oss/vue` components) with a
single dependency. Sole peer: `vue >=3.3` — **no pinia**, no framework IIFE
runtime, no `window.Vanduo*` globals.

## Install

```sh
pnpm add @vanduo-oss/vd3
```

Three integration points, all resolved from the `package.json` exports map:

```ts
// main.ts
import { createApp } from "vue";
import { VanduoVue } from "@vanduo-oss/vd3";
import "@vanduo-oss/vd3/css"; // full stylesheet (tokens + components + icons)
import App from "./App.vue";

createApp(App).use(VanduoVue).mount("#app");
```

`app.use(VanduoVue)` takes optional `{ themeDefaults, storagePrefix }` —
`themeDefaults` overrides the generic baseline before the theme model first
reads it; `storagePrefix` remaps preference `localStorage` keys (default
`"vanduo-"`):

```ts
app.use(VanduoVue, {
  themeDefaults: { PRIMARY_DARK: "blue" },
  storagePrefix: "ts-school-",
});
```

Then render components in any template:

```vue
<script setup lang="ts">
import { VdButton, VdCard } from "@vanduo-oss/vd3";
</script>

<template>
  <VdCard>
    <VdButton variant="primary">Save</VdButton>
  </VdCard>
</template>
```

Stylesheet import options:

| Import                        | Contents                                      |
| ----------------------------- | --------------------------------------------- |
| `@vanduo-oss/vd3/css`         | Full stylesheet — tokens + components + icons |
| `@vanduo-oss/vd3/css/core`    | Tokens-only stylesheet (no icon fonts)        |
| `@vanduo-oss/vd3/tokens.json` | Resolved DTCG token data (JSON)               |

## Components (63)

56 `Vd*` components plus 7 layout primitives. All are named exports from the
package root and register nothing globally — import only what you render.

**Form & input (13):** `VdButton`, `VdButtonGroup`, `VdInput`, `VdSelect`,
`VdCustomSelect`, `VdCheckbox`, `VdCheckboxGroup`, `VdRadioGroup`, `VdSwitch`,
`VdSlider`, `VdRating`, `VdTransfer`, `VdOtpInput`. Native `<select>` /
`select.vd-input` carets use `background-image`; tint with `background-color`
(not the `background` shorthand) so focus/dark overrides cannot tile the chevron.
Password fields may set `revealPassword` for a suffix eye toggle.

**Auth (4):** `VdAuthCard`, `VdLogin`, `VdSignUp`, `VdForgotPassword`. Headless
screens — they emit `submit` / `social` and never fetch. Compose `VdAvatar` in
the brand slot. Parents own sessions, CSRF tokens, and OAuth SDKs.

**Data display (10):** `VdTable`, `VdDataTable`, `VdEmptyState`, `VdTree`,
`VdTreeNode`, `VdCollection`, `VdCard`, `VdBadge`, `VdChip`, `VdAvatar`.
`VdTable` is presentational text cells; `VdDataTable` adds sort, search,
selection, pagination, and cell slots.

**Feedback & status (9):** `VdAlert`, `VdModal`, `VdOffcanvas`, `VdToast`,
`VdToastContainer`, `VdProgress`, `VdSpinner`, `VdPreloader`, `VdSkeleton`

**Navigation (10):** `VdNavbar`, `VdDock`, `VdDockItem`, `VdSidenav`, `VdMenu`,
`VdTabs`, `VdBreadcrumb`, `VdPagination`, `VdFooter`, `VdFab`. `VdDock` is the
Oola Dock — a morphing glass pill (`useDockOrientation`). Brand is a slot;
`--vd-dock-radius` is independent of the theme 0.5rem radius cap.
`placement` is `bottom` | `top` | `left` | `right` (default `bottom`).
Brand click morphs the pair (`bottom` ↔ `left`, `top` ↔ `right`) unless
`cycle="edges"` walks all four. `tintMode` is `surface` (default — `tint`
paints the pill) or `accent` (pill stays ink, `--vd-dock-tint` is left for
items and the brand slot to consume).

**Content & utility (8):** `VdAccordion`, `VdCodeSnippet`, `VdIcon`,
`VdSeparator`, `VdTooltip`, `VdDocSearch`, `VdGlobalSearch`, `VdFlow`.
`VdDocSearch` is the inline page-scoped field; `VdGlobalSearch` is the
site-wide command palette (`⌘K` / `/`) built on `useGlobalSearch`. It is
engine-agnostic — pass a `GlobalSearchAdapter` and it never imports a search
engine itself. AI answers are opt-in behind a toggle that stays off until the
user flips it; bind `aiEnabled` to take control of that toggle and read
`update:aiEnabled`. Every other prop is read once on mount. Stack it with
`--vd-global-search-overlay-z-index` / `--vd-global-search-modal-z-index`.
`VdCodeSnippet` does not highlight unless the caller passes `highlight`
(must return escaped HTML; copy stays raw). Simple mode is `code` /
`language` / `copyable`. Chrome mode (any of `html` / `css` / `js` /
`shell` / `vue` / `json`) is the collapsible tabbed widget.

**Theme controls (2):** `VdThemeSwitcher`, `VdThemeCustomizer`.
`VdThemeCustomizer` has two presentations via `variant`: `panel` (default —
the full palette / primary / neutral / radius / font editor) and `swatches`
(primary only, as a fan hinged at the trigger for dock and toolbar chrome;
`swatches` narrows the hues, `direction` sets the axis, `preview` applies on
hover). Bind `primary` + listen to `update:primary` to keep an app-side store
authoritative instead of the `useThemePreference()` singleton.

**Layout primitives (7):** `VdBox`, `VdCenter`, `VdCover`, `VdFrame`,
`VdInline`, `VdStack`, `VdSwitcher`

Two component types are also re-exported: `BreadcrumbItem` (from `VdBreadcrumb`)
and `TreeNode` (from `VdTreeNode`), plus auth payload types (`AuthProvider`,
`LoginSubmit`, `SignUpSubmit`, `ForgotPasswordSubmit`) and data-table types
(`DataTableColumn`, `TableSort`, `TableRow`). The shared `StatusVariant` type
is exported for prop typing.

## Composables (40)

Named exports from the package root. Each keeps the `useX(root?)` shape from the
old `@vanduo-oss/vue` surface, rewritten as pure Vue (no DOM-scan runtime).

**Theme (2):** `useTheme` (the theme layer — see below — plus the
`useThemePreference` reactive singleton) and `useThemeBridge` (mirror an
external `Ref<ThemeMode>` onto the `data-theme` attribute).

**Form & validation (6):** `useDatepicker`, `useTimepicker`, `useStepper`,
`useSuggest`, `useSearch`, `useValidate`.

**Data (1):** `useTableState` (search → sort → page plus selection; `manual`
skips the client pipeline).

**Overlay & dismissal (9):** `useDropdown`, `usePopover`, `useTooltips`,
`useToast` (module-scope singleton, paired with `useToastStore` — no pinia),
`useImageBox`, `useSpotlight`, `useSidenav`, `useFocusTrap`, `useClickOutside`.
`useTooltips(root?, { showDelay })` takes an options object: `showDelay`
(ms, default 0) sets the hover dwell before a tooltip appears, overridable
per trigger with `data-tooltip-delay`. It observes the root with a
`MutationObserver`, so triggers added after mount are bound automatically.
`data-tooltip-variant="dock"` opts a trigger into the `.vd-tooltip-dock`
chrome (its own `--vd-tooltip-dock-*` custom properties).

**Motion & scroll (13):** `useAffix`, `useScrollspy`, `useParallax`,
`useWaypoint`, `useLazyLoad`, `useNavbarGlassScroll`, `useDockOrientation`,
`useMorph`, `useMorphBadges`, `useRipple`, `useExpandingCards`, `useTimeline`,
`useLiquidGradient`.

**Layout, navigation & interaction (8):** `useGrid` (+ `setGridSystem` for the
document-level standard/fibonacci mode), `useGlass`, `useTabs`, `useDocSearch`,
`useGlobalSearch`, `useDraggable`, `useFlow`, `useKeyboardNav`.
`useGlobalSearch` is the headless half of `VdGlobalSearch` — it owns the
open/close state, the `⌘K` / `/` shortcut binding, debounced querying through
the injected adapter, and keyboard result navigation.

The `sanitizeHtml` utility is also exported from the package root.

## Theme

The runtime theme layer lives in `useTheme` and drives the same `data-*`
attributes the CSS reads. Exported functions:

- `getThemeDefaults()` / `setThemeDefaults(overrides)` — read/override the
  effective defaults (`setThemeDefaults` is what `app.use(VanduoVue, { themeDefaults })`
  calls).
- `loadPreference()` — read the persisted preference from `localStorage`
  (falls back to defaults on the server).
- `applyPreference(prefs)` — write the six `data-*` attributes onto `<html>`.
- `persistPreference(prefs)` — write the six `localStorage` keys.
- `defaultPreference()` / `defaultPrimary(theme)` — compute the baseline.
- `useThemePreference()` — a **module-scope reactive singleton** (no pinia)
  that is the single source of truth behind both `VdThemeSwitcher` and
  `VdThemeCustomizer`. Returns `{ state, setTheme, setPalette, setPrimary,
  setNeutral, setRadius, setFont, reset }`; every setter routes through
  `applyPreference` + `persistPreference`.

Token data (`DEFAULTS`, `PALETTE_OPTIONS`, `PRIMARY_COLORS`, `NEUTRAL_COLORS`,
`RADIUS_OPTIONS`, `FONT_OPTIONS`, `THEME_MODES`, `tokens`) is re-exported from
the package root — the same surface the old `@vanduo-oss/core` shipped.

**Attribute contract** (set on `<html>`): `data-palette`, `data-primary`,
`data-neutral`, `data-radius`, `data-theme`, `data-font`. The CSS resolves
these into `--vd-*` custom properties (e.g. `--vd-radius-scale`). Omitting
`data-theme` / `data-font` selects the system/default.

**Storage keys** (`localStorage`): under a configurable prefix (default
`vanduo-`) — `vanduo-palette`, `vanduo-primary-color`, `vanduo-neutral-color`,
`vanduo-radius`, `vanduo-theme-preference`, `vanduo-font-preference`. Set via
`app.use(VanduoVue, { storagePrefix })` or `setStoragePrefix` at bootstrap
(before first theme read); no automatic cross-prefix migration.

## SSR

The package is SSR / `vite-ssg`-safe. All browser access is client-guarded with
`typeof window` checks and `onMounted` / `onScopeDispose` lifecycle hooks —
nothing touches `window`, `document`, `localStorage`, or `matchMedia` during
server render. The `useThemePreference` singleton initializes lazily: it seeds
from `defaultPreference()` on the server and only hydrates from storage / syncs
`<html>` on the first client call.
