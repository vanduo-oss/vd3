## ADDED Requirements

### Requirement: token-value-sync-gate

The test suite MUST include a value-sync gate that guards the two independent
copies of the `--vd-*` custom properties against drift: the hand-authored
`css/core/tokens.css` (the values that ship in `dist/vd3.min.css`) and the
DTCG-derived token data in `src/theme/generated/tokens.data.ts` (byte-identical
to `dist/tokens.json`'s `cssVariables`). The gate SHALL be dependency-free
(regex parsing only), run as part of `pnpm test`, and:

- Parse every `--vd-<name>: <value>;` declaration from the `:root` default layer
  of the shipped CSS — `css/core/tokens.css` plus the generated
  `colors-fib-base.css` and `colors-palette.css` partials — and resolve each
  `var(--vd-x)` chain down to a literal using that combined map.
- For every `--vd-*` present in BOTH the resolved CSS map and the DTCG token
  data, assert the two literals are equal after whitespace/case normalization.
- Treat a `--vd-*` present in `css/core/tokens.css` but ABSENT from the DTCG
  token data as intentionally CSS-only and exempt it from the value comparison,
  BUT require it to match a small, documented CSS-only allowlist so a new,
  unexplained CSS-only property still fails the gate.

The gate SHALL NOT require completeness in either direction (it does not demand
every DTCG token appear in the CSS, nor every CSS token have a DTCG source); it
asserts agreement on the intersection plus the CSS-only allowlist tripwire. It
MUST change no token value, no `--vd-*` custom property, and no `VD3_VERSION`.

#### Scenario: overlapping tokens agree

- **GIVEN** the shipped `css/core/tokens.css` (with the generated color
  partials) and the DTCG token data in `src/theme/generated/tokens.data.ts`
- **WHEN** the sync gate resolves every `--vd-*` in `tokens.css` to a literal
  and compares each property that exists in both sources
- **THEN** every overlapping property's resolved CSS literal equals the DTCG
  literal (whitespace/case normalized), and the gate fails listing any mismatch

#### Scenario: CSS-only tokens are allow-listed, not ignored

- **GIVEN** the `--vd-*` properties present in `css/core/tokens.css` but with no
  source in `tokens/*.json` (e.g. `--vd-glass-*`, `--vd-transition-*`,
  `--vd-z-*`, `--vd-font-family-*`, the derived `-rgb` / `-alpha-*` color
  helpers, and the extra semantic aliases/states)
- **WHEN** the gate checks each against the documented CSS-only allowlist
- **THEN** every such property matches an allowlist entry, and a new CSS-only
  `--vd-*` that matches none of them fails the gate

#### Scenario: gate cannot pass vacuously

- **GIVEN** the sync gate's parse of both sources
- **WHEN** it counts the `--vd-*` surface it extracted
- **THEN** it asserts a meaningful overlap exists and that every overlapping
  token resolved to a literal (no dangling `var()`), so a broken parse or a
  missing generated partial fails the gate instead of passing silently
