# components

## MODIFIED Requirements

### Requirement: vd-button-ink-variant

vd3 SHALL provide a `.vd-btn-ink` button variant: a transparent fill with a
single fat (2px) primary outline at rest, and a scheme-aware hover fill
(black in light, primary in dark). `VdButton` SHALL accept `variant="ink"`
and emit that class. The variant MUST NOT alter `.vd-btn-outline*`,
`.vd-btn-ghost*`, or `.vd-btn-ring` rendering.

Light-scheme hover is an intentional white-on-black surface and MUST use
`--vd-color-white` (not `--vd-text-on-primary`, which is on-fill ink and is
black on the default indigo rest fill). Dark-scheme hover MUST use
`--vd-text-on-primary` on the solid primary fill.

#### Scenario: VdButton exposes the variant

- **GIVEN** `VdButton` mounted with `variant="ink"`
- **WHEN** the rendered root element's classes are inspected
- **THEN** `vd-btn` and `vd-btn-ink` SHALL be present
- **AND** `vd-btn-outline` and `vd-btn-ring` SHALL be absent unless those
  treatments were also requested
- **AND** the class SHALL be resolvable by `scripts/check-class-coverage.mjs`
  against the built stylesheet

#### Scenario: Resting ink is a fat single stroke

- **GIVEN** an element with `class="vd-btn vd-btn-ink"`
- **WHEN** it is rendered at rest
- **THEN** the fill SHALL be transparent
- **AND** the border SHALL be a 2px solid primary stroke on the button's
  own border box (not a detached `.vd-btn-ring` `::before`)
- **AND** the label colour SHALL be primary

#### Scenario: Hover fill follows the colour scheme

- **GIVEN** an enabled `.vd-btn-ink` in a light scheme
- **WHEN** it is hovered
- **THEN** the fill and border SHALL be `--vd-color-black` and the label
  SHALL use `--vd-color-white`
- **AND GIVEN** the same control in a dark scheme (`[data-theme="dark"]`,
  or `prefers-color-scheme: dark` when `data-theme` is unset)
- **THEN** the fill and border SHALL be `--vd-color-primary` and the label
  SHALL use `--vd-text-on-primary`

#### Scenario: Existing outline, ghost, and ring treatments stay put

- **GIVEN** the stylesheet before and after this change
- **WHEN** a `.vd-btn-outline`, `.vd-btn-ghost`, or `.vd-btn-ring` button
  is rendered
- **THEN** its selectors and hover behaviour SHALL be unchanged
- **AND** ink MAY still compose with `.vd-btn-ring` when both classes are
  present

#### Scenario: A visually-hidden child does not stretch the label box

- **GIVEN** a `.vd-btn` whose accessible name includes a
  `.vd-visually-hidden` child (for example a new-tab hint)
- **WHEN** it is laid out
- **THEN** that child SHALL be taken out of flow and SHALL NOT add a
  sibling gap from `.vd-btn > * + *`
- **AND** the visible label SHALL remain vertically centered in the
  control
