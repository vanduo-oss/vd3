# components Specification

## Purpose
TBD - created by archiving change vd3-carryover. Update Purpose after archive.
## Requirements
### Requirement: carried-component-surface

The package root MUST export the 38 carried SFC components (`VdAccordion`,
`VdAlert`, `VdAvatar`, `VdBadge`, `VdButton`, `VdButtonGroup`, `VdCard`,
`VdCheckboxGroup`, `VdChip`, `VdCodeSnippet`, `VdCollection`,
`VdCustomSelect`, `VdFlow`, `VdIcon`, `VdInput`, `VdMenu`, `VdModal`,
`VdOffcanvas`, `VdPagination`, `VdPreloader`, `VdProgress`,
`VdRadioGroup`, `VdRating`, `VdSelect`, `VdSeparator`, `VdSidenav`,
`VdSkeleton`, `VdSlider`, `VdSpinner`, `VdSwitch`, `VdTable`, `VdTabs`,
`VdToast`, `VdToastContainer`, `VdTooltip`, `VdTransfer`, `VdTree`,
`VdTreeNode`) and the 7 layout primitives (`VdBox`, `VdCenter`, `VdCover`,
`VdFrame`, `VdInline`, `VdStack`, `VdSwitcher`), carried from the old
`@vanduo-oss/vue` package with identical props, emits, slots, and rendered
`vd-*` markup. `VdMenu` — deferred by `vd3-carryover` because it imported
the delegating `useDropdown` — is un-deferred by this change: it carries
byte-faithful from the donor except that its `useDropdown` import resolves
to the pure vd3 rewrite. The shared `StatusVariant` type (`danger`
canonical) and the `TreeNode` type SHALL be re-exported from the root.

#### Scenario: barrel exports the carried surface

- **GIVEN** the built package
- **WHEN** the root module's named exports are enumerated
- **THEN** all 45 carried SFC exports (including `VdMenu`) are present and
  `loadVanduoRuntime` is absent

#### Scenario: rendered markup matches the donor contract

- **GIVEN** a carried component mounted with representative props (e.g.
  `VdButton` with `variant="danger"` and `size="lg"`)
- **WHEN** the rendered DOM is inspected
- **THEN** the root element carries the same `vd-*` classes the old
  `@vanduo-oss/vue` component rendered for those props

#### Scenario: no framework globals in component code

- **GIVEN** the carried `src/components/**` sources
- **WHEN** they are searched for `window.Vanduo` or `Vanduo*` global casts
- **THEN** no match exists

### Requirement: toast-stack-components

`VdToastContainer` MUST render the toast singleton's queue: one
`.vd-toast-container` element per position that currently has toasts
(teleported to `body`, `role="status"`, `aria-live="polite"`), each
containing a `VdToast` per queued entry, and dismissal events SHALL remove
the entry from the shared queue.

#### Scenario: queued toasts render grouped by position

- **GIVEN** a mounted `VdToastContainer` and two toasts shown at
  `top-right` and one at `bottom-center`
- **WHEN** the DOM is inspected
- **THEN** exactly two positioned `.vd-toast-container` groups exist with
  the matching `vd-toast-container-<position>` classes and toast counts

#### Scenario: dismissal empties the group

- **GIVEN** a rendered toast
- **WHEN** its dismiss event fires
- **THEN** the entry leaves the queue and its position group disappears when
  empty

### Requirement: component-mount-specs

Every SFC exported from the package root MUST have a vitest mount spec (jsdom
+ @vue/test-utils) asserting at minimum: the rendered root `vd-*` class, a
representative prop→class mapping, that declared emits fire, and — for
components that model a value — the `v-model` round-trip.

#### Scenario: every exported component is covered

- **GIVEN** the list of SFC exports in `src/index.ts`
- **WHEN** `pnpm test` runs
- **THEN** each export has at least one passing mount spec exercising
  classes, props, and emits (and `v-model` where applicable)

### Requirement: class-coverage-gate

The repo MUST carry `scripts/check-class-coverage.mjs` (from the old vue
repo, 136 lines) with its default stylesheet repointed at `dist/vd3.min.css`,
exposed as the `check:classes` script, appended to the `build` chain, and
run in CI. The gate SHALL fail (non-zero exit) when any static `vd-*` class a
component renders lacks an exact selector in the bundle, or when a dynamic
`vd-*` prefix has no selector starting with it.

#### Scenario: coverage gate passes on the carried surface

- **GIVEN** a completed `pnpm build`
- **WHEN** `pnpm check:classes` runs
- **THEN** it exits 0, reporting every static and dynamic `vd-*` class
  rendered by `src/components/**` as covered by `dist/vd3.min.css`

#### Scenario: drift is caught

- **GIVEN** a component rendering a `vd-*` class with no selector in
  `dist/vd3.min.css`
- **WHEN** `pnpm check:classes` runs
- **THEN** it exits non-zero and names the missing class and the offending
  component file

### Requirement: vd-menu-component

`VdMenu` MUST render the donor contract from the old vue repo (68-line
SFC): a `.vd-dropdown` root containing a
`button.vd-btn.vd-btn-secondary.vd-dropdown-toggle` with
`aria-haspopup="menu"` showing the `label` prop, and a
`.vd-dropdown-menu[role="menu"]` (gaining `.vd-dropdown-menu-end` when
`align="end"`) rendering `items` — divider entries as
`.vd-dropdown-divider[role="separator"]`, others as
`a.vd-dropdown-item[role="menuitem"]` with `is-disabled` class and
`aria-disabled` for disabled items. Selecting a non-disabled,
non-divider item SHALL emit `select` with `item.value ?? item.label`,
preventing default navigation when the item has no `href`. Open/close,
outside-click, keyboard navigation, and typeahead behavior MUST come from
the rewritten `useDropdown` wired on the root — the component SHALL NOT
duplicate that logic.

#### Scenario: donor markup renders

- **GIVEN** `VdMenu` mounted with `label="File"` and three items including
  one divider and one disabled item
- **WHEN** the DOM is inspected
- **THEN** the toggle shows "File" with `aria-haspopup="menu"`, the menu
  has `role="menu"`, the divider renders `role="separator"`, and the
  disabled item has `is-disabled` + `aria-disabled="true"`

#### Scenario: selection emits the value

- **GIVEN** an open `VdMenu` with an item `{ label: "Copy", value: "c" }`
- **WHEN** the item is clicked
- **THEN** exactly one `select` emit with payload `"c"` occurs and the
  menu closes

#### Scenario: disabled items do not emit

- **GIVEN** an open `VdMenu` with a disabled item
- **WHEN** the disabled item is clicked
- **THEN** no `select` emit occurs

#### Scenario: dropdown behavior is delegated

- **GIVEN** a mounted `VdMenu`
- **WHEN** the toggle is clicked and Escape is then pressed
- **THEN** the menu opens with `is-open` and closes again — behavior
  provided by `useDropdown`, with no duplicated open/close logic in the
  SFC

### Requirement: vd-breadcrumb-component

`VdBreadcrumb` MUST be a markup-only component honoring the
`css/components/breadcrumbs.css` contract: a `nav` (default
`aria-label="Breadcrumb"`) wrapping `ol.vd-breadcrumb` whose
`li.vd-breadcrumb-item` entries come from an `items` prop
(`{ label, href?, current? }[]`) or a default slot. Link items render an
`a.vd-breadcrumb-link`; the current item (explicit `current: true` or the
last item by default) renders with `.vd-breadcrumb-current` and
`aria-current="page"` and no link. A `separator` prop (`slash` default,
`chevron`, `arrow`, `dot`, `pipe`) SHALL map to
`vd-breadcrumb-separator-<value>` and a `size` prop (`sm`/`lg`) to
`vd-breadcrumb-sm`/`-lg` on the list. The component MUST NOT install any
listeners.

#### Scenario: items render with a current page

- **GIVEN** `VdBreadcrumb` with three items, the last without `href`
- **WHEN** the DOM is inspected
- **THEN** the first two are `.vd-breadcrumb-item` links and the last has
  `.vd-breadcrumb-current` with `aria-current="page"` and renders no
  anchor

#### Scenario: separator and size map to classes

- **GIVEN** `separator="chevron"` and `size="sm"`
- **WHEN** the list element is inspected
- **THEN** it carries `vd-breadcrumb-separator-chevron` and
  `vd-breadcrumb-sm`

### Requirement: vd-footer-component

`VdFooter` MUST be a markup-only component honoring the
`css/components/footer.css` contract: a `footer.vd-footer` with an inner
`.vd-footer-container`, a `columns` prop (`2`/`3`/`4` →
`vd-footer-2col`/`-3col`/`-4col`), `dark` (→ `vd-footer-dark`) and `size`
(`sm`/`lg` → `vd-footer-sm`/`-lg`) modifiers, a default slot for
`.vd-footer-section` content, and an optional `copyright` slot rendering
inside `.vd-footer-copyright`. The component MUST NOT install any
listeners.

#### Scenario: modifiers map to classes

- **GIVEN** `VdFooter` with `columns=3`, `dark`, and `size="lg"`
- **WHEN** the root is inspected
- **THEN** it carries `vd-footer`, `vd-footer-3col`, `vd-footer-dark`,
  and `vd-footer-lg`

#### Scenario: copyright slot renders in place

- **GIVEN** a `copyright` slot with text
- **WHEN** the DOM is inspected
- **THEN** the text renders inside `.vd-footer-copyright` after the
  container content

### Requirement: vd-fab-component

`VdFab` MUST honor the `css/components/fab.css` contract: a
`button.vd-fab` (default slot for the icon; `aria-label` required via
prop when the content is icon-only) with `size` (`sm`/`lg`), `variant`
(`secondary`/`success`/`danger`; `danger` canonical with `error` accepted
as alias per the package's `StatusVariant` vocabulary), `glass`,
`extended`, and `position` (`bottom-right` default rendering
`vd-fab-fixed`; `bottom-left`, `top-right`, `top-left`, `center`;
`static` renders no positioning class) mapping to the corresponding
`vd-fab-*` classes, and a `click` emit. When `actions` slot content is
provided the component SHALL render the `.vd-fab-menu` speed-dial
arrangement: the trigger toggles `is-open` on the menu root and mirrors
it with `aria-expanded`, `.vd-fab-actions` wraps the slot, and Escape or
an outside pointerdown (via `useClickOutside`) closes the menu.

#### Scenario: props map to classes

- **GIVEN** `VdFab` with `size="lg"`, `variant="danger"`, and
  `position="bottom-left"`
- **WHEN** the root is inspected
- **THEN** it carries `vd-fab`, `vd-fab-lg`, `vd-fab-danger`,
  `vd-fab-fixed`, and `vd-fab-bottom-left`

#### Scenario: speed-dial opens and closes

- **GIVEN** a `VdFab` with two action buttons in the `actions` slot
- **WHEN** the trigger is clicked, then Escape is pressed
- **THEN** the `.vd-fab-menu` root gains `is-open` with
  `aria-expanded="true"`, and both revert on Escape

#### Scenario: outside click closes the dial

- **GIVEN** an open speed-dial
- **WHEN** a pointerdown lands outside the menu root
- **THEN** `is-open` is removed

### Requirement: vd-navbar-component

`VdNavbar` MUST reproduce the `framework/js/components/navbar.js`
(305 lines) behavior around slot-driven markup: a `nav.vd-navbar` with
`brand`, default (menu, rendered as `.vd-navbar-menu`), and `actions`
slots plus a `.vd-navbar-toggle` burger. Toggling MUST add/remove
`is-open` on the menu and `is-active` on the toggle, create/activate a
`.vd-navbar-overlay`, lock body scroll via `body-navbar-open`, and keep
`aria-expanded` (toggle) / `aria-hidden` (menu) in sync. The open menu
SHALL close on Escape, on outside click, on overlay click, and
(debounced) when the viewport resizes to at least the breakpoint resolved
from `--vd-breakpoint-lg` (fallback 992). Below the breakpoint, clicking
a `.vd-navbar-dropdown` parent link SHALL toggle `is-open` on its
`.vd-navbar-dropdown-menu` instead of navigating; closing the menu closes
open submenus. For `variant` `glass`/`transparent` the component MUST
delegate scrolled-state handling (`vd-navbar-scrolled` past
`scroll-threshold` prop or the navbar's own height) to the carried
`useNavbarGlassScroll` composable and SHALL NOT duplicate that logic.
Unmount MUST remove the overlay, the body class, and all
document/window listeners.

#### Scenario: mobile toggle round-trip

- **GIVEN** a mounted `VdNavbar` with menu content
- **WHEN** the burger is clicked, then Escape is pressed
- **THEN** the menu gains `is-open`, the toggle `is-active` +
  `aria-expanded="true"`, `body` gains `body-navbar-open`, the overlay is
  active — and all of it reverts on Escape

#### Scenario: resize past the breakpoint closes

- **GIVEN** an open mobile menu with `--vd-breakpoint-lg: 992px`
- **WHEN** the window resizes to 1200 px wide and the debounce elapses
- **THEN** the menu closes

#### Scenario: mobile submenu toggling

- **GIVEN** a dropdown entry in the menu below the breakpoint
- **WHEN** its parent link is clicked twice
- **THEN** its `.vd-navbar-dropdown-menu` gains then loses `is-open` and
  no navigation occurs

#### Scenario: unmount cleans global state

- **GIVEN** a mounted navbar with its menu open
- **WHEN** the component unmounts
- **THEN** `body-navbar-open` is gone and the generated overlay is
  removed from the DOM

### Requirement: vd-theme-switcher-component

`VdThemeSwitcher` MUST port `framework/js/components/theme-switcher.js`
(466 lines) onto the vd3 theme layer: all reads/writes go through the
theme-preference singleton (which persists to `vanduo-theme-preference`
and applies/removes `data-theme` per the existing `theme-preference-model`
requirement) — the component SHALL NOT touch localStorage or
`document.documentElement` directly. In menu mode (default) it renders
the `.vd-theme-switcher[data-theme-ui="menu"]` contract: a
`.vd-theme-switcher-toggle` (`aria-expanded`, `aria-label` "Theme: X",
Phosphor icon `ph-desktop`/`ph-sun`/`ph-moon` for the active mode) and a
`.vd-theme-switcher-menu` of `menuitemradio` options
(`data-theme-value`, `is-active` + `aria-checked` on the active mode)
supporting click, Enter/Space, ArrowDown/ArrowUp cycling, Escape-close
with refocus, and outside-click close. With `menu=false` it renders the
cycle button: each activation advances system → light → dark → system.
While the preference is `system`, a `prefers-color-scheme` change SHALL
re-apply the effective theme (via the singleton's media listener).

#### Scenario: menu selection applies and persists

- **GIVEN** a mounted menu-mode switcher with preference `system`
- **WHEN** the `dark` option is chosen
- **THEN** `<html>` carries `data-theme="dark"`,
  `localStorage["vanduo-theme-preference"]` is `dark`, the option has
  `is-active` + `aria-checked="true"`, and the toggle icon/label reflect
  dark

#### Scenario: cycle mode advances modes

- **GIVEN** a cycle-mode switcher at `light`
- **WHEN** it is clicked
- **THEN** the preference becomes `dark`, and a further click returns to
  `system` (removing `data-theme`)

#### Scenario: menu keyboard contract

- **GIVEN** an open switcher menu
- **WHEN** ArrowDown then Escape are pressed
- **THEN** focus moves to the next option, then the menu closes and the
  toggle regains focus

#### Scenario: two theme components stay in sync

- **GIVEN** a mounted `VdThemeSwitcher` and `VdThemeCustomizer`
- **WHEN** the switcher sets `dark`
- **THEN** the customizer's reactive state reflects `dark` without a
  reload (shared singleton)

### Requirement: vd-theme-customizer-component

`VdThemeCustomizer` MUST be the promotion of
`vd2/src/overlays/VdThemeCustomizer.vue` (236 lines), de-pinia'd onto the
theme-preference singleton: a `.vd-theme-customizer` root with the
paint-roller trigger (`aria-label`, `aria-expanded`), a body-teleported
`.vd-theme-customizer-overlay` and `.vd-theme-customizer-panel`
(`role="dialog"`, labelled, `is-open` state, positioned under the trigger
on desktop widths and reset on mobile), and `tc-*` sections rendering
`PRIMARY_COLORS` swatches, `NEUTRAL_COLORS` swatches, `RADIUS_OPTIONS`
buttons, and the `FONT_OPTIONS` select — each control marking the active
value and writing through the singleton's setters (font selection covers
the absorbed `font-switcher.js` capability: `data-font` application with
removal for `system`, `vanduo-font-preference` persistence). A
**`show-palette` prop (default `false`)** SHALL additionally render the
`PALETTE_OPTIONS` section wired to `setPalette` when true. The panel MUST
close on Escape, on overlay click, and on outside pointerdown via
`useClickOutside` (trigger excluded); it SHALL open on the
`vd:open-customizer` window event and expose `open`/`close`/`toggle`. The
reset control MUST restore the singleton defaults. All window listeners
are removed on unmount.

#### Scenario: swatch writes through the theme layer

- **GIVEN** an open customizer
- **WHEN** a primary swatch with key `indigo` is clicked
- **THEN** `<html>` carries `data-primary="indigo"`,
  `localStorage["vanduo-primary-color"]` is `indigo`, and the swatch has
  `is-active`

#### Scenario: palette section is opt-in

- **GIVEN** one customizer with defaults and one with `show-palette`
- **WHEN** their panels render
- **THEN** only the `show-palette` instance contains the palette section,
  and choosing `fibonacci` there sets `data-palette="fibonacci"`

#### Scenario: font select absorbs the font switcher

- **GIVEN** an open customizer
- **WHEN** the font select changes to a non-system font, then back to
  `system`
- **THEN** `data-font` is set then removed on `<html>` and
  `vanduo-font-preference` tracks both writes

#### Scenario: close paths

- **GIVEN** an open panel
- **WHEN** Escape is pressed (or the overlay is clicked, or a pointerdown
  lands outside panel and trigger)
- **THEN** the panel loses `is-open` and the trigger reports
  `aria-expanded="false"`

#### Scenario: reset restores defaults

- **GIVEN** a customized primary, radius, and font
- **WHEN** "Reset to Defaults" is clicked
- **THEN** the singleton returns to `defaultPreference()` values and the
  `data-*` attributes reflect them

### Requirement: vd-doc-search-component

`VdDocSearch` MUST render the `.vd-doc-search` markup contract from
`doc-search.js` (1016 lines) as a thin shell over `useDocSearch`: an
input wrapper with `.vd-doc-search-input` carrying combobox ARIA
(`role="combobox"`, `aria-autocomplete="list"`, `aria-controls`,
`aria-expanded`, `aria-activedescendant` tracking the active option) and
a `.vd-doc-search-results` listbox that gains `is-open` when open,
rendering `.vd-doc-search-result` options (`role="option"`,
`aria-selected`, `is-active` on the active one) with icon, highlighted
title, excerpt, and category, plus the empty state
(`.vd-doc-search-empty`) and footer hints (`.vd-doc-search-footer`).
Selecting a result (click or Enter) SHALL emit `select` with the result
and close the listbox. The component MUST pass its props (`data`,
`min-query-length`, `max-results`, `debounce-ms`, `placeholder`,
`keyboard-shortcut`) through to the composable and take all behavior from
it.

#### Scenario: results render with ARIA

- **GIVEN** a `VdDocSearch` with a three-document `data` set
- **WHEN** a matching query is typed and the debounce elapses
- **THEN** the results container has `is-open`, the input
  `aria-expanded="true"`, each result is a `role="option"` with the match
  highlighted, and ArrowDown moves `is-active` +
  `aria-activedescendant`

#### Scenario: selection emits and closes

- **GIVEN** open results with an active option
- **WHEN** Enter is pressed
- **THEN** exactly one `select` emit with that result fires and the
  listbox closes

#### Scenario: empty state

- **GIVEN** a query with no matches
- **WHEN** the search settles
- **THEN** the `.vd-doc-search-empty` block renders instead of options

### Requirement: vd-tree-cascade-default

`VdTree` MUST declare its `cascade` prop with
`withDefaults(defineProps<…>(), { cascade: true })` so the documented
default (parent check cascades to children) actually applies — replacing
the inherited `props.cascade ?? true` expression, which was dead code
because Vue casts an absent optional boolean prop to `false`. This is a
**documented behavior change** relative to the old `@vanduo-oss/vue`
donor and the carried implementation: mounting `VdTree` with `checkbox`
and without a `cascade` binding now cascades; consumers that relied on
the buggy non-cascading default MUST pass `:cascade="false"`. The change
SHALL be called out in the changelog and migration notes.

#### Scenario: default now cascades

- **GIVEN** a checkbox `VdTree` mounted without a `cascade` binding, with
  a parent node having two children
- **WHEN** the parent's checkbox is checked
- **THEN** both children become checked and `getChecked()` returns all
  three ids

#### Scenario: explicit opt-out preserved

- **GIVEN** the same tree mounted with `:cascade="false"`
- **WHEN** the parent's checkbox is checked
- **THEN** the children remain unchecked

