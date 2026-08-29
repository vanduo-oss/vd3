# components

## ADDED Requirements

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
