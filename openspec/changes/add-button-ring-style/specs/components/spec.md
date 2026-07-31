# components

## ADDED Requirements

### Requirement: vd-button-ring-modifier

vd3 SHALL provide an opt-in `.vd-btn-ring` modifier that draws a concentric outer stroke
separated from the button's border box by a transparent gap, and `VdButton` SHALL expose it
through a `ring?: boolean` prop defaulting to `false`. The modifier MUST compose with every
existing button variant, size and state, and MUST NOT alter the rendering of any button that
does not carry it.

#### Scenario: The modifier draws a detached ring

- **GIVEN** an element with `class="vd-btn vd-btn-primary vd-btn-ring"`
- **WHEN** it is rendered
- **THEN** a `::before` pseudo-element SHALL paint a stroke of `--vd-btn-ring-width` outside the
  button's border box, offset by `--vd-btn-ring-gap`
- **AND** the gap SHALL be transparent, so the surface behind the button shows through it
- **AND** the pseudo-element SHALL be `pointer-events: none`, so it never intercepts a click

#### Scenario: The ring is concentric with the button at every size

- **GIVEN** a ring button at each of `sm`, the default size, and `lg`
- **WHEN** the ring's corner radius is compared with the button's
- **THEN** the ring radius SHALL equal the button's radius plus the ring's total offset, so the
  two curves stay concentric
- **AND** the gap SHALL follow the Fibonacci scale already used by the button padding

#### Scenario: The stroke holds its weight under a rescaled root font

- **GIVEN** a consumer whose root font size is below 16px
- **WHEN** a ring button is rendered
- **THEN** the ring stroke SHALL keep its full weight rather than collapsing to a hairline,
  because the stroke is specified in pixels like `--vd-border-width` and not in `rem`
- **AND** the gap SHALL still scale with the consumer's type scale, since it is spacing

#### Scenario: The base button is unchanged

- **GIVEN** the stylesheet before and after this change
- **WHEN** any button without `.vd-btn-ring` is rendered
- **THEN** its computed styles SHALL be identical to before
- **AND** no pre-existing selector, custom property or token SHALL be modified, renamed or
  revalued

#### Scenario: VdButton exposes the modifier

- **GIVEN** `VdButton` mounted with `:ring="true"`
- **WHEN** the rendered root element's classes are inspected
- **THEN** `vd-btn-ring` SHALL be present alongside the variant and size classes
- **AND** mounting without the prop SHALL NOT emit the class
- **AND** the class SHALL be resolvable by `scripts/check-class-coverage.mjs` against the built
  stylesheet

#### Scenario: The ring colour tracks the variant

- **GIVEN** a ring button using a transparent-fill treatment (plain, `.vd-btn-outline*` or
  `.vd-btn-ghost*`)
- **WHEN** the ring is painted
- **THEN** it SHALL use `currentcolor`, matching the treatment's accent
- **AND GIVEN** a ring button using a solid variant, whose text is white or black
- **THEN** the ring SHALL instead use that variant's own fill colour

#### Scenario: The focus indicator stays outside the ring

- **GIVEN** a ring button receiving keyboard focus
- **WHEN** `:focus-visible` matches
- **THEN** the focus outline SHALL keep the width and colour every other vd3 component uses
- **AND** its `outline-offset` SHALL clear the ring, so the indicator is never drawn inside the
  gap or on top of the stroke

#### Scenario: Adjacent buttons do not collide with the ring

- **GIVEN** a ring button adjacent to another button in either order
- **WHEN** the two are laid out
- **THEN** the horizontal space between their border boxes SHALL exceed the ring's offset, so
  the stroke never overlaps the neighbour
- **AND** the `0.5rem` bottom rhythm of `.vd-btn` SHALL be preserved

#### Scenario: The ring is suppressed inside a button group

- **GIVEN** a `.vd-btn-ring` button inside `.vd-btn-group` or `.vd-btn-group-vertical`
- **WHEN** the group is rendered
- **THEN** the ring SHALL NOT be painted, because grouped buttons deliberately share edges
- **AND** the group's `-1px` edge-sharing offset and squared inner corners SHALL be unaffected

#### Scenario: The ring composes with the disabled and loading states

- **GIVEN** a ring button that is `disabled` or carries `.is-loading`
- **WHEN** it is rendered
- **THEN** the ring SHALL dim with the button under the existing disabled opacity
- **AND** the loading spinner SHALL still render, because the ring and the spinner use different
  pseudo-elements
