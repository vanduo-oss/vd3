# @vanduo-oss/vd3

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

> Vanduo UI for Vue 3 — design system and component library (the vd3 line).

The Vue3-only line of the [Vanduo](https://vanduo.dev) design system. Unlike
the previous three-package split (core tokens + framework CSS/JS + vue
components), vd3 is fully standalone: one package will ship its own DTCG
design tokens, CSS tree, and typed `Vd*` components/composables. Sole peer
dependency: `vue >=3.3` — no pinia.

**STATUS: pre-release — not yet published to npm.** The scaffold and the
token/CSS foundation are in place; the component carryover lands next.

## Planned exports

| Export                       | Contents                                          |
| ---------------------------- | ------------------------------------------------- |
| `@vanduo-oss/vd3`            | Components, composables, theme API, token data    |
| `@vanduo-oss/vd3/css`        | Full stylesheet (`dist/vd3.min.css`)              |
| `@vanduo-oss/vd3/css/core`   | Tokens-only stylesheet (`dist/vd3-core.min.css`)  |
| `@vanduo-oss/vd3/tokens.json`| Resolved DTCG token data (`dist/tokens.json`)     |

## Build pipeline

`pnpm build` runs the full chain, in order:

1. `scripts/clean-dist.mjs` — resets `dist/` (the only step that cleans;
   vite runs with `emptyOutDir: false`).
2. `scripts/build-tokens.mjs` — DTCG tokens (`tokens/`) → generated color
   partials (`css/core/generated/`, gitignored) + `dist/tokens.{js,d.ts,json}`.
   Zero-dependency and deterministic.
3. `scripts/build-css.mjs` — bundles `css/vd3.css` with lightningcss into
   `dist/vd3(.min).css` and the no-icons `dist/vd3-core(.min).css` (+ source
   maps), and copies `fonts/` and the Phosphor regular + fill icon weights
   into `dist/`.
4. `vite build` — the library JS (`dist/index.{js,cjs}`).
5. `vue-tsc -p tsconfig.build.json` — the `.d.ts` declarations.

`pnpm build:tokens` / `pnpm build:css` run steps 2–3 standalone;
`pnpm gen:fib` regenerates `tokens/primitive/color.fib.tokens.json`.

## Development

```sh
pnpm install
pnpm lint          # eslint
pnpm format:check  # prettier (src, tests, scripts)
pnpm stylelint     # authored css tree (generated partials excluded)
pnpm typecheck     # vue-tsc --noEmit
pnpm test          # vitest (jsdom) — token/DTCG/palette contracts + smoke
pnpm build         # full chain (see Build pipeline)
```

Requires Node >= 24 and pnpm >= 10 (`packageManager: pnpm@10.28.2`).

## Documentation

- Agent / LLM reference — [SKILL.md](./SKILL.md)
- Changelog — [CHANGELOG.md](./CHANGELOG.md)

## License

[MIT](./LICENSE) © Vanduo
