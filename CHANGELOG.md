# Changelog

All notable changes to `@vanduo-oss/vd3` are documented here. This file
tracks the package only — never docs-site content.

## Unreleased

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
