## ADDED Requirements

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
