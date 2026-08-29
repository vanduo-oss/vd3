## Context

vd3 already ships `.vd-glass*` utilities, component glass modifiers, and
`useGlass` / `useNavbarGlassScroll`. Spacing and radius use Fibonacci; glass
blur steps do not. A design research brief (“Seemore Glass”) specifies a
Fibonacci strength table and four first-class primitives (blur, tint, edge,
elevation), extended through marketing steps 34 / 55 / 89.

## Goals / Non-Goals

**Goals**

- Single ordered Fibonacci index drives blur + tint + border (+ related
  saturate/grain/shadow) as one coherent material thickness.
- Surfaces (mesh, stripe, noise, aurora, dots, grid) as reusable CSS classes.
- Accessibility and performance guardrails baked into the shared glass rules.
- Backward-compatible size aliases.

**Non-Goals**

- Vue SFCs; true refractive Liquid Glass; audit lint CLI.

## Decisions

1. **Canonical classes:** `.vd-glass-1` … `.vd-glass-89` (fib indices only;
   stop at 89 — next fib 144 exceeds the ~100 marketing ceiling).
2. **Default:** `.vd-glass` / `.vd-glass-md` ≡ step 5 (8px / 0.20 tint / 0.24 border).
3. **Aliases:** `sm→3`, `lg→8`, `xl→13` via shared custom-property bundles.
4. **Navbar scrolled:** `--vd-glass-blur` and related vars set to step-21 values
   (20px GPU soft-cap), not 80px. Extended steps 34/55/89 escalate tint/edge
   more than blur.
4b. **Navbar float:** opt-in `.vd-navbar-float` / `VdNavbar` `float` insets
   fixed/sticky top bars with responsive Fibonacci spacing and capsule radius;
   glass uses CodePen-inspired specular inset + soft elevation (no SVG
   displacement — performance). Scrolled frost is a translucent white wash in
   light and dark (dark keeps fill near-transparent to avoid grey fog); float
   padding optically centers brand/content inside the capsule.
5. **Scroll activation:** transition background, border-color, box-shadow, and
   overlay opacity only — never `backdrop-filter`.
6. **Surfaces:** CSS-only decorative fills; intensity via `.vd-surface-3|5|8`
   adjusting pattern layer opacity/contrast.
7. **Adaptive:** `.vd-glass-adaptive` remaps tint toward theme primary / light-dark
   neutrals without changing the fib step.

## Risks / Trade-offs

- Base glass look changes (12px → 8px default blur). Acceptable for minor
  “Seemore” material refresh; documented in CHANGELOG.
- Docs shell dogfoods package `.vd-navbar-float` + `.vd-navbar-glass` without
  duplicating frost/float CSS; docs keep only brand typography / chrome actions.

## Migration Plan

Opt-in fib classes for new UIs; existing `.vd-glass` / sm/lg/xl keep working.
Component modifiers inherit the new token defaults automatically.
