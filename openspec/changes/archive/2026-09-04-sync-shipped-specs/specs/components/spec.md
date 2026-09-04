# components

## ADDED Requirements

### Requirement: vd-dock-component

The package root MUST export `VdDock`: a slot-driven glass dock (`#brand`,
default items, `#actions`) rendered as `<nav class="vd-dock">`. It SHALL
support `v-model:orientation` (`horizontal` | `vertical`), `v-model:placement`
(`bottom` | `top` | `left` | `right`, default `bottom`), `position`
(`fixed` | `contained`, default `fixed`), `dark` (default true), `tint`
(`red` | `orange` | `yellow` | `green` | `teal` | `blue` | `violet` | `pink`),
`glass` (Seemore steps `1` | `2` | `3` | `5` | `8` | `13` | `21` | `34`,
default `34`), `radius` (dock-own scale, default `1.25`), `itemLayout`
(`stack` | `inline`, default `stack`), `brandToggles` (default true),
`persist` (default false), `cycle` (`pair` | `edges`, default `pair`), and
`label` (default `"Primary"`).

Brand click SHALL toggle orientation when `brandToggles` is true and the
viewport is not narrow. The brand control MUST set `aria-pressed` when
orientation is vertical and MUST be disabled when toggle is unavailable.
The root MUST apply `.vd-glass` plus `.vd-glass-{glass}` and phase classes
`is-horizontal` | `is-square` | `is-vertical` | `is-morphing` and
`vd-dock-edge-{bottom|top|left|right}`. Brand click SHALL toggle the opposite
axis of the current pair (`bottom` ↔ `left`, `top` ↔ `right`) when
`cycle` is `pair` (the default). When `cycle` is `edges`, brand click SHALL
walk `bottom` → `left` → `top` → `right` → `bottom`. Default `toggle()`
MUST remain the pair morph.

`position="contained"` MUST use absolute positioning relative to the nearest
positioned ancestor. `position="fixed"` MUST attach to the viewport.

`--vd-dock-radius` MUST default to `1.25rem` and MUST NOT read
`--vd-radius-scale`. Allowed radius values: `0.5`, `0.75`, `1`, `1.25`,
`1.5`, `2`, `9999`. The global theme `RadiusOption` list MUST remain capped
at `0.5`.

The component MUST NOT bake an oola / ū mark. Brand content is the `#brand`
slot. The component MUST NOT pad the document.

#### Scenario: default chrome classes

- **GIVEN** `VdDock` mounted with a brand slot
- **WHEN** the DOM is inspected
- **THEN** the root is `nav.vd-dock.vd-dock-fixed.vd-glass.vd-glass-34` with
  `is-horizontal` and `aria-label="Primary"` and `vd-dock-edge-bottom`

#### Scenario: placement morph pair

- **GIVEN** `VdDock` with `placement="top"`
- **WHEN** the brand button is clicked on a wide viewport
- **THEN** `update:placement` SHALL emit `"right"` after the morph and the root
  SHALL have `.vd-dock-edge-right`

#### Scenario: edges cycle

- **GIVEN** `VdDock` with `cycle="edges"` on a wide viewport
- **WHEN** the brand button is clicked four times
- **THEN** `update:placement` SHALL emit `left`, then `top`, then `right`,
  then `bottom`

#### Scenario: orientation v-model toggle

- **GIVEN** `VdDock` with `brandToggles` and a wide viewport
- **WHEN** the brand button is clicked
- **THEN** `update:orientation` SHALL emit `"vertical"` after the morph (or
  immediately when reduced motion is preferred)

#### Scenario: contained position

- **GIVEN** `VdDock` with `position="contained"`
- **WHEN** the DOM is inspected
- **THEN** the root SHALL have `.vd-dock-contained` and MUST NOT have
  `.vd-dock-fixed`

#### Scenario: tint and radius

- **GIVEN** `VdDock` with `tint="violet"` and `radius="2"`
- **WHEN** the DOM is inspected
- **THEN** the root SHALL have `.vd-dock-tint-violet` and
  `--vd-dock-radius` resolving to `2rem`

#### Scenario: persist default off

- **GIVEN** `VdDock` mounted without `persist`
- **WHEN** orientation changes
- **THEN** `localStorage` MUST NOT receive a `*-dock-orient` key

### Requirement: vd-dock-item-component

The package root MUST export `VdDockItem`: a `button.vd-dock-item` with an
optional Phosphor `icon` (via `VdIcon`), a `.vd-dock-label`, and `active`.
When `active` is true the button SHALL have `.is-active` and
`aria-current="page"`.

#### Scenario: active item

- **GIVEN** `VdDockItem` with `label="Home"`, `icon="house"`, `active`
- **WHEN** the DOM is inspected
- **THEN** the button has `.is-active`, `aria-current="page"`, a `.vd-dock-label`
  whose text is `Home`, and a Phosphor house icon

### Requirement: vd-code-snippet-chrome-mode

When any of `html`, `css`, `js`, `shell`, `vue`, or `json` is a non-empty
string, `VdCodeSnippet` MUST render chrome mode: a `div.vd-code-snippet`
with the docs-widget markup (toggle, header tablist, panes) instead of the
simple `figure > pre` contract. Tab order SHALL be HTML → Shell → CSS →
JavaScript → Vue → JSON, omitting empty props. Labels SHALL be `HTML`,
`Shell`, `CSS`, `JavaScript`, `Vue`, `JSON`.

Chrome mode SHALL accept `defaultOpen` (default false), `toggleLabel`
(default `"View Code"`), `collapsible` (default true), and `copyable`
(default true). `data-collapsible` MUST be omitted when `collapsible` is
false so CSS presence selectors hide the toggle and show content. The
toggle MUST set `aria-expanded`. Tabs MUST use `role="tablist"`,
`role="tab"`, `aria-selected`, and `aria-controls` pointing at the
matching pane. Panes MUST use `role="tabpanel"` and `aria-labelledby`.
Arrow Left/Right and Home/End MUST move the active tab. The active pane MUST have
`tabindex="0"` when expanded and `tabindex="-1"` otherwise (axe
`scrollable-region-focusable`). Copy MUST write the **raw** active-tab
source, never highlighted HTML. Exactly one copy button MAY render.

When both `code` and a tab prop are set, chrome mode MUST win.

#### Scenario: tab order and labels

- **GIVEN** `VdCodeSnippet` mounted with non-empty `html`, `shell`, `css`,
  `js`, `vue`, and `json`
- **WHEN** the tablist is inspected
- **THEN** the tabs SHALL be HTML, Shell, CSS, JavaScript, Vue, JSON in
  that order, each with `role="tab"` and matching `data-lang`

#### Scenario: collapse and expand

- **GIVEN** chrome mode with `collapsible` (default) and `defaultOpen`
  false
- **WHEN** the toggle is clicked
- **THEN** `data-expanded` SHALL become `"true"`, the toggle
  `aria-expanded` SHALL be true, content SHALL be `data-visible="true"`,
  and the active pane SHALL have `tabindex="0"`

#### Scenario: non-collapsible omits the attribute

- **GIVEN** chrome mode with `collapsible` false
- **WHEN** the DOM is inspected
- **THEN** the root MUST NOT have `data-collapsible`, the toggle MUST NOT
  render, and the content SHALL be visible

#### Scenario: tab props win over code

- **GIVEN** `code` and a non-empty `html` prop
- **WHEN** the component is mounted
- **THEN** the root SHALL be `div.vd-code-snippet` and MUST NOT be a
  `figure`

### Requirement: vd-code-snippet-highlight-hook

`VdCodeSnippet` MAY accept `highlight?: (code: string, language: string) =>
string`. When absent, source MUST render via text interpolation (`{{
code }}`) so markup in the source cannot become DOM. When present, the
return value MUST be injected with `v-html`. The function MUST return
escaped HTML. Copy MUST still use the raw source. In chrome mode the
`language` argument SHALL be the tab key (`html`, `js`, `vue`, …), not a
cbun language id. The component MUST NOT accept a parallel
`highlightedHtml` string prop and MUST NOT import `@vanduo-oss/vd3-cbun`
or `highlight.js`.

#### Scenario: default path escapes

- **GIVEN** simple or chrome mode with no `highlight` and source containing
  `<img>` / `<script>` markup
- **WHEN** the DOM is inspected
- **THEN** no `img` or `script` element SHALL exist and the text content
  SHALL equal the raw source

#### Scenario: hook uses v-html and copy stays raw

- **GIVEN** chrome mode with `highlight` returning marked HTML
- **WHEN** the active pane and copy button are used
- **THEN** the pane SHALL contain the hook’s HTML nodes and clipboard
  write SHALL receive the raw source

### Requirement: vd-code-snippet-simple-mode-unchanged

Simple mode (`code` without tab props) MUST keep the carried figure
contract: `figure.vd-code-snippet > pre.vd-code-snippet-pre.language-* >
code` with `data-language`, and a `button.vd-btn.vd-btn-ghost.vd-btn-sm.vd-code-snippet-copy`
when `copyable` is true (default). Default `language` remains `"html"`.

#### Scenario: figure contract

- **GIVEN** `VdCodeSnippet` mounted with `code` only
- **WHEN** the DOM is inspected
- **THEN** the root SHALL be `figure.vd-code-snippet` and the `pre` SHALL
  have `.vd-code-snippet-pre`, `.language-html`, and `data-language="html"`

### Requirement: vd-button-ink-variant

vd3 SHALL provide a `.vd-btn-ink` button variant: a transparent fill with a
single fat (2px) primary outline at rest, and a scheme-aware hover fill
(black in light, primary in dark). `VdButton` SHALL accept `variant="ink"`
and emit that class. The variant MUST NOT alter `.vd-btn-outline*`,
`.vd-btn-ghost*`, or `.vd-btn-ring` rendering.

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
  SHALL use `--vd-text-on-primary`
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
