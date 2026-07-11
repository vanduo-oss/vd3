## ADDED Requirements

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
