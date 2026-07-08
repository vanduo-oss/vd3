# Tasks

## 1. Token sources + generators

- [x] 1.1 Copy `core/tokens/` → `tokens/` verbatim (`primitive/`,
      `semantic/`, `customizer/`).
- [x] 1.2 Write `scripts/build-tokens.mjs` (zero-dependency, adapted from
      core `scripts/build.mjs` + the framework-partial emission of
      `generate-fib-palette.mjs`): emit
      `css/core/generated/{colors-fib-base,colors-palette}.css`,
      `dist/tokens.js`, `dist/tokens.d.ts`, `dist/tokens.json`; create
      output dirs; deterministic output.
- [x] 1.3 Write `scripts/generate-fib-palette.mjs` (carried from core,
      trimmed to emit only `tokens/primitive/color.fib.tokens.json`).
- [x] 1.4 Verify generated partials match
      `framework/css/core/{colors-fib-base,colors-palette}.css` with
      banner-only differences (diff during development).

## 2. CSS tree + assets

- [x] 2.1 Copy `framework/css/` → `css/` excluding
      `core/colors-fib-base.css`, `core/colors-palette.css`, and
      `icons/icons-all.css`; rename entry `vanduo.css` → `vd3.css`; point
      its two generated-color imports at `core/generated/`; keep every other
      `@import` identical in path and order.
- [x] 2.2 Copy `framework/fonts/` → `fonts/` entirely.
- [x] 2.3 Copy `framework/icons/phosphor/{LICENSE,regular,fill}` →
      `icons/phosphor/` (no other weights).
- [x] 2.4 Copy `framework/THIRD-PARTY-LICENSES` → `THIRD-PARTY-LICENSES`
      and add it to the package `files` list.

## 3. CSS build

- [x] 3.1 Write `scripts/build-css.mjs` (CSS portion of framework
      `scripts/build.js`): inline imports from `css/vd3.css`, rewrite asset
      urls, lightningcss dev+min bundles (`vd3`, `vd3-core`) with maps and
      deterministic banner; copy `fonts/` and the regular+fill Phosphor
      assets (plus LICENSE) into `dist/`.
- [x] 3.2 Write `scripts/clean-dist.mjs` and set vite
      `build.emptyOutDir: false` (see design.md for the ordering).
- [x] 3.3 Confirm every non-data `url()` in `dist/vd3.min.css` resolves
      relative to `dist/`.

## 4. Wiring

- [x] 4.1 `package.json`: `build` = `clean → build-tokens → build-css →
      vite build → vue-tsc`; add `build:tokens` / `build:css` scripts; drop
      `--allow-empty-input` from stylelint; extend Prettier globs with
      `scripts/**/*.mjs`.
- [x] 4.2 Merge the framework stylelint rule relaxations into
      `stylelint.config.js` so the carried CSS lints unmodified.
- [x] 4.3 Set vitest `fileParallelism: false` (build-artifact specs share
      `dist/` + `css/core/generated/`).
- [x] 4.4 Update the README build-pipeline/development section.

## 5. Tests

- [x] 5.1 Port `core/tests/tokens.test.mjs` → `tests/tokens.spec.ts`
      (DTCG source integrity, customizer shape/defaults).
- [x] 5.2 Port `core/tests/build.test.mjs` → `tests/build-tokens.spec.ts`
      (artifact set, determinism, `--vd-` prefixing, var() resolution,
      token-data export surface, dual-palette contract, resolved literals).
- [x] 5.3 Port `core/tests/palette-gen.test.mjs` →
      `tests/palette-gen.spec.ts` (reproducibility, gamut, monotonic
      lightness, contrast). `parity.test.mjs` not ported — obsolete by
      design (cross-repo invariant).
- [x] 5.4 Add `tests/generated-css.spec.ts`: generated color partials exist
      after build and contain the `[data-palette]` switch blocks.

## 6. Verification

- [x] 6.1 `pnpm build` green (full chain; dist contains every declared
      export target).
- [x] 6.2 `pnpm stylelint` green over the carried tree.
- [x] 6.3 `pnpm lint` green.
- [x] 6.4 `pnpm format:check` green (including `scripts/**/*.mjs`).
- [x] 6.5 `pnpm typecheck` green.
- [x] 6.6 `pnpm test` green.
- [x] 6.7 `openspec validate vd3-token-css-foundation --strict` green.
- [x] 6.8 Sanity diffs: generated partials vs framework committed partials
      (banner-only); normalized `dist/vd3.min.css` vs
      `framework/dist/vanduo.min.css` (report residuals).
