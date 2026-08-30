# Oola swatches palette + dock accent — Design

## One component, two variants

The fan could have been a new `VdSwatches` / `VdColorFan` export. It is a
`variant` on `VdThemeCustomizer` instead because the two presentations share
nearly all of their non-visual behavior:

- teleport to `<body>`,
- `useClickOutside([panelOrFan, trigger], close, isOpen)`,
- Escape to close,
- the `vd:open-customizer` window event,
- `defineExpose({ open, close, toggle })`,
- reposition on resize (the fan adds scroll capture),
- writes through the theme layer, never through `document` directly.

Splitting them would duplicate that lifecycle, and a consumer swapping
presentations would have to swap imports and re-wire the trigger. `variant`
keeps `<VdThemeCustomizer />` as the single entry point.

The trigger icon differs by variant (`ph-paint-roller` for panel,
`ph-swatches` for the fan) but the trigger element, its classes, and
`data-theme-customizer-trigger` stay identical so existing CSS and any
`document.querySelector("[data-theme-customizer-trigger]")` keep working.

## Controlled primary

The docs site cannot use the uncontrolled component. `vd3-docs/src/stores/
theme.ts` is a Pinia store built directly on `applyPreference` /
`persistPreference`, and it enforces site locks (`applyDocsLockedPrefs` forces
palette / font / radius / neutral; `coerceDocsPrimary` clamps primary to Ink +
the eight `DOCK_TINTS`). A component that called `useThemePreference()
.setPrimary` would bypass both.

So `primary` is an **optional** prop:

- `primary === undefined` → uncontrolled. Read `prefs.primary` from the
  singleton, write `theme.setPrimary`. Identical to 1.6.0.
- `primary` bound → controlled. Render from the prop, emit `update:primary`,
  and **never** call `theme.setPrimary`. The parent owns persistence.

`update:primary` fires for both preview and commit in controlled mode, because
preview is how the fan shows the hue — a controlled parent that does not want
live preview passes `:preview="false"`. This mirrors how the docs overlay
already drives `theme.setPrimary` on hover.

Preview bookkeeping (snapshot on open, restore on cancel) lives in the
component in both modes. In controlled mode it emits the snapshot value back
on cancel rather than writing the singleton.

## Fan geometry

Ported from the docs overlay rather than reinvented; the math is load-bearing
and already tuned against real dock edges.

Each blade is absolutely positioned at the fan root (which is placed at the
trigger's center in fixed coordinates) and hinged at its own left-center via
CSS `transform-origin`. A blade at index `i` gets
`rotate(angle)  translateX(HINGE_GAP)`, so all blades pivot around one point
like a hand fan. Closed state collapses every blade onto the fan axis at
`scale(0.5)`; the `--i` custom property staggers the transition, reversed on
close so the fan folds from the outside in.

Constants stay as tuned on the docs site: `FAN_SPREAD` 120°, `FAN_SPREAD_MIN`
30°, `HINGE_GAP` 26px, `VIEWPORT_GAP` 12px.

### Viewport fitting

Blades spread along the axis perpendicular to the fan direction (x for
up/down, y for left/right). A blade at offset δ° from the fan axis reaches
`c + sign · L · sin δ` along that axis, where `L` is blade length from the
hinge and `c` is the hinge coordinate. Solving `asin` at both viewport bounds
gives the widest symmetric arc that keeps every blade tip on screen, plus the
base-angle tilt that centers it. `L` is measured from a real `.tc-fan-item`
`offsetWidth` so it tracks CSS, with a 96px fallback for the first paint.

### `direction="auto"`

The docs site knows its dock edge and passes an explicit direction. A generic
consumer does not, so `auto` resolves from the trigger rect: pick the axis
(vertical vs horizontal) with more room, then the side of that axis with more
room. It is recomputed on every reposition, so a fixed trigger that moves
(dock edge change) re-resolves without the parent doing anything.

Explicit directions are the escape hatch and are what docs will pass, mapping
dock placement → fan direction (bottom→up, top→down, left→right, right→left).

## Dock accent tint

`tintMode="accent"` adds `.vd-dock-tint-accent` alongside the existing
`.vd-dock-tint-{hue}`. The accent rule needs to beat the surface rule, which is
`.vd-dock.vd-dock-dark[class*="vd-dock-tint-"]` (0,3,1 — two classes plus an
attribute selector plus the element). Adding `.vd-dock-tint-accent` to the
same shape gives (0,4,1) and wins without `!important` or source-order
fragility:

```css
.vd-dock.vd-dock-dark.vd-dock-tint-accent[class*="vd-dock-tint-"] {
  background: color-mix(in srgb, #0a0a0a 90%, transparent);
  background-image: none;
}
```

`--vd-dock-tint` is deliberately left set by `.vd-dock-tint-{hue}`. That is the
whole point: items, active indicators, and whatever the consumer puts in
`#brand` read the hue while the pill stays ink. It also means `tintMode`
without `tint` is a no-op, which is the correct degenerate behavior.

`tintMode` is validated against `DOCK_TINT_MODES` the same way `glass`,
`radius`, and `tint` already are, so a bad runtime value falls back to
`"surface"` rather than emitting a bogus class.

## Tooltip show delay

`useTooltips(root, { showDelay })` schedules through a single module-scoped
timer that `hide()` clears, so a fast in-and-out never leaves a pending show.
Per-trigger `data-tooltip-delay` overrides the option; a delay of `0` shows
synchronously (important for tests and for reduced-motion consumers).

The `MutationObserver` rescan exists because dock chrome swaps controls between
`#actions` and the item strip at the narrow breakpoint — triggers appear after
mount. A `WeakSet` of already-wired elements keeps rescans idempotent, and
every listener is pushed onto a cleanup array so `onUnmounted` fully detaches.
Guarded with `typeof MutationObserver !== "undefined"` for SSR.

## SSR

No new module-scope browser access. Fan geometry runs in `onMounted` and in
`watch(isOpen)` after `nextTick`; `direction="auto"` resolution touches
`window` only from those paths. The fan pre-fits once on mount so the first
open animates to the correct pose instead of snapping.
