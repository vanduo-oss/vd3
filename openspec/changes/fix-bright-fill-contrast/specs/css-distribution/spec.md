# css-distribution

## ADDED Requirements

### Requirement: filled-surfaces-use-on-fill-ink

Authored CSS for filled primary and status surfaces MUST set `color` (and
spinner `border-color` where a spinner is painted) to
`--vd-text-on-primary`, `--vd-text-on-primary-hover`, or
`--vd-text-on-status` — not a hardcoded `--vd-color-white` / `#fff` —
including buttons (filled, outline hover, loading), chips, badges, solid
alerts, solid toasts, active pill tabs, pagination, FAB, avatars, stepper
circles, labeled progress, selected date/time items, active suggest items,
waypoint pills, Spotlight primary actions, table status rows, checked
checkbox glyphs, large timeline markers, and footer-social hover.

Hover fills MUST remain the existing solid primary / `*-dark` language.
Light `.vd-btn-ink:hover` MUST stay white on `--vd-color-black`. Intentional
white-on-dark treatments (`.vd-badge-dark`, `.vd-table-dark`, tooltips,
`.vd-spinner-light`, image-box close/caption) MUST keep light ink.

#### Scenario: filled primary button consumes the token

- **GIVEN** `css/components/buttons.css`
- **WHEN** `.vd-btn-primary` is inspected
- **THEN** its `color` is `var(--vd-text-on-primary)` and its hover `color`
  is `var(--vd-text-on-primary-hover)`

#### Scenario: warning and success share status ink

- **GIVEN** filled warning and success button, chip, and badge rules
- **WHEN** their `color` declarations are inspected
- **THEN** each uses `var(--vd-text-on-status)`

#### Scenario: dark-surface negatives stay white

- **GIVEN** `.vd-badge-dark`, `.vd-table-dark`, and tooltip text tokens
- **WHEN** their foregrounds are inspected
- **THEN** they still use `--vd-color-white` or the tooltip light-on-dark
  token
