# vd3-token-css-foundation

## Why

After the `init-vd3-scaffold` change, `@vanduo-oss/vd3` builds and tests green
but ships no styling substance: the declared `./css`, `./css/core` and
`./tokens.json` exports point at files that do not exist yet. In the old line
those artifacts were split across two repos — the DTCG token pipeline lived in
`core` (zero-dependency `scripts/build.mjs` generating CSS custom properties,
a typed token-data module and a flat `tokens.json`) and the authored CSS tree
lived in `framework` (60+ partials bundled by `scripts/build.js` via
lightningcss, plus fonts and Phosphor icons). vd3 is the standalone line, so
this change absorbs both: the token sources and generator move in-repo, the
CSS tree moves in-repo, and the build chain produces every declared dist
artifact from inside vd3 alone. The old repos stay read-only reference
material.

## What Changes

- Copy the DTCG token sources from the old core repo into `tokens/`
  (`primitive/color.tokens.json`, `primitive/color.fib.tokens.json`,
  `primitive/scale.tokens.json`, `semantic/color.tokens.json`,
  `customizer/options.json`) verbatim.
- Add `scripts/build-tokens.mjs` — a zero-dependency generator adapted from
  core `scripts/build.mjs` (222 lines) plus the framework-partial emission
  half of core `scripts/generate-fib-palette.mjs` (257 lines). It emits:
  - `css/core/generated/colors-fib-base.css` and
    `css/core/generated/colors-palette.css` — the palette base scales and the
    active-layer/`[data-palette]` switch, rule-for-rule identical to the
    partials the old pipeline generated into `framework/css/core/` (only the
    banner comment differs). Same filenames, new `generated/` home
    (gitignored — build output, not source).
  - `dist/tokens.js` + `dist/tokens.d.ts` — the typed token-data module with
    the exact export surface of the old `@vanduo-oss/core` package
    (`DEFAULTS`, `PALETTE_OPTIONS`, `PRIMARY_COLORS`, `NEUTRAL_COLORS`,
    `RADIUS_OPTIONS`, `FONT_OPTIONS`, `THEME_MODES`, `tokens`, plus the
    `RadiusOption` / `ThemeMode` / `Palette` type unions and the
    `ColorDef` / `FontDef` / `PaletteDef` / `ThemeDefaults` interfaces).
  - `dist/tokens.json` — flat resolved variables + customizer metadata,
    matching the old `core/dist/tokens.json` shape.
- Add `scripts/generate-fib-palette.mjs` — the Fibonacci (golden-angle)
  palette generator carried from core, trimmed to write only
  `tokens/primitive/color.fib.tokens.json` (the CSS partials are now owned by
  `build-tokens.mjs`). Kept so the committed palette source stays
  reproducible in-repo.
- Copy the authored CSS tree from `framework/css/` into `css/` — everything
  except `core/colors-fib-base.css` and `core/colors-palette.css` (now
  generated) and `icons/icons-all.css` (deliberately not carried; see
  Non-goals). The entry is renamed `vanduo.css` → `vd3.css` with its two
  generated-color imports pointed at `core/generated/`; every other `@import`
  keeps its path and order.
- Copy `framework/fonts/` → `fonts/` entirely (all 11 font-family
  directories) and the Phosphor icon assets the default bundle needs:
  `icons/phosphor/{LICENSE, regular/, fill/}` only. Copy the framework's
  `THIRD-PARTY-LICENSES` attribution file (Open Color, Phosphor, adapted
  CSS) since the material it covers now ships from this package.
- Add `scripts/build-css.mjs` — adapted from the CSS portion of framework
  `scripts/build.js`: inlines `@import`s from `css/vd3.css`, rewrites asset
  `url()`s for the dist layout, minifies with lightningcss, and emits
  `dist/vd3.css`, `dist/vd3.min.css`, `dist/vd3-core.css`,
  `dist/vd3-core.min.css` (the core variant strips the icon-entry import,
  exactly like the framework's `vanduo-core` bundle) plus `.map` files, and
  copies `fonts/` and the regular+fill Phosphor assets into `dist/`.
- Rewire `package.json` `build` into the full chain (`clean → tokens → css →
  vite → vue-tsc`; see `design.md` for the ordering rationale), set vite
  `build.emptyOutDir: false`, drop `--allow-empty-input` from the stylelint
  gate, extend Prettier globs to `scripts/**/*.mjs`, and merge the framework's
  stylelint rule relaxations so the carried CSS lints unmodified.
- Port the core test suites (`build.test.mjs`, `tokens.test.mjs`,
  `palette-gen.test.mjs`) from `node --test` into vitest specs under
  `tests/`, plus a new spec asserting the generated color partials exist
  after a build and contain the `[data-palette]` switch blocks.
  (`parity.test.mjs` is not ported — it compared core output against the
  framework repo, a cross-repo invariant that is obsolete by design now that
  both halves live in vd3.)
- Update the README build-pipeline/dev section.

No composable is ported or rewritten in this change, so no `framework/js`
source files are involved; the carried sources are `framework/css/**`,
`framework/fonts/**`, `framework/icons/phosphor/**`, `core/tokens/**`,
core `scripts/build.mjs` + `scripts/generate-fib-palette.mjs`, and the CSS
portion of framework `scripts/build.js` (~450 lines, CSS half only).

## Non-goals

- No components, composables, theme API, or class-coverage gate — that is
  the `vd3-carryover` change. The `.` export still exposes only
  `VD3_VERSION`; the token-data module lands in `dist/tokens.js` but is not
  yet re-exported from the package root (carryover wires it up).
- No extra Phosphor icon weights (bold / light / thin / duotone) and no
  `icons-all.css` entry — vd3 ships only the regular + fill weights the
  default bundle references. The docs site serves its own static copy of the
  full set if it needs one.
- No JS bundles from the CSS build script (`vanduo.js` / `.esm` / `.cjs`
  equivalents) and no `build-info.json` — vite owns vd3's JS build, and the
  timestamp/commit build-info file is deliberately dropped to keep outputs
  deterministic.
- No npm publish and no docs-site (vd3-docs) sync — nothing user-facing is
  documented externally yet; the docs site keys off the carryover change.
- No token additions, renames or value changes: sources are copied verbatim
  from core so the generated output stays parity-comparable.
- No changes to the old repos (core, framework, vue, vd2, satellites) — they
  remain strictly read-only.

## Capabilities

### New Capabilities

- `design-tokens`: DTCG token sources, the zero-dependency token generator,
  the generated color partials, the typed token-data module, and the
  `tokens.json` artifact.
- `css-distribution`: the authored CSS tree, the bundled/minified CSS dist
  artifacts with fonts and icons, the icon-weight policy, and the build-chain
  ordering that keeps vite from clobbering them.

### Modified Capabilities

_None — `repo-scaffold` requirements all still hold; this change only adds
on top (the `build` script gains steps but keeps emitting the scaffold's
dist entry points, and every scaffold gate stays green)._

## Impact

- Package: `@vanduo-oss/vd3` stays `0.1.0` (pre-release, unpublished; 0.x
  semver — additive dist artifacts, no breaking surface change). The three
  previously dangling exports (`./css`, `./css/core`, `./tokens.json`) now
  resolve after `pnpm build`.
- API compatibility (vd2 → vd3 migration notes):
  - `@vanduo-oss/framework/css` → `@vanduo-oss/vd3/css`: same rule set (the
    tree is carried, generated partials rule-identical); the only breaks are
    the bundle filename (`vd3.min.css`) and the icon policy — consumers of
    weights other than regular/fill must self-host those weights.
  - `@vanduo-oss/core` → `@vanduo-oss/vd3`: the token-data export surface is
    carried 1:1 (`DEFAULTS`, `PALETTE_OPTIONS`, `PRIMARY_COLORS`,
    `NEUTRAL_COLORS`, `RADIUS_OPTIONS`, `FONT_OPTIONS`, `THEME_MODES`,
    `tokens`, type unions) into `dist/tokens.js`/`dist/tokens.d.ts`; root
    re-export lands in `vd3-carryover`. `tokens.json` keeps its shape, so
    Figma/tooling consumers migrate by changing only the package specifier.
  - CSS custom properties (`--vd-*`), class prefixes (`vd-*`) and the
    `data-palette`/`data-primary`/`data-neutral`/… theming contract are
    unchanged.
- Build: `pnpm build` now runs `clean → build-tokens → build-css → vite →
  vue-tsc`; dist grows by ~4 CSS bundles + maps, `tokens.{js,d.ts,json}`,
  `fonts/` (~660 KB) and `icons/phosphor` regular+fill (~7.7 MB).
- Tooling: stylelint now lints a real CSS tree (framework rule relaxations
  merged; `css/core/generated/**` stays excluded as build output); vitest
  gains 4 spec files; no new dependencies (lightningcss was already a
  devDependency).
