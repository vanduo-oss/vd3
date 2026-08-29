## 1. OpenSpec

- [x] 1.1 Author proposal/design/tasks + css-distribution and composables deltas
- [x] 1.2 `openspec validate seemore-glass-surfaces --strict`

## 2. Seemore Glass CSS

- [x] 2.1 Update `css/core/tokens.css` glass defaults to fib step 5 + step table vars
- [x] 2.2 Rewrite `css/effects/glass.css` with `.vd-glass-{1,2,3,5,8,13,21,34,55,89}`,
      aliases, adaptive, a11y/perf hardening, scroll proxy transitions
- [x] 2.3 Retarget `.vd-navbar-glass.vd-navbar-scrolled` to step-21 soft-cap
- [x] 2.4 Extend fib series through 34/55/89 (modest blur, stronger tint/edge)
- [x] 2.5 Opt-in `.vd-navbar-float` + CodePen-inspired specular glass chrome

## 3. Surfaces CSS

- [x] 3.1 Add `css/effects/surfaces.css` (base + 6 variants + intensity 3/5/8)
- [x] 3.2 Import in `css/vd3.css` Layer 5

## 4. Version + changelog

- [x] 4.1 Bump `package.json` and `VD3_VERSION` to `1.3.0`
- [x] 4.2 CHANGELOG 1.3.0 Added section

## 5. Tests

- [x] 5.1 Assert fib glass + surface tokens/classes in generated CSS / sync tests
- [x] 5.2 Extend use-glass / navbar glass specs if scroll transition behavior changes
- [x] 5.3 `pnpm test`, `pnpm build`, `pnpm check:classes`
