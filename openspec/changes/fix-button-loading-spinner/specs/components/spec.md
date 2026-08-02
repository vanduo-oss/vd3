# components

## ADDED Requirements

### Requirement: vd-button-loading-spinner-visibility

When a button carries `.is-loading`, vd3 SHALL paint a visible spinner for every
button treatment — solid, outline, ghost, and the plain base — whether the
spinner is the legacy `::after` pseudo-element or a real `.vd-btn-spinner`
child. The label MUST remain blanked (`color: transparent` on `.is-loading`),
and the spinner colour MUST follow the treatment's accent rather than the
transparent text colour.

#### Scenario: Outline loading keeps a visible ::after spinner

- **GIVEN** an element with `class="vd-btn vd-btn-outline is-loading"` (and each
  of `.vd-btn-outline-primary` … `-info`, including `-error` / `-danger`)
- **WHEN** it is rendered
- **THEN** the `::after` spinner SHALL use that outline accent's colour with a
  transparent trailing segment
- **AND** the spinner SHALL NOT inherit the transparent label colour

#### Scenario: Ghost loading keeps a visible ::after spinner

- **GIVEN** an element with `class="vd-btn vd-btn-ghost is-loading"` (and each
  of `.vd-btn-ghost-primary` … `-subtle`, including `-error`)
- **WHEN** it is rendered
- **THEN** the `::after` spinner SHALL use that ghost accent's colour (muted
  text colour for `-subtle`) with a transparent trailing segment
- **AND** the spinner SHALL NOT inherit the transparent label colour

#### Scenario: Plain base loading keeps a visible ::after spinner

- **GIVEN** an element with `class="vd-btn is-loading"` and no solid / outline /
  ghost colour class
- **WHEN** it is rendered
- **THEN** the `::after` spinner SHALL use `--vd-color-primary` with a
  transparent trailing segment, matching the default `.vd-btn-spinner` colour

#### Scenario: Real spinner element tracks outline and ghost accents

- **GIVEN** a loading button that renders `<span class="vd-btn-spinner">` under
  an outline or ghost colour class
- **WHEN** it is rendered
- **THEN** the span's border colour SHALL match that treatment's accent
- **AND** `.vd-btn.is-loading:has(.vd-btn-spinner)::after` SHALL still suppress
  the legacy pseudo-element so only one spinner shows

#### Scenario: Solid loading colours stay unchanged

- **GIVEN** a solid `.vd-btn-primary` (or secondary / success / info / danger /
  error) button with `.is-loading`
- **WHEN** it is rendered
- **THEN** its spinner SHALL remain white as today
- **AND GIVEN** a solid `.vd-btn-warning.is-loading`
- **THEN** its spinner SHALL remain black as today
