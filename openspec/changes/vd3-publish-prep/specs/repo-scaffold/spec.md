## MODIFIED Requirements

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

## ADDED Requirements

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
