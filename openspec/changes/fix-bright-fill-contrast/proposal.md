# Fix bright-fill contrast

## Why

Filled primary and status surfaces hardcode `--vd-color-white` (or `#fff`).
Open Color mid-tones fail WCAG 4.5:1 against white — yellow, orange, lime,
and also the default indigo rest fill (3.67:1). Docs ships a temporary
contrast guard. The package must own on-fill ink through semantic tokens so
every consumer gets readable filled chrome in light and dark.

## What Changes

- Promote `--vd-text-on-primary`, `--vd-text-on-primary-hover`, and
  `--vd-text-on-status` as the on-fill foreground contract.
- Encode hue/theme overrides from the built-in contrast matrix so each
  shipped fill/foreground pair meets ≥4.5:1 for text and ≥3:1 for glyphs.
- Replace hardcoded white-on-bright paint on known filled families
  (buttons, chips, badges, alerts, toasts, tabs, pagination, FAB, avatars,
  stepper, progress, pickers, suggest, waypoint, spotlight, footer hover,
  table status rows, checkbox glyphs, timeline markers).
- Keep light-mode `.vd-btn-ink:hover` white-on-black. Do not change hover
  fill colors. Do not touch intentional white-on-dark surfaces
  (`.vd-badge-dark`, `.vd-table-dark`, tooltips, image-box chrome).

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `design-tokens`: on-fill semantic foregrounds + hue/theme matrix.
- `css-distribution`: filled components consume those tokens.
- `components`: visual contrast on filled `Vd*` chrome; no new props.

## Semver

**Patch — 1.7.1 → 1.7.2.** Visual accessibility fix. No Vue prop/event/class
additions. Custom `--vd-text-on-primary` overrides continue to win.

## Migration note (`@vanduo-oss/vue` → vd3)

None. Consumers who overrode button color to force white-on-yellow should
drop that override; the package now supplies dark ink.

## Non-goals

- New component APIs, classes, or runtime dependencies.
- Changing hover fill language (`*-dark` / solid primary stays).
- Recoloring outline-rest (hue on surface) except when hover fills solid.
- Publishing to npm from this change (PR + version bump only).
- `vd3-cbun` work.
