# css-distribution

## ADDED Requirements

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
