## Why

Glass effects in vd3 use ad-hoc blur sizes (`sm`/`md`/`lg`/`xl` plus an 80px
navbar override) that do not follow the kit’s Fibonacci / golden-ratio
convention. Docs-only mesh/stripe/noise demo stages are not reusable by
consumers. Seemore Glass upgrades frosting into a coherent Fibonacci
strength-step material system and promotes decorative Surfaces into Layer 5
so glass demos and product pages share the same backdrops.

## What Changes

- Redesign `css/effects/glass.css` around Fibonacci steps
  `.vd-glass-{1,2,3,5,8,13,21}` bundling blur, tint, border, saturate, grain,
  and elevation; base `.vd-glass` / `.vd-glass-md` map to step 5.
- Keep `.vd-glass-sm|lg|xl` as aliases (3/8/13); document as
  deprecated-but-supported.
- Harden a11y (`prefers-reduced-transparency` / `prefers-contrast` /
  `prefers-reduced-motion`), `@supports` fallback, GPU compositing hint;
  stop animating `backdrop-filter` on scroll-activated glass.
- Add `.vd-glass-adaptive` theme-aware tint modifier.
- Clamp navbar scrolled frost to the step-21 ceiling (no 80px).
- Add Layer 5 `css/effects/surfaces.css` with `.vd-surface` + mesh / stripe /
  noise / aurora / dots / grid and fib intensity modifiers 3/5/8.
- Bump package to **1.3.0**; CHANGELOG Added.

## Capabilities

### New Capabilities

- _None._ (extends existing effect / CSS distribution surfaces)

### Modified Capabilities

- `css-distribution`: Seemore Glass Fibonacci steps + Surfaces Layer 5.
- `composables`: scroll-activated glass MUST NOT transition `backdrop-filter`
  (proxy opacity/background/border only).

## Semver

**Minor 1.3.0.** Additive classes and tokens; legacy size modifiers kept as
aliases. Visual defaults for base glass shift toward step 5 (8px blur) —
intentional material refresh, not a removed API.

## Non-goals

- No `VdGlass` / `VdSurface` SFCs — Effects stay class + token.
- No WebGL / Liquid Glass refraction.
- No glassmorphism lint CLI in this release.
- No npm publish / PR until local gates pass and maintainers approve.

## Impact

- `css/core/tokens.css`, `css/effects/glass.css`, new
  `css/effects/surfaces.css`, `css/vd3.css` Layer 5, `css/components/navbar.css`.
- Tests: generated CSS / tokens sync / useGlass scroll behavior.
- Downstream: vd3-docs Seemore Glass + Surfaces pages (separate change).
