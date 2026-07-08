# repo-scaffold Specification

## Purpose
TBD - created by archiving change init-vd3-scaffold. Update Purpose after archive.
## Requirements
### Requirement: package-metadata

The vd3 repo MUST provide a `package.json` declaring the `@vanduo-oss/vd3`
package at version `0.1.0`, MIT-licensed, `type: "module"`, managed via
`packageManager: "pnpm@10.28.2"` with engines node `>=24` and pnpm `>=10`.
It SHALL declare `vue >=3.3.0` as the only peer dependency (pinia is
deliberately dropped in the vd3 line) and SHALL expose the exports map
`"."` (types/import/require from `dist/`), `"./css"`, `"./css/core"`,
`"./tokens.json"`, and `"./package.json"`. It MUST include the scripts
`build`, `typecheck`, `lint`, `format`, `format:check`, `stylelint`, and
`test`.

#### Scenario: documented scripts are listed

- **GIVEN** a fresh clone with dependencies installed
- **WHEN** `pnpm run` is invoked without arguments
- **THEN** it lists build, typecheck, lint, format, format:check, stylelint,
  and test

#### Scenario: vue is the only peer

- **GIVEN** the published package manifest
- **WHEN** a consumer inspects `peerDependencies`
- **THEN** exactly one entry exists: `vue: ">=3.3.0"` (no pinia, no
  `@vanduo-oss/*` packages)

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
`css/core/generated`, `openspec`, and `.claude`; Prettier check over `src`
and `tests`; Stylelint over `css/**/*.css` with `--allow-empty-input`;
`vue-tsc --noEmit` strict typecheck; and Vitest in jsdom mode running
`tests/**/*.spec.ts`. Every gate SHALL pass on the scaffold as committed.

#### Scenario: all gates green on a fresh clone

- **GIVEN** a fresh clone with dependencies installed
- **WHEN** `pnpm lint`, `pnpm format:check`, `pnpm stylelint`,
  `pnpm typecheck`, and `pnpm test` run
- **THEN** each command exits with status 0

#### Scenario: smoke spec guards the version constant

- **GIVEN** `src/index.ts` exporting `VD3_VERSION`
- **WHEN** `pnpm test` runs `tests/smoke.spec.ts`
- **THEN** the spec asserts `VD3_VERSION` equals the `version` field of
  `package.json` and passes

### Requirement: continuous-integration

The repo MUST include `.github/workflows/ci.yml` with SHA-pinned actions, a
least-privilege token (`permissions: contents: read`), markdown
paths-ignore, pnpm 10.28.2 and node 24, running in order: install
(`--frozen-lockfile`), lint, format:check, stylelint, typecheck, test,
build. Dependabot SHALL manage only the pinned GitHub Actions (weekly,
grouped).

#### Scenario: CI runs every gate

- **GIVEN** a push or pull request touching non-markdown files on main
- **WHEN** the ci workflow executes
- **THEN** it installs with the frozen lockfile and runs lint, format:check,
  stylelint, typecheck, test, and build, each required to pass

