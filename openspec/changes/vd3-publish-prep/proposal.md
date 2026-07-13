# vd3-publish-prep

## Why

The code surface, docs, tests, and gates of `@vanduo-oss/vd3` are release-ready:
`pnpm build` is green, the vitest suite passes (1112 specs / 95 files),
`check:classes` is green, and the package has been dogfooded by a real external
consumer (the `aurora-polaris-chess` app builds and runs on it). What is **not**
yet publishable is the package *manifest and release process*:

1. **No `publishConfig.access: "public"`.** A scoped package (`@vanduo-oss/vd3`)
   does not publish public without it — `npm publish` / `pnpm publish` fails or
   would push a private version.
2. **No guaranteed build before publish.** `dist/` is gitignored and there is no
   `prepack`/`prepublishOnly` build hook, so a publish from a fresh checkout would
   ship an **empty `dist/`**. And the hardened `.npmrc` sets `ignore-scripts=true`,
   which *skips* lifecycle scripts (including `prepack`) during `pnpm publish` — so
   the release flow must build **explicitly**, not rely on an implicit pack-time
   hook.
3. **`engines.node >=24` is imposed on consumers.** vd3 is a browser component
   library — consumers only import the compiled JS/CSS, yet everyone on Node
   20.19+/22 gets an "unsupported engine" warning (including the chess consumer,
   which runs `node >=20.19`). The dev/CI toolchain node (24) is already pinned by
   `packageManager` and `ci.yml`, independent of this field.
4. **The tarball is 15.2 MB unpacked**, and **5.76 MB** of that is the legacy
   Phosphor SVG-font fallback (`Phosphor.svg` / `Phosphor-Fill.svg`) — the last
   entry in every `@font-face` `src:` chain, after woff2/woff/ttf, fetched by no
   supported browser.
5. **Version `0.1.0` with a `## Unreleased` changelog.** The first public cut
   needs a real version and a dated release entry.

The user has decided to cut the first public version as **1.0.0**, commit locally
and push to the private remote this evening, with **no npm publish** yet.

## What Changes

- **`package.json`** — `version` `0.1.0` → **`1.0.0`**; add
  `publishConfig: { "access": "public" }`; relax `engines.node` `>=24` →
  **`>=20.19.0`** (`pnpm >=10` unchanged; dev/CI node stays pinned via
  `packageManager` + `.github/workflows/ci.yml`); add a **`prepack`** script
  (`pnpm run build`) and a **`release`** script
  (`pnpm run build && pnpm publish`) so a publish always ships a freshly built
  `dist/` despite `ignore-scripts=true`.
- **`src/index.ts`** — `VD3_VERSION` `0.1.0` → **`1.0.0`** (keeps
  `tests/smoke.spec.ts` green — it asserts `VD3_VERSION === package.json.version`).
- **`CHANGELOG.md`** — `## Unreleased` → **`## 1.0.0 — 2026-07-13`**, framed as the
  first public release (the accumulated scaffold → tokens/CSS → carryover →
  rewrites → new-components → hardening bullets roll up into it).
- **`README.md`** — status line `Status: 0.1.0 initial release line` → `1.0.0`.
- **Lean tarball** — delete the two legacy SVG icon fonts
  (`icons/phosphor/regular/Phosphor.svg`, `icons/phosphor/fill/Phosphor-Fill.svg`,
  5.76 MB) and drop their `format("svg")` line from the two `@font-face` `src:`
  chains, so the built `dist/vd3.min.css` no longer references them and
  `dist/icons/` no longer ships them. woff2 + woff + ttf remain (full modern +
  legacy-desktop coverage). Tarball 15.2 MB → ~9.4 MB unpacked.

No source maps are dropped (retained for consumer debugging; the
`standalone-library-build` requirement stands). No component, composable, CSS
class, token, export-map, or behavior changes — nothing a consumer imports or
renders changes.

## Non-goals

- **No npm publish tonight.** This change makes the package publishable and pushes
  it to the private remote; the actual `npm publish` (npm 2FA, user-run) is a
  later, explicit step — `pnpm run release` with an OTP.
- **No first-customer API-gap fixes.** The six dogfooding items surfaced by the
  chess rebuild (VdModal persistent mode, Teleport-root `class`/`id` drop,
  VdThemeCustomizer duplicate trigger, `themeDefaults` key docs, icon CSS size,
  VdCard body slot) are separate later changes; 1.0.0 ships the current surface
  and iterates from there.
- **No source-map removal.** Sourcemaps stay in `dist/` (spec-mandated,
  consumer-debugging value); a future size pass may revisit.
- **No further font trimming.** ttf is kept for legacy-desktop coverage; only the
  never-fetched SVG webfont is removed.
- **No dependency, export-map, CSS-class, token, component, or composable
  changes.** The exports map, `.npmrc`, tests, and CI are otherwise untouched.
- **No changes to the old repos** (core, framework, vue, vd2, satellites) — they
  remain strictly read-only reference material.

## Capabilities

### Modified Capabilities

- `repo-scaffold`:
  - **MODIFY `package-metadata`** — the package is now at version `1.0.0`, sets
    `publishConfig.access: "public"`, declares a consumer-friendly
    `engines.node` floor (`>=20.19.0`), and adds the `prepack` + `release`
    scripts; `VD3_VERSION` tracks the `version` field.
  - **ADD `release-publish-configuration`** — public scoped-package access, a
    build-before-publish guarantee that accounts for `ignore-scripts=true`, a
    lean tarball with the legacy SVG icon webfont removed, and a dated
    first-release changelog.

  No other `repo-scaffold` requirement (`hardened-install-policy`,
  `standalone-library-build`, `quality-gates`, `continuous-integration`,
  `release-ready-documentation`, `agent-skill-reference`) is altered.

## Impact

- Package `@vanduo-oss/vd3`. **Semver: this is the `0.1.0` → `1.0.0` first public
  cut.** No runtime API change — the version, publish config, engines floor, and
  tarball trim are packaging-only; nothing a consumer imports or renders changes.
  The SVG-webfont removal is invisible to modern browsers (woff2/woff/ttf remain).
- **API compatibility** (vd2 → vd3 migration; old `@vanduo-oss/vue` → vd3):
  unchanged from the archived surface — this change touches only packaging.
- **Build / test / CI**: `pnpm build`, `check:classes`, the vitest suite, and
  `ci.yml` are unaffected (CI already pins node 24 explicitly, independent of the
  relaxed `engines` field). The smoke spec stays green via the synced
  `VD3_VERSION`.
- **Publish process**: after this change a release is `pnpm run release` (full
  build, then `pnpm publish`) with a user-run OTP; `publishConfig` supplies public
  access. Deferred — not run tonight.
- **Docs (vd3-docs)**: no sync required — no public API and no CSS class/token
  surface changes; only the never-fetched SVG webfont fallback is dropped.
- **Changelog**: the `## 1.0.0 — 2026-07-13` dated entry is the first-release
  rollup, package-only per the changelog policy.
