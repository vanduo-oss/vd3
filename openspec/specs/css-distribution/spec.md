# css-distribution Specification

## Purpose
Authored CSS tree, lightningcss bundles, and class-level distribution contract for `@vanduo-oss/vd3`.

## Requirements

### Requirement: authored-css-tree

The repo MUST carry the authored CSS tree from the old framework repo under
`css/`, preserving every partial's path — and its content except where
explicitly noted — with four deliberate exceptions: `core/colors-fib-base.css`
and `core/colors-palette.css` are not carried (they are generated into
`css/core/generated/`); `icons/icons-all.css` is not carried (vd3 ships only
the default icon weights); and `effects/glass.css` is carried at its original
path but with its `.vd-glass::after` noise `data:image/svg+xml` URI
restructured — per the `glass-noise-fragment-integrity` requirement — so
lightningcss's `url()` rebasing cannot corrupt the SVG's internal filter
reference in the built bundle (the rendered texture is unchanged; only the
authored encoding differs from the donor). The entry SHALL be `css/vd3.css`
(renamed from `vanduo.css`), identical to the old entry except that the two
generated-color `@import`s point at `core/generated/`; every other `@import`
MUST keep its original path and order so the cascade is unchanged.

#### Scenario: entry import order preserved

- **GIVEN** `css/vd3.css` and the old `framework/css/vanduo.css`
- **WHEN** their `@import` lists are compared
- **THEN** they are identical except that `core/colors-fib-base.css` and
  `core/colors-palette.css` read `core/generated/colors-fib-base.css` and
  `core/generated/colors-palette.css`

#### Scenario: authored partials lint clean

- **GIVEN** the carried `css/**` tree
- **WHEN** `pnpm stylelint` runs (no `--allow-empty-input`)
- **THEN** it exits 0, with `css/core/generated/**` excluded as build output

### Requirement: css-bundles

`scripts/build-css.mjs` MUST bundle `css/vd3.css` (inlining all `@import`s
in order and rewriting asset `url()`s for the dist layout) and emit, via
lightningcss, both development and production variants: `dist/vd3.css`,
`dist/vd3.min.css`, `dist/vd3-core.css`, and `dist/vd3-core.min.css`, each
with a source map and a leading `/*! @vanduo-oss/vd3 v<version> | <mode> */`
banner containing no timestamp or commit hash (deterministic output). The
core variant SHALL strip the icon-entry `@import` from the entry source
before bundling — the same no-icons rule set as the old `vanduo-core`
bundle. These files back the package's `./css` and `./css/core` exports.

#### Scenario: build emits all four bundles

- **GIVEN** a completed token build
- **WHEN** `node scripts/build-css.mjs` runs
- **THEN** `dist/` contains `vd3.css`, `vd3.min.css`, `vd3-core.css`, and
  `vd3-core.min.css`, each non-empty with a matching `.map` file

#### Scenario: core variant has no icon rules

- **GIVEN** the emitted `dist/vd3-core.min.css`
- **WHEN** it is searched for the Phosphor `@font-face` sources
- **THEN** no `icons/phosphor` reference appears, while `dist/vd3.min.css`
  contains them

### Requirement: bundled-assets

The CSS build MUST copy `fonts/` (all font families carried from the old
framework repo) and the Phosphor icon weights referenced by the bundled
icon entry — regular and fill, plus the Phosphor `LICENSE` file — into
`dist/` at paths matching the rewritten `url()` references, so
`dist/vd3.min.css` resolves every non-data `url()` relative to `dist/`.
Third-party attribution (`THIRD-PARTY-LICENSES`) SHALL ship with the
package.

#### Scenario: asset urls resolve from dist

- **GIVEN** the emitted `dist/vd3.min.css`
- **WHEN** every non-data `url()` reference is resolved relative to `dist/`
- **THEN** each referenced file exists (fonts under `dist/fonts/…`, icons
  under `dist/icons/phosphor/{regular,fill}/…`)

### Requirement: icon-weight-policy

vd3 SHALL ship only the Phosphor regular and fill weights (the
`css/icons/icons.css` defaults). The bold, light, thin, and duotone weights
and the `icons-all.css` aggregate entry MUST NOT be present in the repo or
in `dist/`; consumers needing other weights self-host them (the docs site
serves its own static copy).

#### Scenario: only default weights ship

- **GIVEN** a completed build
- **WHEN** `icons/phosphor/` and `dist/icons/phosphor/` are listed
- **THEN** each contains exactly `LICENSE`, `regular/`, and `fill/`

### Requirement: build-chain-ordering

The `pnpm build` script MUST run, in order: `scripts/clean-dist.mjs` (reset
`dist/`), `scripts/build-tokens.mjs`, `scripts/build-css.mjs`, `vite build`,
then `vue-tsc -p tsconfig.build.json`. `vite.config.ts` SHALL set
`build.emptyOutDir: false` so the vite step cannot clobber the token and CSS
artifacts emitted before it. After a full build, `dist/` MUST contain every
artifact declared in the exports map: `index.js`, `index.cjs`, `index.d.ts`,
`vd3.min.css`, `vd3-core.min.css`, and `tokens.json` (plus `tokens.js`,
`tokens.d.ts`, dev CSS variants, maps, fonts, and icons).

#### Scenario: full build produces every declared export target

- **GIVEN** a clean checkout with dependencies installed
- **WHEN** `pnpm build` runs
- **THEN** it exits 0 and `dist/` contains `index.js`, `index.cjs`,
  `index.d.ts`, `vd3.css`, `vd3.min.css`, `vd3-core.css`,
  `vd3-core.min.css`, `tokens.js`, `tokens.d.ts`, and `tokens.json`

#### Scenario: vite step preserves earlier artifacts

- **GIVEN** the build chain has emitted tokens and CSS into `dist/`
- **WHEN** the `vite build` step runs
- **THEN** `dist/tokens.js`, `dist/tokens.json`, and the CSS bundles still
  exist unchanged afterwards

### Requirement: glass-noise-fragment-integrity

The `.vd-glass::after` frosted-glass noise texture in `css/effects/glass.css`
is an inline `data:image/svg+xml` URI whose SVG references its own inline
`<filter id="n">` (a `feTurbulence` fractalNoise) to grain a `<rect>`. The
authored partial MUST be structured so that after `scripts/build-css.mjs` runs
lightningcss, the emitted `dist/vd3.css` and `dist/vd3.min.css` keep a
syntactically valid data-URI whose internal filter reference still resolves to
that inline filter. Specifically, the built glass-noise data-URI MUST NOT
contain a path-rebased fragment (`effects/%23n`, `effects/#n`, or any
`<dir>/#n` form) and MUST NOT contain nested-quote corruption of the SVG
attribute value; its internal reference MUST remain an in-document fragment
(`url(#n)` / `url(%23n)`) pointing at the URI's own `<filter id="n">`, so the
fractalNoise texture actually renders. The `feTurbulence` parameters, SVG
dimensions, and `--vd-glass-noise-opacity` mapping MUST be preserved so the
texture is visually equivalent to the donor's intended output. This corrects
a carried bug from the framework's own bundle, where lightningcss rebased the
internal reference to `filter='url('effects/%23n')'` and silently dropped the
filter.

#### Scenario: built bundle keeps a valid internal filter reference

- **GIVEN** a completed `pnpm build`
- **WHEN** the `.vd-glass::after` noise data-URI is read from `dist/vd3.css`
  and `dist/vd3.min.css`
- **THEN** neither contains `effects/%23n` (or `effects/#n`) nor a
  nested-quote-broken `filter='url('…')'`, and the URI's `<rect>` filter
  reference resolves to the inline `<filter id="n">` (an in-document
  `#n` / `%23n` fragment)

#### Scenario: rendered texture is preserved

- **GIVEN** the carried `css/effects/glass.css` and the donor
  `framework/css/effects/glass.css`
- **WHEN** the two `.vd-glass::after` noise textures are compared
- **THEN** the `feTurbulence` fractalNoise parameters, SVG dimensions, and
  the `--vd-glass-noise-opacity` mapping are equivalent — only the encoding
  that survives lightningcss rebasing differs

#### Scenario: rebase artifact does not regress

- **GIVEN** the emitted `dist/vd3.min.css`
- **WHEN** it is searched for a lightningcss-rebased glass-noise fragment
  (an `<dir>/#n` / `<dir>/%23n` reference inside the data-URI)
- **THEN** no such artifact is present

### Requirement: swatch-fan-classes

`css/components/theme-customizer.css` MUST carry the swatches-variant fan
alongside the existing panel rules: `.vd-theme-customizer-fan` (fixed-position
hinge root, `fan-up` / `fan-down` / `fan-left` / `fan-right` axis modifiers,
`is-open` state) and `.tc-fan-item` blades with `.tc-fan-label` and
`.tc-fan-swatch` children.

Blades MUST hinge at their own left-center (`transform-origin`) and MUST take
their pose from the component-supplied `--fan-transform-open` /
`--fan-transform-closed` custom properties, with `--i` staggering the
transition so the fan unfolds outward and folds inward. `.tc-fan-swatch` MUST
paint from `--vd-swatch-color`, matching the panel's swatch contract.

Tunables MUST be exposed as `--vd-customizer-fan-*` custom properties on
`:root` so consumers can retheme the fan without overriding selectors.

The block MUST include a `prefers-reduced-motion: reduce` branch that drops the
unfold transition, and a small-viewport branch that shrinks blade metrics.

#### Scenario: fan classes survive the bundle

- **GIVEN** the built `dist/vd3.min.css`
- **WHEN** it is searched
- **THEN** `.vd-theme-customizer-fan`, `.tc-fan-item`, `.tc-fan-label`, and
  `.tc-fan-swatch` are all present

### Requirement: dock-accent-tint-class

`css/components/dock.css` MUST carry `.vd-dock-tint-accent`, which — when
combined with a `.vd-dock-tint-{hue}` class on a dark dock — replaces the
tinted surface with constant ink and clears the tint background image, while
leaving `--vd-dock-tint` set by the hue class.

The accent rule MUST out-specify the surface rule
(`.vd-dock.vd-dock-dark[class*="vd-dock-tint-"]`) on selector weight alone —
no `!important` and no reliance on source order.

#### Scenario: accent beats surface without important

- **GIVEN** `css/components/dock.css`
- **WHEN** the accent rule is inspected
- **THEN** it matches `.vd-dock.vd-dock-dark.vd-dock-tint-accent[class*="vd-dock-tint-"]`
  and contains no `!important`

### Requirement: dock-tooltip-variant-class

`css/components/tooltips.css` MUST carry `.vd-tooltip-dock` beside the existing
`light` / `dark` / `glass` variants: a frosted chrome tooltip for icon-only dock
controls, with all four arrow rules
(`.vd-tooltip-{top|bottom|left|right}::before` and the matching
`[data-placement]` forms) and a light-scheme treatment that keeps the tip
readable against light page content behind an ink dock. The light treatment MUST
cover both the explicit `[data-theme="light"]` opt-in and the
`prefers-color-scheme: light` default.

#### Scenario: dock tooltip variant is bundled

- **GIVEN** the built `dist/vd3.min.css`
- **WHEN** it is searched
- **THEN** `.vd-tooltip-dock` is present with arrow rules for all four
  placements

### Requirement: seemore-glass-fibonacci-steps

Layer 5 `effects/glass.css` MUST define Fibonacci strength-step modifiers
`.vd-glass-1`, `.vd-glass-2`, `.vd-glass-3`, `.vd-glass-5`, `.vd-glass-8`,
`.vd-glass-13`, `.vd-glass-21`, `.vd-glass-34`, `.vd-glass-55`, and
`.vd-glass-89`. Each step MUST set a coherent bundle of
`--vd-glass-blur`, `--vd-glass-bg-opacity` (tint), `--vd-glass-border-alpha`
(edge), and related saturate / noise / shadow tokens so blur, tint, and edge
scale together. Base `.vd-glass` / `.vd-glass-md` MUST resolve to step 5.
Legacy `.vd-glass-sm`, `.vd-glass-lg`, and `.vd-glass-xl` MUST remain as
aliases for steps 3, 8, and 13 respectively.

Blur for steps 1–21 MUST follow the Seemore table (step 1 → 2px … step 21 →
20px GPU soft-cap). Steps 34 / 55 / 89 MAY raise blur modestly (≤26px) while
escalating tint, border, saturate, grain, and shadow more aggressively; step
89 is the marketing extreme (~100 ceiling; fib 144 omitted). Navbar scrolled
frost SHOULD remain at the step-21 soft-cap. Scroll-activated glass
(`[data-glass-scroll]`) MUST NOT transition `backdrop-filter`; inactive state
may disable blur immediately while animating background, border, shadow, and
overlay opacity only. `prefers-reduced-transparency: reduce` MUST disable
backdrop blur and raise opacity to a near-opaque solid using `--vd-bg-primary`
(or equivalent) for all fib steps and aliases. An optional
`.vd-glass-adaptive` modifier MAY tint from theme primary / light-dark
neutrals without changing the fib step.

#### Scenario: fib step classes ship in the bundle

- **GIVEN** a completed CSS build
- **WHEN** `dist/vd3.css` is searched for `.vd-glass-1` through `.vd-glass-89`
- **THEN** each Fibonacci step selector is present

#### Scenario: base glass is step 5

- **GIVEN** `.vd-glass` / `.vd-glass-md` without a size override
- **WHEN** computed `--vd-glass-blur` defaults are read from tokens / glass.css
- **THEN** the default blur is `8px` (Fibonacci step 5)

#### Scenario: legacy aliases map to fib steps

- **GIVEN** `.vd-glass-sm`, `.vd-glass-lg`, `.vd-glass-xl`
- **WHEN** their custom properties are compared to steps 3 / 8 / 13
- **THEN** each alias matches its corresponding fib step bundle

#### Scenario: scroll glass does not transition backdrop-filter

- **GIVEN** `[data-glass-scroll]` rules in `effects/glass.css`
- **WHEN** the `transition` declaration is inspected
- **THEN** it does not list `backdrop-filter` or `-webkit-backdrop-filter`

### Requirement: decorative-surfaces-effect-css

Layer 5 of the authored CSS tree MUST import `effects/surfaces.css`. That
file MUST define base `.vd-surface` plus variant classes
`.vd-surface-mesh`, `.vd-surface-stripe`, `.vd-surface-noise`,
`.vd-surface-aurora`, `.vd-surface-dots`, and `.vd-surface-grid`, and
Fibonacci intensity modifiers `.vd-surface-3`, `.vd-surface-5`, and
`.vd-surface-8` that adjust pattern-layer opacity/contrast (not blur).

#### Scenario: Layer 5 import

- **GIVEN** `css/vd3.css`
- **WHEN** Layer 5 Effects imports are listed
- **THEN** `effects/surfaces.css` is included after `effects/glass.css`

#### Scenario: surface variants present

- **GIVEN** the built `vd3.css`
- **WHEN** searched for surface variant selectors
- **THEN** mesh, stripe, noise, aurora, dots, and grid classes are defined

### Requirement: liquid-gradient-effect-css

Layer 5 of the authored CSS tree MUST import
`effects/liquid-gradient.css`. That file MUST define:

- Host `.vd-liquid-gradient` with default `--vd-liquid-*` customization
  variables (speed, intensity, grain, distort, gradient-size,
  primary-weight, neutral-weight, alpha) matching Labs defaults.
- Canvas child `.vd-liquid-gradient-canvas` filling the host.
- Active visibility helper `.vd-liquid-gradient-active`.
- Optional layout modifiers `.vd-liquid-gradient-fixed` (viewport fill)
  and `.vd-liquid-gradient-fill` (absolute inset fill of a positioned
  parent).
- Host `pointer-events: none` so the decorative layer does not intercept
  clicks.

MIT attribution for the inspired CodePen MUST appear in the CSS/JS headers
and in `THIRD-PARTY-LICENSES`.

#### Scenario: Layer 5 import

- **GIVEN** `css/vd3.css`
- **WHEN** Layer 5 Effects imports are listed
- **THEN** `effects/liquid-gradient.css` is included

#### Scenario: customization tokens present

- **GIVEN** the built `vd3.min.css`
- **WHEN** searched for `--vd-liquid-speed` and related tokens
- **THEN** each documented `--vd-liquid-*` token is defined

#### Scenario: third-party notice

- **GIVEN** `THIRD-PARTY-LICENSES`
- **WHEN** read
- **THEN** it lists Cameron Knight’s Interactive Liquid Gradient CodePen
  as MIT with the CodePen URL and adapted-in paths

### Requirement: native-select-chevron-longhands

Every non-multi native select caret rule that sets a chevron
`background-image` (base, `:focus`, `:disabled`, and
`[data-theme="dark"]` variants for `select.vd-input`, bare `select`,
`.select-input`, `.custom-select-input`, and `.custom-select-button`)
MUST also set `background-repeat: no-repeat`,
`background-position: right 0.75rem center`, and
`background-size` matching the control size (default
`var(--vd-select-arrow-size) 12px`). Multi-select rules that clear the
caret with `background-image: none` MUST keep no caret image and are
exempt from the longhand co-declaration requirement. This MUST hold in
authored `css/components/forms.css` and in the built `dist/vd3.min.css`
/ `dist/vd3-core.min.css` bundles so a consumer `background` shorthand
cannot leave a tiling chevron when a later state rule re-applies only
the image.

#### Scenario: Focus re-applies caret longhands

- **GIVEN** the authored select `:focus` rule that swaps the chevron
  `background-image`
- **WHEN** the rule is inspected
- **THEN** it MUST also declare `background-repeat: no-repeat`,
  `background-position: right 0.75rem center`, and the default caret
  `background-size`

#### Scenario: Dark theme caret states re-apply longhands

- **GIVEN** `[data-theme="dark"]` select / custom-select-button rules
  (default, `:focus`, and `:disabled`) that set a chevron
  `background-image`
- **WHEN** each rule is inspected
- **THEN** each MUST also declare `background-repeat: no-repeat`,
  `background-position: right 0.75rem center`, and the default caret
  `background-size`

#### Scenario: Disabled caret keeps longhands

- **GIVEN** the authored select `:disabled` rule that sets a muted
  chevron `background-image`
- **WHEN** the rule is inspected
- **THEN** it MUST also declare `background-repeat: no-repeat`,
  `background-position: right 0.75rem center`, and the default caret
  `background-size`

#### Scenario: Built bundles keep longhands with caret images

- **GIVEN** a completed CSS build
- **WHEN** `dist/vd3.min.css` is searched for select caret state
  overrides that embed a chevron SVG `background-image`
- **THEN** those overrides MUST also carry `background-repeat:no-repeat`
  (minified form) alongside position and size so the tiling regression
  cannot ship
