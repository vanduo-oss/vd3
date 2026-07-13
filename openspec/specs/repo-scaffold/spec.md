# repo-scaffold Specification

## Purpose
TBD - created by archiving change init-vd3-scaffold. Update Purpose after archive.
## Requirements
### Requirement: package-metadata

The vd3 repo MUST provide a `package.json` declaring the `@vanduo-oss/vd3`
package at version `1.0.0`, MIT-licensed, `type: "module"`, managed via
`packageManager: "pnpm@10.28.2"`. Its `engines` MUST declare `pnpm >=10` and a
**consumer-friendly** node floor (`node >=20.19.0`) — the development/CI
toolchain node (24) is pinned by `packageManager` and
`.github/workflows/ci.yml`, not by an `engines` constraint imposed on installers
of the compiled library. It MUST set `publishConfig: { "access": "public" }` so
the scoped package publishes public. It SHALL declare `vue >=3.3.0` as the only
peer dependency (pinia is deliberately dropped in the vd3 line) and SHALL expose
the exports map `"."` (types/import/require from `dist/`), `"./css"`,
`"./css/core"`, `"./tokens.json"`, and `"./package.json"`. It MUST include the
scripts `build`, `typecheck`, `lint`, `format`, `format:check`, `stylelint`,
`test`, `prepack` (runs `build`), and `release` (builds then publishes). The
exported `VD3_VERSION` constant in `src/index.ts` MUST equal the `version` field.

#### Scenario: documented scripts are listed

- **GIVEN** a fresh clone with dependencies installed
- **WHEN** `pnpm run` is invoked without arguments
- **THEN** it lists build, typecheck, lint, format, format:check, stylelint,
  test, prepack, and release

#### Scenario: vue is the only peer

- **GIVEN** the published package manifest
- **WHEN** a consumer inspects `peerDependencies`
- **THEN** exactly one entry exists: `vue: ">=3.3.0"` (no pinia, no
  `@vanduo-oss/*` packages)

#### Scenario: manifest is publishable

- **GIVEN** the release-ready `package.json`
- **WHEN** its publish-relevant fields are inspected
- **THEN** `version` is `1.0.0`, `publishConfig.access` is `"public"`, and
  `engines.node` (`>=20.19.0`) does not exclude Node 20.19+/22/24 consumers

#### Scenario: version constant is synced

- **GIVEN** `src/index.ts` exporting `VD3_VERSION`
- **WHEN** `tests/smoke.spec.ts` runs
- **THEN** `VD3_VERSION` equals the `version` field of `package.json` (`1.0.0`)

### Requirement: hardened-install-policy

The `.npmrc` MUST mirror the vue repo's hardened policy:
`ignore-scripts=true`, `minimum-release-age=1440`,
`trust-policy=no-downgrade`, `block-exotic-subdeps=true`, `save-exact=true`,
`strict-peer-dependencies=true`, `registry=https://registry.npmjs.org/`, and
`minimum-release-age-exclude[]=@vanduo-oss/*`. The `pnpm-workspace.yaml`
SHALL allow build scripts only for `esbuild`.

#### Scenario: hardened install

- **GIVEN** the committed `.npmrc` and `pnpm-lock.yaml`
- **WHEN** a contributor runs `pnpm install --frozen-lockfile`
- **THEN** lifecycle scripts are skipped except esbuild's, packages younger
  than 24h are rejected (first-party `@vanduo-oss/*` excluded), and the
  resolved tree matches the lockfile exactly

### Requirement: standalone-library-build

The build pipeline MUST produce a standalone library: `vite build` in lib
mode from `src/index.ts` emitting es (`dist/index.js`) and cjs
(`dist/index.cjs`) bundles with sourcemaps, followed by `vue-tsc -p
tsconfig.build.json` emitting `dist/index.d.ts`. The rollup externals SHALL
contain only `vue` — no `@vanduo-oss/*` package may be externalized or
depended on at runtime.

#### Scenario: build emits the dist entry points

- **GIVEN** a clean checkout with dependencies installed
- **WHEN** `pnpm build` runs
- **THEN** it exits 0 and `dist/` contains `index.js`, `index.cjs`,
  `index.d.ts`, and matching `.map` files

#### Scenario: only vue stays external

- **GIVEN** the emitted `dist/index.js`
- **WHEN** its import statements are inspected
- **THEN** `vue` is the only bare module specifier that may appear

### Requirement: quality-gates

The repo MUST ship working quality gates: flat ESLint config (vue repo
shape, including the `innerHTML` assignment guard) with ignores for `dist`,
`css/core/generated`, `src/theme/generated`, `openspec`, and `.claude`;
Prettier check over `src` and `tests` (excluding `src/theme/generated`);
Stylelint over `css/**/*.css`; `vue-tsc --noEmit` strict typecheck; and
Vitest in jsdom mode running `tests/**/*.spec.ts`. Every gate SHALL pass on
a fresh clone after the token bootstrap (`pnpm build:tokens`), which
generates the `src/theme/generated/tokens.data.ts` module the source tree
imports.

#### Scenario: all gates green on a fresh clone

- **GIVEN** a fresh clone with dependencies installed and
  `pnpm build:tokens` run once
- **WHEN** `pnpm lint`, `pnpm format:check`, `pnpm stylelint`,
  `pnpm typecheck`, and `pnpm test` run
- **THEN** each command exits with status 0

#### Scenario: smoke spec guards the version constant

- **GIVEN** `src/index.ts` exporting `VD3_VERSION`
- **WHEN** `pnpm test` runs `tests/smoke.spec.ts`
- **THEN** the spec asserts `VD3_VERSION` equals the `version` field of
  `package.json` and passes

#### Scenario: generated theme data is ignored by lint and git

- **GIVEN** a generated `src/theme/generated/tokens.data.ts`
- **WHEN** `git status`, `pnpm lint`, and `pnpm format:check` run
- **THEN** the file is untracked-invisible (gitignored) and neither lint
  gate inspects it

### Requirement: continuous-integration

The repo MUST include `.github/workflows/ci.yml` with SHA-pinned actions, a
least-privilege token (`permissions: contents: read`), markdown
paths-ignore, pnpm 10.28.2 and node 24, running in order: install
(`--frozen-lockfile`), build:tokens (bootstraps the generated theme-data
module the gates need), lint, format:check, stylelint, typecheck, test,
build, check:classes. Dependabot SHALL manage only the pinned GitHub Actions
(weekly, grouped).

#### Scenario: CI runs every gate

- **GIVEN** a push or pull request touching non-markdown files on main
- **WHEN** the ci workflow executes
- **THEN** it installs with the frozen lockfile, runs build:tokens, then
  lint, format:check, stylelint, typecheck, test, build, and check:classes,
  each required to pass

#### Scenario: class coverage gates CI after build

- **GIVEN** the ci workflow's step order
- **WHEN** the build step completes
- **THEN** `pnpm run check:classes` runs against the freshly built
  `dist/vd3.min.css` and fails the workflow on any `vd-*` drift

### Requirement: release-ready-documentation

The repo MUST ship a `README.md` that documents the actually-exported surface
of `@vanduo-oss/vd3` for a consuming developer, accurate against `package.json`
and `src/index.ts`. It SHALL contain an install step (`pnpm add @vanduo-oss/vd3`),
a usage step showing the three real integration points — importing the
stylesheet with `import "@vanduo-oss/vd3/css"`, registering the plugin with
`app.use(VanduoVue)` (optionally `app.use(VanduoVue, { themeDefaults })`), and
rendering a `Vd*` component — and an overview of the shipped inventory (the 52
exported components: 45 `Vd*` components plus the 7 layout primitives `VdBox`,
`VdCenter`, `VdCover`, `VdFrame`, `VdInline`, `VdStack`, `VdSwitcher`; and the
~35 composables including the theme layer and the `useThemePreference`
singleton). It MUST document the theming contract (the `data-palette` /
`-primary` / `-neutral` / `-radius` / `-theme` / `-font` attributes, `--vd-*`
custom properties, `vanduo-*` localStorage keys, and the `./css` / `./css/core`
/ `./tokens.json` subpath exports), an SSR note stating the package is
`vite-ssg`-safe because all browser access is client-guarded, and a security
note stating zero runtime dependencies beyond the `vue >=3.3` peer (no pinia),
the hardened `.npmrc` posture, MIT licensing, and the bundled
`THIRD-PARTY-LICENSES`. Every documented name, count, import specifier, and
export subpath MUST match what the package actually exports; no unexported or
non-existent API may be documented as available.

#### Scenario: install and usage are accurate and complete

- **GIVEN** the release-ready `README.md`
- **WHEN** a developer reads the install/usage sections
- **THEN** they find `pnpm add @vanduo-oss/vd3`, `import "@vanduo-oss/vd3/css"`,
  and `app.use(VanduoVue)`, and each import specifier resolves against the
  `package.json` exports map (`.`, `./css`, `./css/core`, `./tokens.json`)

#### Scenario: documented inventory matches the exports

- **GIVEN** the README component/composable overview and `src/index.ts`
- **WHEN** the documented names and counts are compared against the exports
- **THEN** the 52 components (45 `Vd*` + 7 layout primitives) and the theme
  layer / `useThemePreference` are all real exports, and no documented symbol
  is absent from `src/index.ts`

#### Scenario: theming, SSR, and security posture are stated

- **GIVEN** the release-ready `README.md`
- **WHEN** its theming, SSR, and security sections are read
- **THEN** the `data-*` / `--vd-*` / `vanduo-*` contract and the CSS/token
  exports are documented, the SSR note states `vite-ssg` safety via
  client-guarded browser access, and the security note states the `vue >=3.3`
  sole peer (no pinia), the hardened `.npmrc` posture, MIT license, and the
  bundled third-party licenses — each traceable to `package.json`, `.npmrc`,
  or `THIRD-PARTY-LICENSES`

#### Scenario: status line is not stale

- **GIVEN** the README status/intro text
- **WHEN** it is checked against the archived changes
- **THEN** it does not describe already-archived work (e.g. `vd3-rewrites`) as
  upcoming, and any pre-release note does not contradict the install steps

### Requirement: agent-skill-reference

The repo MUST ship a `SKILL.md` in Agent-Skills format — a YAML frontmatter
block with a `name` key and a single-line `description` key ("Use when …"),
followed by the reference body — that gives an LLM/agent enough to build a UI
with the package without reading source. The `description` MUST describe the
shipped, installable package (it MUST NOT frame the package as an unbuilt
"pre-release scaffold" whose API is still "upcoming"). The body SHALL document
the same real install (`pnpm add @vanduo-oss/vd3`, `import "@vanduo-oss/vd3/css"`,
`app.use(VanduoVue)`), the component/composable inventory grouped for
scanability (the 52 components incl. the 7 named layout primitives, and the
~35 composables incl. the `useTheme` surface and the `useThemePreference`
singleton), the theming contract (`data-*` attributes, `--vd-*` custom
properties, `vanduo-*` storage keys, and the `./css` / `./css/core` /
`./tokens.json` exports), and the SSR posture (client-guarded browser access,
`vite-ssg`-safe, `useThemePreference` lazy client init). It MUST NOT reference
`window.Vanduo*` globals, IIFE loading, or a `loadVanduoRuntime` runtime — the
package is pure Vue.

#### Scenario: frontmatter is valid Agent-Skills format

- **GIVEN** the release-ready `SKILL.md`
- **WHEN** its leading YAML frontmatter is parsed
- **THEN** it has a `name` key and a single-line `description` key, and the
  `description` describes the installable package rather than an unbuilt
  scaffold with an upcoming API

#### Scenario: body carries an actionable install + inventory

- **GIVEN** the `SKILL.md` body
- **WHEN** an agent reads it
- **THEN** it finds the `pnpm add` install, the `@vanduo-oss/vd3/css` import,
  the `app.use(VanduoVue)` registration, the grouped component/composable
  inventory (matching `src/index.ts`), the theming contract, and the SSR note
  — with no reference to `window.Vanduo*`, IIFE loading, or `loadVanduoRuntime`

### Requirement: release-publish-configuration

The package MUST be publishable to npm as a public scoped package with a
guaranteed-built `dist/`. `publishConfig.access` MUST be `"public"`. Because the
hardened `.npmrc` sets `ignore-scripts=true` (which skips lifecycle scripts —
including `prepack`/`prepublishOnly` — during `pnpm publish`), the release flow
MUST NOT rely on an implicit pack-time build alone: a `release` script MUST
explicitly run the full `build` before `pnpm publish`, and a `prepack` build MUST
also be declared for environments where lifecycle scripts run. The published
tarball MUST contain a freshly built `dist/` (never an empty `dist/` produced
from a clean checkout where `dist/` is gitignored). The tarball MUST NOT ship the
legacy Phosphor SVG webfont fallbacks (`Phosphor.svg`, `Phosphor-Fill.svg`): they
are the last entry in each `@font-face` `src:` chain after woff2/woff/ttf and are
fetched by no supported browser, so the `src:` chains MUST NOT reference
`format("svg")` and the woff2/woff/ttf formats MUST remain. The `CHANGELOG.md`
MUST carry a dated release entry for the published version (the first public
release MUST NOT ship as `## Unreleased` only).

#### Scenario: scoped package publishes public

- **GIVEN** the `package.json`
- **WHEN** `npm publish` / `pnpm publish` runs
- **THEN** `publishConfig.access: "public"` makes the scoped `@vanduo-oss/vd3`
  package public without a manual `--access public` flag

#### Scenario: release always ships a built dist

- **GIVEN** `.npmrc` sets `ignore-scripts=true` and `dist/` is gitignored
- **WHEN** the maintainer runs `pnpm run release`
- **THEN** the full `build` runs before `pnpm publish`, so the tarball's `dist/`
  is freshly built (never empty) even though `prepack` is skipped by the
  ignore-scripts policy

#### Scenario: no legacy SVG webfont in the tarball

- **GIVEN** `npm pack --dry-run` and the built `dist/`
- **WHEN** the file list and `dist/vd3.min.css` are inspected
- **THEN** no `Phosphor.svg` / `Phosphor-Fill.svg` is present and no
  `format("svg")` `src:` remains, while the woff2/woff/ttf icon fonts and their
  `@font-face` entries are intact

#### Scenario: first release is dated

- **GIVEN** `CHANGELOG.md` at publish time
- **WHEN** its top release entry is read
- **THEN** it is a dated `## 1.0.0 — 2026-07-13` heading, not `## Unreleased`

