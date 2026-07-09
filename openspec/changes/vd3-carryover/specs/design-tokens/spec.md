## MODIFIED Requirements

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
