---
name: vanduo-vd3
description: Use when building Vue 3 interfaces with @vanduo-oss/vd3 components, composables, and theme tokens or answering package API questions.
---

# Vanduo Vue 3

Install `@vanduo-oss/vd3` alongside Vue. Import components by name. Use `app.use(VanduoVue, options)` to set theme defaults or storage keys.
The plugin does not register components; keep named imports in each component.

Import **one** base stylesheet once in the app entry:

```ts
import '@vanduo-oss/vd3/css';
```

Use `@vanduo-oss/vd3/css/core` instead when bundled icon fonts are unnecessary.
It includes component styles; it is not tokens-only. Import resolved token data
from `@vanduo-oss/vd3/tokens.json` when tooling needs JSON.

## Tasks

- [Modal and toast](recipes/modal-toast.vue): complete component with local
  `v-model:open` state, a Save action, and a toast container. Mount one toast
  container per app. Verify Save closes the dialog, announces success, and
  returns focus to the trigger.
- [Tooltip](recipes/tooltip.vue): one focusable child, tooltip text, placement,
  and a click event. Verify pointer hover and keyboard focus show the tooltip;
  Escape closes it without moving focus.

Copy the relevant recipe into the app; preserve the app's existing CSS and
initialization choices. Compose existing components before adding custom DOM
behavior. Confirm props/events in [public declarations](dist/index.d.ts) (built by `pnpm build` in a source clone); do not infer a component API from a CSS demo.

## State and server rendering

Theme preferences and the toast queue currently live at module scope. Multiple
Vue apps using the same module instance share them. A storage prefix changes
browser keys, not state ownership. Do not enqueue personalized toasts or change
per-user theme state during server rendering. Static SSR shells are supported;
personalized multi-app/request isolation requires an app-owned state boundary.

Keep browser behavior in mounted components. Use sanitized text for untrusted
content; enabling `allowStyle` in `sanitizeHtml` is for trusted input only.

Run the consumer build and test the actual interaction with the chosen light and
dark theme. Package declarations establish the API; a passing build does not
establish contrast, focus behavior, or screen-reader usability.

## API inventory

Components are named imports; the plugin does not register them. See the
[component guides](https://vd3.vanduo.dev/) and declarations for props and slots.

**Layout primitives:** `VdBox`, `VdCenter`, `VdCover`, `VdFrame`, `VdInline`, `VdStack`, `VdSwitcher`.

**Components A–F:** `VdAccordion`, `VdAlert`, `VdAuthCard`, `VdAvatar`, `VdBadge`, `VdBreadcrumb`, `VdButton`, `VdButtonGroup`, `VdCard`, `VdCheckbox`, `VdCheckboxGroup`, `VdChip`, `VdCodeSnippet`, `VdCollection`, `VdCustomSelect`, `VdDataTable`, `VdDocSearch`, `VdDock`, `VdDockItem`, `VdEmptyState`, `VdFab`, `VdFlow`, `VdFooter`, `VdForgotPassword`.

**Components G–P:** `VdGlobalSearch`, `VdIcon`, `VdInput`, `VdLogin`, `VdMenu`, `VdModal`, `VdNavbar`, `VdOffcanvas`, `VdOtpInput`, `VdPagination`, `VdPreloader`, `VdProgress`.

**Components R–T:** `VdRadioGroup`, `VdRating`, `VdSelect`, `VdSeparator`, `VdSidenav`, `VdSignUp`, `VdSkeleton`, `VdSlider`, `VdSpinner`, `VdSwitch`, `VdTable`, `VdTabs`, `VdThemeCustomizer`, `VdThemeSwitcher`, `VdToast`, `VdToastContainer`, `VdTooltip`, `VdTransfer`, `VdTree`, `VdTreeNode`.

**39 composable modules** (module names, not a claim that each exports a same-named function):

`useAffix.ts`, `useClickOutside.ts`, `useDatepicker.ts`, `useDocSearch.ts`, `useGlobalSearch.ts`, `useDockOrientation.ts`, `useDraggable.ts`, `useDropdown.ts`, `useExpandingCards.ts`, `useFlow.ts`, `useFocusTrap.ts`, `useGlass.ts`, `useGrid.ts`, `useImageBox.ts`, `useKeyboardNav.ts`, `useLazyLoad.ts`, `useLiquidGradient.ts`, `useMorph.ts`, `useMorphBadges.ts`, `useNavbarGlassScroll.ts`, `useParallax.ts`, `usePopover.ts`, `useRipple.ts`, `useScrollspy.ts`, `useSearch.ts`, `useSidenav.ts`, `useSpotlight.ts`, `useStepper.ts`, `useSuggest.ts`, `useTableState.ts`, `useTabs.ts`, `useTheme.ts`, `useThemeBridge.ts`, `useTimeline.ts`, `useTimepicker.ts`, `useToast.ts`, `useTooltips.ts`, `useValidate.ts`, `useWaypoint.ts`.

**Theme functions:** `useThemePreference()`, `useThemeBridge()`, `setThemeDefaults`,
`getThemeDefaults`, `setStoragePrefix`, `getStoragePrefix`, `loadPreference`,
`applyPreference`, `persistPreference`. The module named useTheme does not export a same-named callable.

Theme attributes on `<html>` are `data-palette`, `data-primary`, `data-neutral`,
`data-radius`, `data-theme`, and `data-font`. They resolve to `--vd-*` properties.
Storage keys default to the `vanduo-` prefix; preferences include palette,
primary-color, neutral-color, radius, theme-preference and font-preference.
Filled surfaces use `--vd-text-on-primary`, `--vd-text-on-primary-hover`, and
`--vd-text-on-status`. Preserve these when customizing bright fills.

**Optional export:** `@vanduo-oss/vd3/highlight` provides `highlightCode` and `highlight`.
Both emit escaped token markup for `VdCodeSnippet`; without a highlighter it renders text.
