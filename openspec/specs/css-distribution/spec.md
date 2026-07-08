# css-distribution Specification

## Purpose
TBD - created by archiving change vd3-token-css-foundation. Update Purpose after archive.
## Requirements
### Requirement: authored-css-tree

The repo MUST carry the authored CSS tree from the old framework repo under
`css/`, preserving every partial's path and content, with three deliberate
exceptions: `core/colors-fib-base.css` and `core/colors-palette.css` are not
carried (they are generated into `css/core/generated/`), and
`icons/icons-all.css` is not carried (vd3 ships only the default icon
weights). The entry SHALL be `css/vd3.css` (renamed from `vanduo.css`),
identical to the old entry except that the two generated-color `@import`s
point at `core/generated/`; every other `@import` MUST keep its original
path and order so the cascade is unchanged.

#### Scenario: entry import order preserved

- **GIVEN** `css/vd3.css` and the old `framework/css/vanduo.css`
- **WHEN** their `@import` lists are compared
- **THEN** they are identical except that `core/colors-fib-base.css` and
  `core/colors-palette.css` read `core/generated/colors-fib-base.css` and
  `core/generated/colors-palette.css`

#### Scenario: authored partials lint clean

- **GIVEN** the carried `css/**` tree
- **WHEN** `pnpm stylelint` runs (no `--allow-empty-input`)
- **THEN** it exits 0, with `css/core/generated/**` excluded as build output

### Requirement: css-bundles

`scripts/build-css.mjs` MUST bundle `css/vd3.css` (inlining all `@import`s
in order and rewriting asset `url()`s for the dist layout) and emit, via
lightningcss, both development and production variants: `dist/vd3.css`,
`dist/vd3.min.css`, `dist/vd3-core.css`, and `dist/vd3-core.min.css`, each
with a source map and a leading `/*! @vanduo-oss/vd3 v<version> | <mode> */`
banner containing no timestamp or commit hash (deterministic output). The
core variant SHALL strip the icon-entry `@import` from the entry source
before bundling — the same no-icons rule set as the old `vanduo-core`
bundle. These files back the package's `./css` and `./css/core` exports.

#### Scenario: build emits all four bundles

- **GIVEN** a completed token build
- **WHEN** `node scripts/build-css.mjs` runs
- **THEN** `dist/` contains `vd3.css`, `vd3.min.css`, `vd3-core.css`, and
  `vd3-core.min.css`, each non-empty with a matching `.map` file

#### Scenario: core variant has no icon rules

- **GIVEN** the emitted `dist/vd3-core.min.css`
- **WHEN** it is searched for the Phosphor `@font-face` sources
- **THEN** no `icons/phosphor` reference appears, while `dist/vd3.min.css`
  contains them

### Requirement: bundled-assets

The CSS build MUST copy `fonts/` (all font families carried from the old
framework repo) and the Phosphor icon weights referenced by the bundled
icon entry — regular and fill, plus the Phosphor `LICENSE` file — into
`dist/` at paths matching the rewritten `url()` references, so
`dist/vd3.min.css` resolves every non-data `url()` relative to `dist/`.
Third-party attribution (`THIRD-PARTY-LICENSES`) SHALL ship with the
package.

#### Scenario: asset urls resolve from dist

- **GIVEN** the emitted `dist/vd3.min.css`
- **WHEN** every non-data `url()` reference is resolved relative to `dist/`
- **THEN** each referenced file exists (fonts under `dist/fonts/…`, icons
  under `dist/icons/phosphor/{regular,fill}/…`)

### Requirement: icon-weight-policy

vd3 SHALL ship only the Phosphor regular and fill weights (the
`css/icons/icons.css` defaults). The bold, light, thin, and duotone weights
and the `icons-all.css` aggregate entry MUST NOT be present in the repo or
in `dist/`; consumers needing other weights self-host them (the docs site
serves its own static copy).

#### Scenario: only default weights ship

- **GIVEN** a completed build
- **WHEN** `icons/phosphor/` and `dist/icons/phosphor/` are listed
- **THEN** each contains exactly `LICENSE`, `regular/`, and `fill/`

### Requirement: build-chain-ordering

The `pnpm build` script MUST run, in order: `scripts/clean-dist.mjs` (reset
`dist/`), `scripts/build-tokens.mjs`, `scripts/build-css.mjs`, `vite build`,
then `vue-tsc -p tsconfig.build.json`. `vite.config.ts` SHALL set
`build.emptyOutDir: false` so the vite step cannot clobber the token and CSS
artifacts emitted before it. After a full build, `dist/` MUST contain every
artifact declared in the exports map: `index.js`, `index.cjs`, `index.d.ts`,
`vd3.min.css`, `vd3-core.min.css`, and `tokens.json` (plus `tokens.js`,
`tokens.d.ts`, dev CSS variants, maps, fonts, and icons).

#### Scenario: full build produces every declared export target

- **GIVEN** a clean checkout with dependencies installed
- **WHEN** `pnpm build` runs
- **THEN** it exits 0 and `dist/` contains `index.js`, `index.cjs`,
  `index.d.ts`, `vd3.css`, `vd3.min.css`, `vd3-core.css`,
  `vd3-core.min.css`, `tokens.js`, `tokens.d.ts`, and `tokens.json`

#### Scenario: vite step preserves earlier artifacts

- **GIVEN** the build chain has emitted tokens and CSS into `dist/`
- **WHEN** the `vite build` step runs
- **THEN** `dist/tokens.js`, `dist/tokens.json`, and the CSS bundles still
  exist unchanged afterwards

