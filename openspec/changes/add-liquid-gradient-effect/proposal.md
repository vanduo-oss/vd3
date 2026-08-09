## Why

Labs already ships a theme-bound vanilla WebGL liquid gradient (inspired by
Cameron Knight’s public MIT CodePen) on its home page. Promoting that effect
into `@vanduo-oss/vd3` Effects gives every consumer the same interactive
atmosphere with primary/neutral/light-dark awareness, documented
customization tokens, and an official docs page — without a Three.js
dependency.

## What Changes

- Add Layer 5 CSS shell `.vd-liquid-gradient*` plus `--vd-liquid-*`
  customization tokens.
- Export `createLiquidGradient` (vanilla WebGL factory) and
  `useLiquidGradient` (DOM-scanning Vue composable).
- Record MIT CodePen attribution in file headers and
  `THIRD-PARTY-LICENSES`.
- Document under CHANGELOG 1.2.2 Added; sync vd3-docs Effects page.

## Capabilities

### New Capabilities

- _None._ (extends existing effect/composable surfaces)

### Modified Capabilities

- `composables`: add `useLiquidGradient` (+ factory export) with
  SSR-safe lifecycle, theme sync, reduced-motion, and teardown requirements.
- `css-distribution`: add liquid-gradient effect CSS to Layer 5 and document
  the `--vd-liquid-*` token surface.

## Semver

**Patch line additive API on 1.2.2.** New classes, tokens, and named exports
only — no breaking changes. Consumers on `^1.2.1` who upgrade get an opt-in
effect; existing APIs unchanged.

## Migration note (`@vanduo-oss/vue` → vd3)

None. New surface only.

## Non-goals

- **No `VdLiquidGradient` SFC** — Effects stay class + composable.
- **No Three.js** dependency.
- **No Labs rewire** in this change (Labs keeps its local copy until
  published vd3 is consumed).
- **No new runtime npm dependencies.**

## Impact

- `css/effects/liquid-gradient.css`, `css/vd3.css` Layer 5 import.
- `src/effects/createLiquidGradient.ts`,
  `src/composables/useLiquidGradient.ts`, `src/index.ts`.
- Tests under `tests/effects/` and `tests/composables/`.
- `THIRD-PARTY-LICENSES`, `CHANGELOG.md`.
- **Docs sync (downstream):** vd3-docs `/effects/liquid-gradient`.
