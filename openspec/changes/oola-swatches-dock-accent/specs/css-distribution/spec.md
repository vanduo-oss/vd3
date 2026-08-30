# css-distribution

## ADDED Requirements

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
