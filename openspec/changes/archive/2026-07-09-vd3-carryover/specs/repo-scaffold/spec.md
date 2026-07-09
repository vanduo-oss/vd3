## MODIFIED Requirements

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
