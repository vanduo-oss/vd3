# Oola swatches palette + dock accent tint

## Why

The vd3-docs site built two things on top of the published dock that every
consumer wants and nobody can import:

1. A **hinged swatches fan** for picking the primary color — blades hinged at
   the trigger, fanning off whichever dock edge the chrome sits on, with
   hover-preview and restore-on-cancel. It lives in
   `vd3-docs/src/overlays/VdThemeCustomizer.vue` (~250 lines) plus ~140 lines
   of fan CSS in `vd3-docs/src/styles/docs.css` (3491–3630). It is site-only,
   duplicates the package customizer's overlay lifecycle, and cannot be reused.
2. An **ink-frost dock with an accent-only tint**. `VdDock`'s `tint` prop
   paints the surface (`color-mix(in srgb, var(--vd-dock-tint) 38%, #0a0a0a)`),
   but chrome that sits over light page content wants a constant ink pill with
   the theme hue applied only to icons and the `#brand` mark. Docs achieves
   this today by dropping `:tint`, hand-setting `--vd-dock-tint` through
   `:style`, and shipping a `!`-free but load-bearing background override in
   `docs.css` (~3155). Every consumer would have to re-derive that override.

Separately, `useTooltips` grew a show delay in the working tree because dock
icon-only chrome flashes labels on hover. vd3-docs currently forks the whole
composable (`useDocsDockTooltips.ts`) to get it, and the dock tooltip variant
(`.vd-tooltip-dock`) is likewise site-local CSS.

Note this reverses a non-goal recorded in the docs change `docs-oola-chrome`
("Changing package `PRIMARY_COLORS` or the framework `VdThemeCustomizer` for
all consumers"). That decision was right while the fan was an experiment; the
fan has now shipped on the docs site and is stable enough to graduate.

## What Changes

- `VdThemeCustomizer` gains `variant`: `"panel"` (today's slide-in panel,
  unchanged default) or `"swatches"` (the hinged fan). Swatches mode adds
  `swatches` (restrict the offered `PRIMARY_COLORS` keys), `direction`
  (`auto` | `up` | `down` | `left` | `right`), and `preview` (hover-preview
  with restore on cancel).
- `VdThemeCustomizer` gains an optional **controlled mode**: bind `primary`
  and listen to `update:primary` to keep an app-side store as the source of
  truth. Unbound, the component keeps writing the `useThemePreference()`
  singleton exactly as it does today.
- `VdDock` gains `tintMode`: `"surface"` (today's tinted glass, unchanged
  default) or `"accent"` (constant ink pill; `--vd-dock-tint` still set so
  items and `#brand` can consume the hue).
- `useTooltips(root, options)` accepts `showDelay`, honors a per-trigger
  `data-tooltip-delay`, and rescans via `MutationObserver` so triggers added
  after mount get wired.
- New CSS: `.vd-theme-customizer-fan` / `.tc-fan-*` in
  `css/components/theme-customizer.css`, `.vd-dock-tint-accent` in
  `css/components/dock.css`, `.vd-tooltip-dock` in
  `css/components/tooltips.css`.

## Capabilities

### New Capabilities

- _None._ The fan is a variant of an existing component, not a new capability.

### Modified Capabilities

- `components`: `VdThemeCustomizer` swatches variant + controlled primary;
  `VdDock` accent tint mode.
- `composables`: `useTooltips` show delay, per-trigger delay, dynamic rescan.
- `css-distribution`: fan, dock accent, and dock tooltip variant classes.

## Semver

**Minor — additive.** `1.6.0 → 1.7.0`. Every new prop defaults to the 1.6.0
behavior: `variant="panel"`, `tintMode="surface"`, `showDelay` absent (show
immediately), `primary` unbound (singleton writes). No existing class changes
meaning; `.vd-dock-tint-{hue}` still sets `--vd-dock-tint` and still paints the
surface unless `.vd-dock-tint-accent` is also present.

The working tree had already bumped `package.json` to `1.6.1` for the tooltip
delay alone. That is folded into `1.7.0` rather than released separately.

## Migration note (`@vanduo-oss/vue` → vd3)

None. vd2 had no dock, and its `VdThemeCustomizer` had no variants — the vd2
docs site hid the palette section rather than offering a second presentation.

## Non-goals

- Changing the default `PRIMARY_COLORS` set (18 hues) or `DOCK_TINTS` (8).
- Restyling or relaying out the `panel` variant.
- Promoting the docs-site brand-spin ramp (`useSiteDockBrandSpin` /
  `siteDockBrandSpin`) — phase-preserving `@property` animation stays
  docs-local for now.
- A headless `useSwatchFan` composable; the geometry stays inside the
  component until a second consumer needs it.
- Neutral / radius / font / palette editing from the swatches variant. It
  owns primary only.
- Git push, PR, or npm publish in this change. More component work is landing
  before `1.7.0` releases, so the changelog entry stays undated.
