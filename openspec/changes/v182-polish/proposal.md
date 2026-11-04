# v1.8.2 component polish

## Why

Docs review before the 1.8.2 release reproduced defects in four components: the
datepicker popup stretched to wide inputs and offset its weekday labels from the
day columns; offcanvas/sidenav body content touched the panel edges; waypoint
link clicks scrolled the whole document instead of the configured container;
and sidenav triggers never exposed their expanded state.

## What changes

- `useDatepicker` stops stretching the popup to the input width; `datepicker.css`
  sizes weekdays and day rows on 7 equal `--vd-dp-cell-size` tracks, adds
  `--vd-dp-popup-min-width`, and tints ranges with `--vd-color-primary-alpha-10`.
- `.vd-sidenav-body` gains horizontal padding; nav items are inset, rounded,
  spaced, and get an icon box and heavier weights.
- `useWaypoint` scrolls the resolved container on click and honours
  `prefers-reduced-motion`; bordered waypoint links follow the global radius.
- `VdSidenav` releases the body scroll lock when unmounted while open;
  `useSidenav` triggers get `aria-controls` and a synced `aria-expanded`.
- Adds `mise.toml` pinning Node 24 for local tooling (`.nvmrc` already pins 24).

Semver: patch. Public imports, props, and class names are unchanged; the
sidenav link restyle and body padding are visual.

## Non-goals

No focus trap for `useSidenav` drawers (use `VdOffcanvas`), no timepicker popup
sizing change, no new dependencies, no publish or remote actions.
