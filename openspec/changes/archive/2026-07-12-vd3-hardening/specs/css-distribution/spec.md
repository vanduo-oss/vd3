## MODIFIED Requirements

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

## ADDED Requirements

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
