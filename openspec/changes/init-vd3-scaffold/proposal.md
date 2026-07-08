## Why

`vd3/` is an empty git repo that must host `@vanduo-oss/vd3` — the Vue3-only
design system line. Unlike the old three-package split (`core` tokens +
`framework` CSS/JS + `vue` components), vd3 is fully standalone: later changes
absorb the DTCG token pipeline (from the old core repo), the CSS tree (from the
old framework repo), and the 38 components / 30 composables (from the old vue
repo). Before any of that can land we need a buildable, lintable, type-checked,
tested baseline: a library `package.json` with the documented scripts and
exports map, hardened `.npmrc`, strict TypeScript + Vue tooling, ESLint /
Prettier / Stylelint / Vitest configs, a SHA-pinned least-privilege CI
workflow, and a minimal real module (`src/index.ts` exporting `VD3_VERSION`)
with one meaningful smoke spec — every defined script green.

## What Changes

- Add `package.json` declaring `@vanduo-oss/vd3` `0.1.0`, `type: "module"`,
  `packageManager: "pnpm@10.28.2"`, `engines` node `>=24` / pnpm `>=10`,
  `sideEffects: ["**/*.css"]`, dist-based `main`/`module`/`types`, and the
  exports map: `"."` (types/import/require), `"./css"` →
  `dist/vd3.min.css`, `"./css/core"` → `dist/vd3-core.min.css`,
  `"./tokens.json"` → `dist/tokens.json`, `"./package.json"`. Sole peer:
  `vue >=3.3.0` — **no pinia** (deliberately dropped in vd3). Scripts:
  `build`, `typecheck`, `lint`, `format`, `format:check`, `stylelint`, `test`.
- devDependencies copied at the exact version specs used by the old `vue`
  repo (`@eslint/js`, `@typescript-eslint/parser`, `@vitejs/plugin-vue`,
  `@vue/tsconfig`, `eslint`, `eslint-plugin-vue`, `prettier`, `typescript`,
  `typescript-eslint`, `vite`, `vue`, `vue-eslint-parser`, `vue-tsc`; pinia
  not carried), plus the test/CSS toolchain: `vitest` + `@vitest/coverage-v8`
  (^4 line), `@vue/test-utils` and `jsdom` (vd2 specs), `lightningcss`
  (framework spec), `stylelint` + `stylelint-config-standard` (vd2 specs).
- Add `.npmrc` mirroring `vue/.npmrc` (header renamed only): `ignore-scripts`,
  `minimum-release-age=1440`, `trust-policy=no-downgrade`,
  `block-exotic-subdeps`, `save-exact`, `strict-peer-dependencies`, explicit
  registry, and `minimum-release-age-exclude[]=@vanduo-oss/*`.
- Add `pnpm-workspace.yaml` (charts-repo shape) with
  `onlyBuiltDependencies: [esbuild]`.
- Add `tsconfig.json` (strict, `moduleResolution: bundler`, includes `src` +
  `tests`) and `tsconfig.build.json` (declaration-only emit to `dist/`,
  `src` only).
- Add `eslint.config.js` (vue repo flat config incl. the `innerHTML` guard),
  with ignores extended for `dist`, `css/core/generated`, `openspec`,
  `.claude`.
- Add `stylelint.config.js` (vd2 config; `stylelint "css/**/*.css"
  --allow-empty-input` until the CSS tree lands).
- Add `vite.config.ts` — lib mode, entry `src/index.ts`, formats es + cjs,
  sourcemaps on, externalize **only** `vue` (no `@vanduo-oss/*` externals;
  vd3 is standalone).
- Add `vitest.config.ts` (jsdom environment, `tests/**/*.spec.ts`).
- Add `.gitignore` (node_modules, dist, `css/core/generated/`,
  `*.tsbuildinfo`, `.DS_Store`, coverage, playwright artifacts).
- Add `.github/workflows/ci.yml` (adapted from vue repo: SHA-pinned actions,
  `permissions: contents: read`, paths-ignore for markdown, node 24, pnpm
  10.28.2, `--frozen-lockfile`; order: install, lint, format:check, stylelint,
  typecheck, test, build) and `.github/dependabot.yml` (vue repo copy).
- Add `LICENSE` (MIT, copied from the vue repo), stub `README.md`, stub
  `SKILL.md` (Agent Skills frontmatter), and `CHANGELOG.md` with an
  Unreleased scaffold entry.
- Add `src/index.ts` exporting `VD3_VERSION = "0.1.0"` and
  `tests/smoke.spec.ts` asserting it matches `package.json`'s version.

## Non-goals

- No DTCG tokens, no `tokens/` directory, no `scripts/build-tokens.mjs` —
  that is the `vd3-token-css-foundation` change.
- No CSS tree (`css/`), no `scripts/build-css.mjs`, no fonts or Phosphor
  icons in `dist/` — also `vd3-token-css-foundation`. The `./css`,
  `./css/core` and `./tokens.json` exports are declared now so the public
  contract is stable, but their files do not exist yet (the package is not
  published in this state).
- No components, composables, theme API, or class-coverage gate — that is
  the `vd3-carryover` change. Consequently no composable is being ported or
  rewritten in this change, so no framework/js source files are named.
- No npm publish, no docs site (vd3-docs), no Playwright/e2e setup.
- No changes to the old repos (core, framework, vue, vd2, satellites) —
  they are read-only reference material.

## Capabilities

### New Capabilities

- `repo-scaffold`: package metadata, hardened install policy, tooling
  configs, CI, stub source, and test bootstrap for vd3.

### Modified Capabilities

_None — no specs exist before this change._

## Impact

- New npm package `@vanduo-oss/vd3` at `0.1.0` (pre-release; local-only —
  nothing is published by this change). Semver: initial `0.x`, so minor bumps
  may still break until `1.0.0`.
- API compatibility with the old `@vanduo-oss/vue` package: none yet — the
  only export is `VD3_VERSION`. Two deliberate contract breaks are locked in
  now for vd2→vd3 migration notes: (1) pinia is no longer a peer dependency
  (the toast store will be a module-scope `reactive()` singleton), and
  (2) vd3 has zero `@vanduo-oss/*` runtime dependencies — CSS ships from
  this package (`@vanduo-oss/vd3/css`) instead of forwarding
  `@vanduo-oss/framework`.
- Single-package pnpm repo; tooling (ESLint, Prettier, Stylelint, Vitest,
  lightningcss) are dev-only dependencies; CI is a new GitHub Actions
  workflow with read-only token permissions.
