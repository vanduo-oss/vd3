## Context

Labs’ `createVdlHomeAtmosphere` is a vanilla WebGL reimplementation of
Cameron Knight’s public MIT CodePen “Interactive Liquid Gradient using
Three.js”. It already binds to vd3 theme tokens. vd3 Effects today are
CSS + `useX(root)` composables (Glass, Morph, Parallax). This effect adds a
pure factory plus a matching composable.

## Goals / Non-Goals

**Goals**

- Ship `.vd-liquid-gradient` markup + `useLiquidGradient(root)` +
  `createLiquidGradient(canvas, opts)`.
- Theme awareness: primary RGB, neutrals, `--vd-bg-primary`, `data-theme`.
- Customization via `--vd-liquid-*` CSS variables (defaults match Labs).
- Reduced-motion: static frame, no pointer distortion.
- MIT attribution in source + `THIRD-PARTY-LICENSES`.

**Non-Goals**

- `Vd*` component wrapper; Three.js; Labs homepage rewire.

## Decisions

1. **Naming:** Liquid Gradient / `liquid-gradient` / `useLiquidGradient` /
   `createLiquidGradient` (matches CodePen title; short Effects nav label).
2. **Split factory vs composable:** factory is framework-agnostic WebGL;
   composable owns Vue lifecycle, theme MutationObserver, pointer, resize,
   active/inactive, cleanup.
3. **Customization:** uniforms read from computed `--vd-liquid-*` on the
   host (or documentElement) during theme sync / draw — not hardcoded.
4. **Sizing:** resize to the canvas’s **parent client box** (not always
   `window`), so contained demos work; full-viewport via CSS
   `.vd-liquid-gradient-fixed { position: fixed; inset: 0; }`.
5. **Active state:** host with `.vd-liquid-gradient-active` or
   `data-vd-liquid-active` (truthy) runs the engine; otherwise stopped.
6. **WebGL failure:** factory returns `null`; composable no-ops without
   throwing.
7. **Pointer coords:** normalize against the canvas bounding rect (not
   only window) so contained demos distort correctly.

## Risks / Trade-offs

- jsdom cannot run real WebGL — tests mock `getContext` / assert graceful
  null and composable cleanup.
- Continuous rAF cost — mitigate with `powerPreference: 'low-power'`, max
  DPR 1.5, pause when `document.hidden`, stop when inactive.

## Migration Plan

Opt-in only. Docs page demonstrates markup + wiring. Labs continues on
local copy until a later consume-from-vd3 change.
