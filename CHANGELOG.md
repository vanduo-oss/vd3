# Changelog

All notable changes to `@vanduo-oss/vd3` are documented here. This file
tracks the package only — never docs-site content.

## Unreleased

- Vue surface carryover (`vd3-carryover`): the pure-Vue surface of the old
  `@vanduo-oss/vue` package lands 1:1 — 37 SFC components (all except
  `VdMenu`, deferred to `vd3-rewrites` with the 12 delegating/DOM-scan
  composables), the 7 layout primitives, 19 composables (incl. the theme
  layer and `useToast`), `sanitizeHtml`, the `StatusVariant`/`TreeNode`
  types, and the `VanduoVue` plugin. Token data now ships inlined in the lib
  bundle via a generated `src/theme/generated/tokens.data.ts` (same export
  surface as the old `@vanduo-oss/core`: `DEFAULTS`, `PALETTE_OPTIONS`,
  `PRIMARY_COLORS`, `NEUTRAL_COLORS`, `RADIUS_OPTIONS`, `FONT_OPTIONS`,
  `THEME_MODES`, `tokens` + types, re-exported from the package root);
  `dist/tokens.js` + `dist/tokens.d.ts` are **dropped** (`./tokens.json`
  stays). **BREAKING** vs old `@vanduo-oss/vue`: `loadVanduoRuntime` is
  removed (no IIFE runtime, no `window.Vanduo*`), and `useToast` is a
  pinia-free module singleton — identical documented API (`useToastStore`,
  `useToast`, flexible `show()`, typed helpers, reactive `queue`) but the
  pinia meta-API (`$patch`/`$subscribe`/devtools) is gone and pinia is no
  longer a peer. New `check:classes` gate proves every rendered `vd-*`
  class has a selector in `dist/vd3.min.css`.
- Token + CSS foundation (`vd3-token-css-foundation`): vd3 becomes fully
  standalone. DTCG token sources absorbed from the old core repo
  (`tokens/`) with a zero-dependency generator emitting the generated color
  partials (`css/core/generated/`), the typed token-data module
  (`dist/tokens.{js,d.ts}` — same export surface as `@vanduo-oss/core`) and
  `dist/tokens.json`; authored CSS tree absorbed from the old framework
  repo (`css/`, entry `vd3.css`) bundled via lightningcss into
  `dist/vd3(.min).css` and the no-icons `dist/vd3-core(.min).css`; fonts
  and Phosphor icons (regular + fill only) ship in `dist/`. The `./css`,
  `./css/core` and `./tokens.json` exports now resolve.
- Repo scaffold (`init-vd3-scaffold`): package metadata and exports map,
  hardened `.npmrc`, TypeScript/ESLint/Prettier/Stylelint/Vitest tooling,
  SHA-pinned CI workflow, MIT license, stub `src/index.ts` exporting
  `VD3_VERSION`, and a smoke spec. No tokens, CSS, or components yet.
