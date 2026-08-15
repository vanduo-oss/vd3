# Add Oola Dock (`VdDock`)

## Why

vd3 has a top `VdNavbar` but no bottom / side morphing dock. The oolasite
chrome (fat Seemore glass pill, horizontal ↔ vertical via a square waypoint)
is site-only, untested, and a module-level singleton. Apps that want that
chrome have nothing to import.

## What Changes

- New `useDockOrientation`: instance-scoped morph state machine (480ms shrink
  to square, 720ms grow to the target rest).
- New `VdDock`: slot-driven glass dock (`#brand`, default items, `#actions`)
  with `v-model:orientation`, `v-model:placement` (bottom | top | left | right,
  default bottom), `position` fixed/contained, Seemore `glass`,
  dock-own `radius` (past the theme 0.5rem cap), Open Color `tint`, and
  `itemLayout`.
- New `VdDockItem`: icon-above-label (or inline) item.
- New `css/components/dock.css` (Layer 4).

## Capabilities

### New Capabilities

- `oola-dock`: morphing glass dock chrome productized from oolasite.

### Modified Capabilities

- `components`: export `VdDock` and `VdDockItem`.
- `composables`: export `useDockOrientation`.

## Semver

**Minor — additive.** `1.4.0 → 1.5.0`. `VdNavbar` is unchanged.

## Migration note (`@vanduo-oss/vue` → vd3)

None. No vd2 dock equivalent.

## Non-goals

- Fan-out / stack scrollytelling (docs-home only).
- A package `VdDockScene` / `useDockFan` / `VdDockCustomizer`.
- Migrating oolasite onto `VdDock`.
- Vendoring the oola icon catalog; ū is a docs-local brand slot.
- Raising the global theme `RadiusOption` max above 0.5.
- Hamburger / collapse (stays `VdNavbar`).
- Git push, PR, or npm publish in this change.
