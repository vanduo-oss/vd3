# Oola Dock — design

## Instance-scoped morph

oolasite keeps orientation refs at module scope. That cannot host eight
tinted docks on the docs home page. `useDockOrientation` creates refs inside
the composable. Two mounts MUST NOT share state.

Two-phase morph (same timings as oolasite): rest → square (480ms) → target
rest (720ms). Easing `cubic-bezier(0.16, 1, 0.3, 1)`. Ignore `playTo` while
morphing. Narrow viewports (`max-width: 520px`) force horizontal and disable
toggle. `prefers-reduced-motion` snaps.

Persist is opt-in. Default off. When on, the key is
`getStoragePrefix() + "dock-orient"` (or `storageKey`). Never hardcode
`oola-bw-dock-orient`.

## Contained vs fixed

`position="fixed"` is viewport chrome (oolasite). `position="contained"` is
`absolute` inside a `relative` parent so docs demos and the home fan do not
overlay the docs navbar. Geometry is the same; the containing block changes.

The dock does not pad the page. Consumers offset main from `--vd-dock-height`
and `--vd-dock-inset`.

## Brand is the morph-origin corner

`#brand` sits at the morph origin: left of a bottom pill / bottom of a left
rail; right of a top pill / top of a right rail. `placement` (default
`bottom`) selects the edge. Morph pairs are `bottom` ↔ `left` and `top` ↔
`right`. The package does not bake ū or “oola” lettering.

## Dock radius is not theme radius

`RadiusOption` / `data-radius` / `--vd-radius-scale` stop at 0.5rem. The fat
pill needs more. `--vd-dock-radius` defaults to 1.25rem and MUST NOT read
`--vd-radius-scale`. Allowed steps: `0.5`, `0.75`, `1`, `1.25`, `1.5`, `2`,
`9999` (full pill).

## Glass and tint

Default material is Seemore step 34 + contrast, always-dark near-black frost
(kill the navbar/glass `::before` wash). `glass` swaps the Fibonacci step.
`tint` washes an Open Color hue onto that frost. `dark=false` follows the
page theme.

## Constraints honoured

Pure Vue, SSR-safe (no `window` at setup), zero new runtime deps. Class
coverage must resolve every new `vd-dock*` class. 100% v8 on the new files.
