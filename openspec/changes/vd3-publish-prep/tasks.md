# vd3-publish-prep — Tasks

## 1. Manifest (package.json + version constant)

- [x] 1.1 `package.json`: bump `version` `0.1.0` → `1.0.0`.
- [x] 1.2 `package.json`: add `publishConfig: { "access": "public" }` (scoped
      package publishes public).
- [x] 1.3 `package.json`: relax `engines.node` `>=24` → `>=20.19.0`
      (`pnpm >=10` unchanged; dev/CI node still pinned by `packageManager` and
      `ci.yml`).
- [x] 1.4 `package.json`: add scripts `prepack` = `pnpm run build` and `release`
      = `pnpm run build && pnpm publish` (explicit build-before-publish, since
      `.npmrc ignore-scripts=true` skips `prepack` during `pnpm publish`).
- [x] 1.5 `src/index.ts`: `VD3_VERSION` `0.1.0` → `1.0.0` (keeps
      `tests/smoke.spec.ts` green: `VD3_VERSION === package.json.version`).

## 2. Changelog + README

- [x] 2.1 `CHANGELOG.md`: `## Unreleased` → `## 1.0.0 — 2026-07-13`, with a
      first-public-release lead line above the accumulated bullets.
- [x] 2.2 `README.md`: status line `Status: 0.1.0 initial release line.` →
      `Status: 1.0.0 — first public release.`

## 3. Lean tarball (drop legacy SVG icon webfont)

- [x] 3.1 Delete `icons/phosphor/regular/Phosphor.svg` and
      `icons/phosphor/fill/Phosphor-Fill.svg` (5.76 MB of never-fetched legacy
      fallback).
- [x] 3.2 Remove the `url("…svg#…") format("svg")` line (and the trailing comma
      on the preceding `ttf` line) from the `@font-face` `src:` chain in
      `icons/phosphor/regular/style.css` and `icons/phosphor/fill/style.css`, so
      the inlined `dist/vd3.min.css` no longer references the SVG font.

## 4. Gates + verification

- [x] 4.1 `pnpm run lint && pnpm run format:check && pnpm run stylelint &&
      pnpm run typecheck && pnpm run test` — all green (smoke asserts
      `VD3_VERSION === 1.0.0`).
- [x] 4.2 `pnpm run build` — banner reads `v1.0.0`; `dist/icons/phosphor/*` carry
      only woff2/woff/ttf (no `.svg`); `dist/vd3.min.css` has no `format("svg")`
      / `.svg` url.
- [x] 4.3 `pnpm run check:classes` — green (no `vd-*` drift).
- [x] 4.4 `npm pack --dry-run` — tarball ≈ 9–10 MB unpacked; contains only
      `dist/` + `README.md` + `SKILL.md` + `CHANGELOG.md` + `LICENSE` +
      `THIRD-PARTY-LICENSES` + `package.json`; no `*.svg` Phosphor font; no
      `src`/`tests`/`openspec`/`scripts` leak.
- [x] 4.5 `openspec validate vd3-publish-prep --strict` — passes.
- [x] 4.6 Docs sync (vd3-docs): **not required** — no public API and no CSS
      class/token change; only the never-fetched SVG webfont fallback is dropped.
      (Rationale recorded per the tasks rule.)

## 5. Release process (deferred — user-run, not tonight)

- [x] 5.1 Publish is deferred: when the user chooses to release, run
      `pnpm run release` (full build → `pnpm publish`) with an npm 2FA OTP.
      `publishConfig.access: "public"` supplies public access. **Not run in this
      change.**
