---
name: vanduo-vd3
description: Use when building UIs with @vanduo-oss/vd3 — the standalone Vue 3 design system line of Vanduo (52 Vd* components, ~35 composables, a runtime theme layer, and its own DTCG tokens + CSS). Covers install, the VanduoVue plugin, the component/composable inventory, the data-*/--vd-*/vanduo-* theming contract, and SSR safety.
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

`app.use(VanduoVue)` takes an optional `{ themeDefaults }` to override the
generic baseline before the theme model first reads it:

```ts
app.use(VanduoVue, { themeDefaults: { PRIMARY_DARK: "blue" } });
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

| Import                          | Contents                                   |
| ------------------------------- | ------------------------------------------ |
| `@vanduo-oss/vd3/css`           | Full stylesheet — tokens + components + icons |
| `@vanduo-oss/vd3/css/core`      | Tokens-only stylesheet (no icon fonts)     |
| `@vanduo-oss/vd3/tokens.json`   | Resolved DTCG token data (JSON)            |

## Components (52)

45 `Vd*` components plus 7 layout primitives. All are named exports from the
package root and register nothing globally — import only what you render.

**Form & input (11):** `VdButton`, `VdButtonGroup`, `VdInput`, `VdSelect`,
`VdCustomSelect`, `VdCheckboxGroup`, `VdRadioGroup`, `VdSwitch`, `VdSlider`,
`VdRating`, `VdTransfer`

**Data display (8):** `VdTable`, `VdTree`, `VdTreeNode`, `VdCollection`,
`VdCard`, `VdBadge`, `VdChip`, `VdAvatar`

**Feedback & status (9):** `VdAlert`, `VdModal`, `VdOffcanvas`, `VdToast`,
`VdToastContainer`, `VdProgress`, `VdSpinner`, `VdPreloader`, `VdSkeleton`

**Navigation (8):** `VdNavbar`, `VdSidenav`, `VdMenu`, `VdTabs`, `VdBreadcrumb`,
`VdPagination`, `VdFooter`, `VdFab`

**Content & utility (7):** `VdAccordion`, `VdCodeSnippet`, `VdIcon`,
`VdSeparator`, `VdTooltip`, `VdDocSearch`, `VdFlow`

**Theme controls (2):** `VdThemeSwitcher`, `VdThemeCustomizer`

**Layout primitives (7):** `VdBox`, `VdCenter`, `VdCover`, `VdFrame`,
`VdInline`, `VdStack`, `VdSwitcher`

Two component types are also re-exported: `BreadcrumbItem` (from `VdBreadcrumb`)
and `TreeNode` (from `VdTreeNode`). The shared `StatusVariant` type is exported
for prop typing.

## Composables (~35)

Named exports from the package root. Each keeps the `useX(root?)` shape from the
old `@vanduo-oss/vue` surface, rewritten as pure Vue (no DOM-scan runtime).

**Theme (2):** `useTheme` (the theme layer — see below — plus the
`useThemePreference` reactive singleton) and `useThemeBridge` (mirror an
external `Ref<ThemeMode>` onto the `data-theme` attribute).

**Form & validation (6):** `useDatepicker`, `useTimepicker`, `useStepper`,
`useSuggest`, `useSearch`, `useValidate`.

**Overlay & dismissal (9):** `useDropdown`, `usePopover`, `useTooltips`,
`useToast` (module-scope singleton, paired with `useToastStore` — no pinia),
`useImageBox`, `useSpotlight`, `useSidenav`, `useFocusTrap`, `useClickOutside`.

**Motion & scroll (11):** `useAffix`, `useScrollspy`, `useParallax`,
`useWaypoint`, `useLazyLoad`, `useNavbarGlassScroll`, `useMorph`,
`useMorphBadges`, `useRipple`, `useExpandingCards`, `useTimeline`.

**Layout, navigation & interaction (7):** `useGrid` (+ `setGridSystem` for the
document-level standard/fibonacci mode), `useGlass`, `useTabs`, `useDocSearch`,
`useDraggable`, `useFlow`, `useKeyboardNav`.

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

**Storage keys** (`localStorage`): `vanduo-palette`, `vanduo-primary-color`,
`vanduo-neutral-color`, `vanduo-radius`, `vanduo-theme-preference`,
`vanduo-font-preference`.

## SSR

The package is SSR / `vite-ssg`-safe. All browser access is client-guarded with
`typeof window` checks and `onMounted` / `onScopeDispose` lifecycle hooks —
nothing touches `window`, `document`, `localStorage`, or `matchMedia` during
server render. The `useThemePreference` singleton initializes lazily: it seeds
from `defaultPreference()` on the server and only hydrates from storage / syncs
`<html>` on the first client call.
