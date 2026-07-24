## MODIFIED Requirements

### Requirement: continuous-integration

The repo MUST include `.github/workflows/ci.yml` with SHA-pinned actions, a
least-privilege token (`permissions: contents: read`), markdown
paths-ignore, pnpm 10.28.2 and node 24 (with `cache: pnpm` on the node setup),
running in order: install (`--frozen-lockfile`), `pnpm audit
--audit-level=moderate` (kept green by the security `overrides` in
`pnpm-workspace.yaml`), build:tokens (bootstraps the generated theme-data
module the gates need), lint, format:check, stylelint, typecheck, test,
build, check:classes. Dependabot SHALL manage only the pinned GitHub Actions
(weekly, grouped).

#### Scenario: CI runs every gate

- **GIVEN** a push or pull request touching non-markdown files on main
- **WHEN** the ci workflow executes
- **THEN** it installs with the frozen lockfile, runs `pnpm audit
  --audit-level=moderate`, then build:tokens, then lint, format:check,
  stylelint, typecheck, test, build, and check:classes, each required to pass

#### Scenario: class coverage gates CI after build

- **GIVEN** the ci workflow's step order
- **WHEN** the build step completes
- **THEN** `pnpm run check:classes` runs against the freshly built
  `dist/vd3.min.css` and fails the workflow on any `vd-*` drift

#### Scenario: dependency audit gates CI

- **GIVEN** the ci workflow after `pnpm install --frozen-lockfile`
- **WHEN** `pnpm audit --audit-level=moderate` runs
- **THEN** it exits 0 because the `pnpm-workspace.yaml` `overrides` pin the
  flagged transitive dev dependencies (`brace-expansion`, `fast-uri`) to
  patched releases, and a newly-introduced moderate+ advisory would fail the
  workflow
