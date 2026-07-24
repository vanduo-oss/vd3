# @vanduo-oss/vd3

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

> Vanduo UI for Vue 3 — design system and component library (the vd3 line).

The Vue3-only line of the [Vanduo](https://vanduo.dev) design system. Unlike
the previous three-package split (`@vanduo-oss/core` tokens +
`@vanduo-oss/framework` CSS/JS + `@vanduo-oss/vue` components), vd3 is fully
standalone: one package ships its own DTCG design tokens, CSS tree, and typed
`Vd*` components/composables. Sole peer dependency: `vue >=3.3` — no pinia, and
no framework IIFE runtime (`loadVanduoRuntime` / `window.Vanduo*` are gone).

**Status: 1.0.1** (patch on the 1.0.0 first public release).

## Install

```sh
pnpm add @vanduo-oss/vd3
```

## Usage

Three integration points — import the stylesheet, register the plugin, and
render components:

```ts
// main.ts
import { createApp } from "vue";
import { VanduoVue } from "@vanduo-oss/vd3";
import "@vanduo-oss/vd3/css"; // full stylesheet (tokens + components + icons)
import App from "./App.vue";

createApp(App).use(VanduoVue).mount("#app");
```

`app.use(VanduoVue)` accepts an optional `{ themeDefaults }` to override the
generic baseline before the theme model first reads it (e.g.
`app.use(VanduoVue, { themeDefaults: { PRIMARY_DARK: "blue" } })`).

```vue
<script setup lang="ts">
import { VdButton, VdCard } from "@vanduo-oss/vd3";
</script>

<template>
  <VdCard>
    <VdButton variant="primary">Save</VdButton>
  </VdCard>
</template>
```

## Components & composables

Everything is a named export from the package root — import only what you
render; nothing registers globally.

- **52 components** — 45 `Vd*` components plus 7 layout primitives (`VdBox`,
  `VdCenter`, `VdCover`, `VdFrame`, `VdInline`, `VdStack`, `VdSwitcher`).
- **~35 composables** — the theme layer (`useTheme`, `useThemeBridge`, and the
  `useThemePreference` reactive singleton), plus form, overlay/dismissal,
  motion/scroll, and layout/interaction helpers. The `sanitizeHtml` whitelist
  sanitizer is exported too.

The full per-group inventory and the theming contract live in the agent/LLM
reference, [SKILL.md](./SKILL.md).

### Theming

The theme layer (`useTheme`) drives six `data-*` attributes on `<html>` —
`data-palette`, `data-primary`, `data-neutral`, `data-radius`, `data-theme`,
`data-font` — which the CSS resolves into `--vd-*` custom properties (e.g.
`--vd-radius-scale`). Preferences persist to six `localStorage` keys
(`vanduo-palette`, `vanduo-primary-color`, `vanduo-neutral-color`,
`vanduo-radius`, `vanduo-theme-preference`, `vanduo-font-preference`).

`useThemePreference()` is a module-scope reactive singleton (no pinia) that is
the single source of truth behind `VdThemeSwitcher` and `VdThemeCustomizer`;
its setters route through `applyPreference` + `persistPreference`. Override the
default palette/primary/etc. via `app.use(VanduoVue, { themeDefaults })` or
`setThemeDefaults()`. Token data (`DEFAULTS`, `PALETTE_OPTIONS`, `tokens`, …) is
re-exported from the package root, or import raw JSON from
`@vanduo-oss/vd3/tokens.json`. Ship the token-only stylesheet with
`@vanduo-oss/vd3/css/core`.

### SSR

The package is SSR / `vite-ssg`-safe: all browser access is client-guarded with
`typeof window` checks and `onMounted` / `onScopeDispose` lifecycle hooks, so
nothing touches `window`, `document`, `localStorage`, or `matchMedia` during
server render. `useThemePreference` seeds from defaults on the server and
hydrates from storage lazily on the first client call.

### Security

- **Zero runtime dependencies** beyond the `vue >=3.3` peer — no pinia, no
  transitive runtime deps.
- **Hardened `.npmrc`:** `ignore-scripts`, `minimum-release-age`, `save-exact`,
  `strict-peer-dependencies`, `trust-policy=no-downgrade`,
  `block-exotic-subdeps`, and an explicit `registry`.
- **MIT** licensed ([LICENSE](./LICENSE)); bundled third-party notices in
  [THIRD-PARTY-LICENSES](./THIRD-PARTY-LICENSES) (Open Color, Phosphor Icons,
  and the adapted expanding-cards CSS — all MIT).

## Exports

| Export                        | Contents                                         |
| ----------------------------- | ------------------------------------------------ |
| `@vanduo-oss/vd3`             | Components, composables, theme API, token data   |
| `@vanduo-oss/vd3/css`         | Full stylesheet (`dist/vd3.min.css`)             |
| `@vanduo-oss/vd3/css/core`    | Tokens-only stylesheet (`dist/vd3-core.min.css`) |
| `@vanduo-oss/vd3/tokens.json` | Resolved DTCG token data (`dist/tokens.json`)    |

## Build pipeline

`pnpm build` runs the full chain, in order:

1. `scripts/clean-dist.mjs` — resets `dist/` (the only step that cleans;
   vite runs with `emptyOutDir: false`).
2. `scripts/build-tokens.mjs` — DTCG tokens (`tokens/`) → generated color
   partials (`css/core/generated/`, gitignored), the typed token-data module
   (`src/theme/generated/tokens.data.ts`, gitignored — inlined into the lib
   bundle) + `dist/tokens.json`. Zero-dependency and deterministic.
3. `scripts/build-css.mjs` — bundles `css/vd3.css` with lightningcss into
   `dist/vd3(.min).css` and the no-icons `dist/vd3-core(.min).css` (+ source
   maps), and copies `fonts/` and the Phosphor regular + fill icon weights
   into `dist/`.
4. `vite build` — the library JS (`dist/index.{js,cjs}`).
5. `vue-tsc -p tsconfig.build.json` — the `.d.ts` declarations.
6. `scripts/check-class-coverage.mjs` — asserts every `vd-*` class the
   components render has a selector in `dist/vd3.min.css`
   (also standalone as `pnpm check:classes`).

`pnpm build:tokens` / `pnpm build:css` run steps 2–3 standalone;
`pnpm gen:fib` regenerates `tokens/primitive/color.fib.tokens.json`.

## Development

On a fresh clone, bootstrap the generated token-data module first — `src/`
imports `src/theme/generated/tokens.data.ts` (gitignored build output), so
lint/typecheck/test cannot pass until it exists:

```sh
pnpm install && pnpm build:tokens
```

Then the usual gates:

```sh
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
