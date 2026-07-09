# design-tokens Specification

## Purpose
TBD - created by archiving change vd3-token-css-foundation. Update Purpose after archive.
## Requirements
### Requirement: dtcg-token-sources

The repo MUST hold the DTCG token sources in `tokens/`, carried verbatim from
the old core repo: `primitive/color.tokens.json` (Open Color palette),
`primitive/color.fib.tokens.json` (generated Fibonacci palette, committed),
`primitive/scale.tokens.json`, `semantic/color.tokens.json`, and
`customizer/options.json`. Every DTCG leaf SHALL carry a non-empty `$type`
and `$value`, every `{dot.path}` token reference SHALL resolve to an existing
token, and every customizer default SHALL reference a declared option.

#### Scenario: token sources are well-formed

- **GIVEN** the committed files under `tokens/`
- **WHEN** the DTCG integrity spec walks every token leaf
- **THEN** each leaf has a non-empty `$type` and `$value`, and no token
  reference dangles

#### Scenario: customizer defaults are consistent

- **GIVEN** `tokens/customizer/options.json`
- **WHEN** its `defaults` block is checked against `palettes`, `primary`,
  `neutral`, `radius`, `fonts`, and `themeModes`
- **THEN** every default names an existing option, and the palette list
  includes both `open-color` and `fibonacci`

### Requirement: token-build-generator

`scripts/build-tokens.mjs` MUST generate all token-derived artifacts using
only `node:` built-ins (zero npm dependencies), and its output MUST be
deterministic — running the generator twice SHALL produce byte-identical
files. Its artifact set is: `css/core/generated/colors-fib-base.css`,
`css/core/generated/colors-palette.css`, `dist/tokens.json`, and
`src/theme/generated/tokens.data.ts` (it SHALL NOT emit `dist/tokens.js` or
`dist/tokens.d.ts` — the typed data ships inlined in the lib bundle). It
SHALL create missing output directories (`dist/`, `css/core/generated/`,
`src/theme/generated/`) itself so it can run first on a clean checkout.

#### Scenario: deterministic emit

- **GIVEN** a checkout where `node scripts/build-tokens.mjs` has run once
- **WHEN** the generator runs again
- **THEN** `dist/tokens.json`, `src/theme/generated/tokens.data.ts`,
  `css/core/generated/colors-fib-base.css`, and
  `css/core/generated/colors-palette.css` are byte-identical to the first run

#### Scenario: clean checkout bootstrap

- **GIVEN** a clean checkout with no `dist/`, no `css/core/generated/`, and
  no `src/theme/generated/`
- **WHEN** `node scripts/build-tokens.mjs` runs
- **THEN** it exits 0 and all four artifacts exist and are non-empty

#### Scenario: legacy dist token module is gone

- **GIVEN** a completed full `pnpm build`
- **WHEN** `dist/` is listed
- **THEN** neither `tokens.js` nor `tokens.d.ts` exists (only `tokens.json`
  remains as a data artifact)

### Requirement: generated-color-partials

The generator MUST emit `css/core/generated/colors-fib-base.css` (raw
palette-namespaced `--vd-oc-*` / `--vd-fib-*` scales, literal hex values)
and `css/core/generated/colors-palette.css` (the active `--vd-*` layer
defaulting to Open Color, plus `[data-palette="fibonacci"]` and
`[data-palette="open-color"]` switch blocks). The emitted rule bodies SHALL
be byte-identical to the partials the old pipeline generated into
`framework/css/core/` — only the banner comment may differ. The files are
build output: they SHALL be gitignored and SHALL NOT be edited by hand.
Every custom property emitted MUST use the `--vd-` prefix, and every `var()`
reference in the pair of files MUST resolve to a property defined within
them.

#### Scenario: palette switch blocks exist

- **GIVEN** a completed token build
- **WHEN** `css/core/generated/colors-palette.css` is read
- **THEN** it contains a `[data-palette="fibonacci"]` block rebinding
  `--vd-primary-5` to `var(--vd-fib-primary-5)` and a
  `[data-palette="open-color"]` block rebinding it to
  `var(--vd-oc-primary-5)`, while the `:root` active layer defaults to the
  Open Color scale

#### Scenario: golden accent track is Fibonacci-only

- **GIVEN** the generated partials
- **WHEN** the golden accent track (`--vd-golden-*`) is inspected
- **THEN** raw values exist only in the `--vd-fib-*` namespace and the active
  layer binds `--vd-golden-*` to `var(--vd-fib-golden-*)`

#### Scenario: rule parity with the old framework partials

- **GIVEN** the generated partials and the old
  `framework/css/core/{colors-fib-base,colors-palette}.css`
- **WHEN** both are compared ignoring the leading banner comment
- **THEN** the remaining content is byte-identical

### Requirement: token-data-module

The generator MUST emit `src/theme/generated/tokens.data.ts` — a
self-contained, gitignored TypeScript module carrying the exact token-data
surface of the old `@vanduo-oss/core` package: `PALETTE_OPTIONS`,
`PRIMARY_COLORS`, `NEUTRAL_COLORS`, `RADIUS_OPTIONS`, `FONT_OPTIONS`,
`THEME_MODES`, `DEFAULTS`, and `tokens`, typed via the `ColorDef`,
`FontDef`, `PaletteDef`, and `ThemeDefaults` interfaces and the
`RadiusOption`, `ThemeMode`, and `Palette` unions derived from the
customizer options. `DEFAULTS.PALETTE` SHALL be `open-color`, and the
`tokens` map SHALL contain only fully-resolved literal values (no `{ref}`
placeholders), with active-scale entries equal to their Open Color literals
for shared families. The module is consumed by `useTheme` and re-exported
from the package root, which SHALL be the only supported JS import surface
for token data (excluded from ESLint/Prettier as generated output, included
in typecheck as source).

#### Scenario: export surface parity

- **GIVEN** a completed token build
- **WHEN** `src/theme/generated/tokens.data.ts` is imported
- **THEN** all eight named exports exist, `PALETTE_OPTIONS` includes
  `open-color` and `fibonacci`, `DEFAULTS` has the seven documented keys with
  `PALETTE === "open-color"`, and `tokens` is a non-empty object

#### Scenario: active scale resolves to Open Color literals

- **GIVEN** the `tokens` map from the generated module
- **WHEN** `--vd-primary-5`, `--vd-oc-primary-5`, `--vd-fib-primary-5`, and
  `--vd-color-primary` are compared
- **THEN** the active and semantic entries equal the Open Color literal and
  the Fibonacci literal differs from it

#### Scenario: data reaches consumers through the package root

- **GIVEN** the built package
- **WHEN** `DEFAULTS` and `tokens` are imported from the package root
- **THEN** they match the generated module's values without any deep
  `dist/` import

### Requirement: tokens-json-artifact

The generator MUST emit `dist/tokens.json` matching the old
`core/dist/tokens.json` shape: a top-level `$description`, a `cssVariables`
map of every emitted custom property to its fully-resolved literal value,
and a `customizer` block mirroring `tokens/customizer/options.json`. This
file backs the package's `./tokens.json` export.

#### Scenario: resolved flat token map

- **GIVEN** a completed token build
- **WHEN** `dist/tokens.json` is parsed
- **THEN** `cssVariables` contains no unresolved `{ref}` values and
  `customizer` carries the palettes, primary/neutral swatches, radius, fonts,
  themeModes, and defaults

### Requirement: fibonacci-palette-generator

The repo MUST carry the Fibonacci palette generator as
`scripts/generate-fib-palette.mjs`, trimmed to write only
`tokens/primitive/color.fib.tokens.json`. Regenerating SHALL reproduce the
committed file byte-identically, every shade SHALL be a valid in-gamut
6-digit sRGB hex, per-family lightness SHALL decrease monotonically from
step 0 to step 9, and step-9/step-0 shades of the core families SHALL keep
at least 4.5:1 WCAG contrast against white/black respectively.

#### Scenario: committed palette is reproducible

- **GIVEN** the committed `tokens/primitive/color.fib.tokens.json`
- **WHEN** `node scripts/generate-fib-palette.mjs` runs
- **THEN** the file's content is unchanged

#### Scenario: scales stay well-shaped

- **GIVEN** the committed Fibonacci palette
- **WHEN** the palette-contract spec checks every family
- **THEN** each Open Color family has a 0–9 Fibonacci counterpart plus the
  golden accent track, all values are 6-digit hex, and lightness decreases
  monotonically per scale

