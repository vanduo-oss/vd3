## 1. CSS shell

- [x] 1.1 Add `css/effects/liquid-gradient.css` with host/canvas/active/fixed/fill classes and `--vd-liquid-*` defaults + MIT header
- [x] 1.2 Import in `css/vd3.css` Layer 5

## 2. Engine + composable

- [x] 2.1 Port Labs WebGL to `src/effects/createLiquidGradient.ts` (theme tokens + CSS-var uniforms + parent-box resize)
- [x] 2.2 Add `src/composables/useLiquidGradient.ts` (scan, active, theme observer, pointer, reduced-motion, cleanup)
- [x] 2.3 Export from `src/index.ts`

## 3. Attribution + changelog

- [x] 3.1 Append CodePen MIT entry to `THIRD-PARTY-LICENSES`
- [x] 3.2 Add CHANGELOG 1.2.2 `### Added` bullet

## 4. Tests

- [x] 4.1 `tests/effects/create-liquid-gradient.spec.ts` — null WebGL, exported API shape
- [x] 4.2 `tests/composables/use-liquid-gradient.spec.ts` — mount/unmount cleanup, no throw without WebGL

## 5. Docs sync (vd3-docs)

- [x] 5.1 Branch `dev-v122`; add `/effects/liquid-gradient` page (demo, API, code, customization, theme, attribution)
- [x] 5.2 Register nav, router, e2e routes

## 6. Verify

- [x] 6.1 `pnpm test` and `pnpm build` in vd3
