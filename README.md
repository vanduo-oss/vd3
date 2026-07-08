# @vanduo-oss/vd3

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

> Vanduo UI for Vue 3 — design system and component library (the vd3 line).

The Vue3-only line of the [Vanduo](https://vanduo.dev) design system. Unlike
the previous three-package split (core tokens + framework CSS/JS + vue
components), vd3 is fully standalone: one package will ship its own DTCG
design tokens, CSS tree, and typed `Vd*` components/composables. Sole peer
dependency: `vue >=3.3` — no pinia.

**STATUS: pre-release — not yet published to npm.** The scaffold is in place;
tokens/CSS and the component carryover land in upcoming changes.

## Planned exports

| Export                       | Contents                                          |
| ---------------------------- | ------------------------------------------------- |
| `@vanduo-oss/vd3`            | Components, composables, theme API, token data    |
| `@vanduo-oss/vd3/css`        | Full stylesheet (`dist/vd3.min.css`)              |
| `@vanduo-oss/vd3/css/core`   | Tokens-only stylesheet (`dist/vd3-core.min.css`)  |
| `@vanduo-oss/vd3/tokens.json`| Resolved DTCG token data (`dist/tokens.json`)     |

## Development

```sh
pnpm install
pnpm lint          # eslint
pnpm format:check  # prettier
pnpm stylelint     # css (empty until the CSS tree lands)
pnpm typecheck     # vue-tsc --noEmit
pnpm test          # vitest (jsdom)
pnpm build         # vite lib build + d.ts emit
```

Requires Node >= 24 and pnpm >= 10 (`packageManager: pnpm@10.28.2`).

## Documentation

- Agent / LLM reference — [SKILL.md](./SKILL.md)
- Changelog — [CHANGELOG.md](./CHANGELOG.md)

## License

[MIT](./LICENSE) © Vanduo
