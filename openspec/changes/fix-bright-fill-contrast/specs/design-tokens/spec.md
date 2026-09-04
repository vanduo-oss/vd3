# design-tokens

## ADDED Requirements

### Requirement: on-fill-foreground-tokens

The semantic token source and `css/core/tokens.css` MUST define three on-fill
foregrounds:

- `--vd-text-on-primary` — ink on a rest primary fill
- `--vd-text-on-primary-hover` — ink on a primary-dark / hover fill
- `--vd-text-on-status` — ink on secondary, success, warning, error, and info
  fills

`:root` defaults MUST be black / white / black respectively (matching default
indigo: rest step 5 fails 4.5:1 against white; hover step 7 passes). Hue and
theme overrides MUST be token-driven (`html[data-primary="…"]` and
`[data-theme="dark"]`) so components do not special-case hues.

Bright primaries (yellow, orange, lime, and any other rest fill that fails
4.5:1 against white) MUST resolve `--vd-text-on-primary` to black or
near-black in both light and dark. Dark theme MUST NOT reset a bright fill's
on-primary ink to white. Light `data-primary="black"` MAY use white ink.
`--vd-text-inverse` MUST remain the dark-surface inverse token and MUST NOT
be the on-fill contract.

Consumers MAY override the three custom properties for custom primaries.

#### Scenario: default indigo rest uses dark ink

- **GIVEN** `:root` with no `data-primary` (indigo)
- **WHEN** `--vd-text-on-primary` is resolved
- **THEN** it is `--vd-color-black` and contrast against `--vd-color-primary`
  is at least 4.5:1

#### Scenario: yellow stays dark-ink in dark theme

- **GIVEN** `html[data-primary="yellow"][data-theme="dark"]`
- **WHEN** `--vd-text-on-primary` is resolved
- **THEN** it is black or near-black, not `--vd-color-white`

#### Scenario: status fills share one dark-ink token

- **GIVEN** the shipped success, warning, error, info, and secondary fills
- **WHEN** `--vd-text-on-status` is resolved
- **THEN** it is black or near-black and each pair meets ≥4.5:1
