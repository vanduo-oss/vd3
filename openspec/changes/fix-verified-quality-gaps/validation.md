# Local validation — 2026-10-04

Library branch: `dev-v175`, based on `c4722f67e2da17f518390b8c53589a538b915284`.
Docs branch: `dev-v179`, based on `45ef97b5b53188a67050134b884bfc508bd16940`.
No main-branch edits, version bump, commit, push, PR, or publication.

## Implemented scope

- Derive built-in primary/status RGB helpers from their active palette. Preserve comma-separated public RGB values and the exported JSON format. Use the semantic primary for dark alpha colors and liquid-gradient color selection.
- Correct reproduced Fibonacci light-hover foreground failures; remove conflicting docs-only primary overrides.
- Reposition target-panel popovers when their anchor moves, including no-flip mode and initial overflow.
- Lint standalone TypeScript, fail unsafe dynamic innerHTML assignments, fail missing CSS imports, run full-source coverage and size/skill gates in CI, and strengthen selected public type assertions.
- Keep the original 14 fully covered files at 100%; add measured full-source coverage floors rather than claiming every behavior is covered.
- Repair documentation and copied Button/Accordion examples; verify docs against staged published library files, not Vite-only aliases.
- Consolidate effective pnpm overrides into pnpm-workspace.yaml and apply available patches to brace-expansion, fast-uri and undici. Add no dependencies.
- Reconcile the two already-shipped OpenSpec changes, preserving their history and documenting the superseded 1.7.2 dogfood task.

## Passing library checks

Node 24.21.0 and pinned pnpm 10.28.2 were used (the cached Corepack executable).

- `test:coverage`: 123 files, 1,418 tests. Lines 91.84%, branches 79.55%, functions 95.05%, statements 89.34%. WebGL effect coverage remains limited; these are regression floors, not complete behavior certification.
- `lint`, `format:check`, `stylelint`, `typecheck`.
- Full `build`; class coverage: 399 static and 28 dynamic classes.
- `test:skills`: declared exports, published links, composable inventory and typed recipes.
- `test:size`: full CSS 96,501 bytes gzip; core CSS 72,145; index.js 76,990.
- `pnpm pack --pack-destination /private/tmp/vd3-verified-pack` and offline frozen lockfile validation.
- `openspec validate --all --strict`: 9 passed; `git diff --check`.

## Docs verification against this library

- Full SSG build: 95 URLs, 92 canonical search routes; typecheck, lint, formatting, stylelint, content and size checks pass.
- 57 unit-test files, 233 tests pass.
- Chromium theme suite: 17 passing tests, including all 18 primary hues, both palettes, explicit/system light and dark modes, real RGB/alpha/contrast and copied examples.
- Focused theme and example matrix: 18 passes across desktop Chromium, mobile Chromium and WebKit. Following the final mobile wrapping edit, all four mobile/WebKit example checks passed again.
- Search/navigation/responsive smoke: 20 pass. Affected accessibility and visual checks: 16 pass. Button, Accordion and Troubleshooting baselines refreshed; desktop/mobile examples inspected.
- Alpha tests composite onto opaque pixels before comparison to avoid magnifying canvas premultiplication rounding. macOS WebKit's native Option+Tab behavior is exercised.
- Firefox binaries installed, but Firefox failed to launch with “Could not find profile folder” using both the default and /private/tmp directories. No Firefox result is claimed.

## Merge/release prerequisites

1. `pnpm audit` still exits nonzero for one high advisory: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), `stylelint > micromatch > braces@3.0.3`. The registry reports no patched version. This is a development-tool dependency, absent from the library's consumer runtime dependency tree. The moderate+ audit gate remains enabled; no exception or vendored patch was added.
2. Docs still commit the published `@vanduo-oss/vd3@1.7.4` pin. The new regression suite requires the fixed library. Publish an authorized library release and update the docs exact pin/lockfile before merging/deploying the docs changes. Local staged validation does not make the old registry version pass these regressions.
3. Firefox QA remains unverified because of the local launch failure.

A14 token-format migration and B1–B6 architecture work remain deferred. No headless conversion, cascade-layer migration, Floating UI dependency, app-scoped state redesign, RTL implementation or component CSS splitting was attempted.
