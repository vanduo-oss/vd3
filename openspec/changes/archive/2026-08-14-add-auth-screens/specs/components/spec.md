# components

## ADDED Requirements

### Requirement: vd-checkbox-component

The package root MUST export `VdCheckbox`: a single boolean checkbox using the
existing `.vd-form-check` / `.vd-form-check-input` / `.vd-form-check-label`
markup. It SHALL support `v-model` (`modelValue: boolean`), `label`, `name`,
`id`, `disabled`, and `size` (`sm` | `md` | `lg`). `VdCheckboxGroup` MUST remain
the control for named option sets.

#### Scenario: boolean v-model round-trip

- **GIVEN** `VdCheckbox` mounted with `modelValue` false
- **WHEN** the input is checked
- **THEN** `update:modelValue` SHALL emit `true`

#### Scenario: label is associated

- **GIVEN** `VdCheckbox` with `label="Remember me"` and `id="remember"`
- **WHEN** the DOM is inspected
- **THEN** the label `for` matches the input `id`

### Requirement: vd-otp-input-component

The package root MUST export `VdOtpInput`: `length` grouped digit inputs
(default 6), `v-model` as a string of digits, `inputmode="numeric"`, paste that
fills consecutive cells, Backspace on an empty cell focusing the previous cell,
and `autocomplete="one-time-code"` on the first cell. Each cell SHALL have an
accessible name. The component MUST NOT call WebOTP / SMS retriever APIs.

#### Scenario: paste fills cells

- **GIVEN** a 6-cell `VdOtpInput`
- **WHEN** `"123456"` is pasted into the first cell
- **THEN** `update:modelValue` SHALL emit `"123456"` and each cell SHALL show
  one digit

#### Scenario: backspace moves left

- **GIVEN** the second cell is focused and empty
- **WHEN** Backspace is pressed
- **THEN** focus SHALL move to the first cell

### Requirement: vd-auth-card-component

`VdAuthCard` MUST compose `VdCover` + `VdCenter` + `VdCard` and expose slots
`brand`, `title`, default, `alert`, and `footer`. `glass` and `elevated` SHALL
forward to `VdCard`. When `framed` is false, the cover/center/card shell MUST
be omitted and only the inner stack rendered.

#### Scenario: glass card shell

- **GIVEN** `VdAuthCard` mounted with `glass`
- **WHEN** the DOM is inspected
- **THEN** a `.vd-card.vd-card-glass` SHALL be present inside `.vd-cover`

### Requirement: vd-login-component

`VdLogin` MUST render a labelled identifier field and a password field with
`revealPassword`, a submit `VdButton` honouring `loading`, optional remember-me
`VdCheckbox`, optional social `providers` that emit `social` with the provider
`id`, a `VdSeparator` labelled "or" when providers exist, and slots `extra`
(inside the form) and `links`. Submit SHALL emit `{ identifier, password,
remember }` and MUST NOT perform network I/O. Parent-provided `error` /
`message` SHALL render via `VdAlert`. Credential fields MUST NOT set
`autocomplete="off"`.

#### Scenario: submit payload

- **GIVEN** a filled login form with remember-me checked
- **WHEN** the form is submitted
- **THEN** `submit` SHALL emit `{ identifier, password, remember: true }`

#### Scenario: social emit

- **GIVEN** `providers: [{ id: "github", label: "GitHub", icon: "github-logo" }]`
- **WHEN** that button is clicked
- **THEN** `social` SHALL emit `"github"` and the form SHALL NOT submit

#### Scenario: autocomplete tokens

- **GIVEN** default `VdLogin` (email identifier)
- **WHEN** the inputs are inspected
- **THEN** the identifier SHALL have `autocomplete="email"` and the password
  SHALL have `autocomplete="current-password"`

### Requirement: vd-sign-up-component

`VdSignUp` MUST collect name, email, password, confirm-password, and a terms
`VdCheckbox`. Confirm MUST use the `useValidate` match message ("Fields do not
match") when the two passwords differ; submit SHALL be suppressed until they
match. Password fields SHALL use `autocomplete="new-password"` and
`revealPassword`. Optional `avatarSrc` / `avatarInitials` MAY render a
`VdAvatar` in the brand slot (display only — no file input).

#### Scenario: confirm mismatch

- **GIVEN** password `"secret1"` and confirm `"secret2"`
- **WHEN** the form is submitted
- **THEN** no `submit` emit SHALL occur and the confirm field SHALL show
  "Fields do not match"

### Requirement: vd-forgot-password-component

`VdForgotPassword` MUST render a labelled email field (`autocomplete="email"`)
and a submit button, emitting `{ email }` on submit, with `#extra`, `error`,
and `message` matching the other screens.

#### Scenario: email submit

- **GIVEN** email `"ada@example.com"`
- **WHEN** the form is submitted
- **THEN** `submit` SHALL emit `{ email: "ada@example.com" }`

## MODIFIED Requirements

### Requirement: vd-input-affixes-and-reveal

`VdInput` MUST render `#prefix` / `#suffix` slots, falling back to the `prefix`
/ `suffix` string props. When `revealPassword` is true and `type` is
`"password"`, a `button[type=button]` in the suffix SHALL toggle the input
between `password` and `text`, with `aria-pressed` and an accessible name.
`required` SHALL add `.label-required` on the label. `inputmode`,
`enterkeyhint`, `autocapitalize`, and `spellcheck` SHALL be forwarded; when
unset, `type="password"` and `type="email"` default `spellcheck="false"` and
`autocapitalize="none"`.

#### Scenario: reveal toggles type

- **GIVEN** `VdInput` with `type="password"` and `revealPassword`
- **WHEN** the reveal button is clicked
- **THEN** the input `type` SHALL become `"text"` and `aria-pressed` SHALL be
  `"true"`
- **AND WHEN** it is clicked again
- **THEN** the input `type` SHALL return to `"password"`

#### Scenario: required asterisk

- **GIVEN** `VdInput` with `label="Email"` and `required`
- **WHEN** the label is inspected
- **THEN** it SHALL carry `label-required`

### Requirement: vd-card-glass-prop

`VdCard` MUST accept `glass?: boolean` (default false) that adds
`.vd-card-glass`. Existing `elevated` / `interactive` behaviour MUST be
unchanged when `glass` is absent.

#### Scenario: glass class

- **GIVEN** `VdCard` with `glass`
- **WHEN** the root is inspected
- **THEN** it SHALL include `vd-card-glass`
- **AND** mounting without the prop SHALL NOT emit the class
