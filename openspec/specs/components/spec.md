# components Specification

## Purpose
The 63 exported Vue components: carryover SFCs, layout primitives, and later additions (dock, auth, snippet chrome, global search).

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
supporting click, Enter/Space, ArrowDown/ArrowUp cycling, and outside-click
close. Focus management MUST match the donor: **opening the menu** by click,
Enter, or Space (in addition to the existing ArrowDown-to-open path) SHALL
move focus into the menu — to the active `menuitemradio`, or the first option
when none is active (donor `openMenu`); **pressing Escape while the menu is
open** — whether the key is handled on the toggle or within the menu — SHALL
close the menu AND return focus to the `.vd-theme-switcher-toggle` button
(donor `handleMenuKeydown`), so focus is never stranded on the now-hidden
menu. With `menu=false` it renders the cycle button unchanged: each
activation advances system → light → dark → system, and it manages no menu
focus. While the preference is `system`, a `prefers-color-scheme` change
SHALL re-apply the effective theme (via the singleton's media listener).

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

#### Scenario: opening by click moves focus into the menu

- **GIVEN** a mounted menu-mode switcher whose menu is closed, with `dark`
  the active mode
- **WHEN** the toggle is activated by click (or Enter/Space)
- **THEN** the menu opens (`aria-expanded="true"`) and focus moves to the
  active `dark` `menuitemradio` option (the first option when no mode is
  active)

#### Scenario: escape closes and refocuses the toggle

- **GIVEN** an open switcher menu with focus on one of its options
- **WHEN** Escape is pressed
- **THEN** the menu closes (`aria-expanded="false"`) and focus returns to
  the `.vd-theme-switcher-toggle` button

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

A **`variant` prop (`panel` | `swatches`, default `panel`)** SHALL select the
presentation. `panel` is the behavior described above and MUST be unchanged.

`swatches` SHALL render a body-teleported `.vd-theme-customizer-fan`
(`role="listbox"`, labelled) of `.tc-fan-item` blades (`role="option"`,
`aria-selected`, `aria-label` from the color name, `data-color`) in place of
the overlay and panel, and the trigger SHALL use the `ph-swatches` icon
instead of `ph-paint-roller`. The trigger element, its classes, and
`data-theme-customizer-trigger` MUST be identical across variants. Each blade
MUST carry a `.tc-fan-label` and a `.tc-fan-swatch` whose
`--vd-swatch-color` is the color value. The swatches variant owns **primary
only** — it MUST NOT render palette, neutral, radius, font, or reset controls.

The fan MUST be hinged at the trigger center: the fan root is positioned in
fixed coordinates at that point and each blade is rotated to its own fan angle
and pushed out along its own axis, so all blades pivot around one origin. The
fan MUST fit itself inside the viewport by shrinking the arc (from 120° down to
a 30° floor) and tilting the base angle so every blade tip stays on screen, and
MUST re-fit on resize, on scroll, and when `direction` changes.

A **`swatches` prop (`readonly string[]`)** SHALL restrict the offered blades to
those `PRIMARY_COLORS` keys, preserving `PRIMARY_COLORS` order; unset offers all
of `PRIMARY_COLORS`, and unknown keys MUST be ignored.

A **`direction` prop (`auto` | `up` | `down` | `left` | `right`, default
`auto`)** SHALL set the fan axis and apply `.fan-{direction}` to the fan root.
`auto` MUST resolve from the trigger rect by fanning away from the nearest
viewport edge, and MUST re-resolve on reposition.

A **`preview` prop (default true)** SHALL apply a blade's hue on pointer enter
and restore the value captured at open time when the pointer leaves the fan or
the fan closes without a selection. With `preview` false, only an explicit
selection SHALL change the hue.

An optional **`primary` prop** SHALL switch the component into controlled mode.
When bound, the active value MUST be read from the prop, every change
(preview, restore, and commit) MUST be emitted as `update:primary`, and the
component MUST NOT call the singleton's `setPrimary`. When unbound, the
component MUST read `prefs.primary` and write `setPrimary` as before. Controlled
mode MUST apply to both variants.

#### Scenario: swatch writes through the theme layer

- **GIVEN** an open customizer
- **WHEN** a primary swatch with key `indigo` is clicked
- **THEN** `<html>` carries `data-primary="indigo"`,
  `localStorage["vanduo-primary-color"]` is `indigo`, and the swatch has
  `is-active`

#### Scenario: panel is the default variant

- **GIVEN** `VdThemeCustomizer` mounted with no `variant`
- **WHEN** the trigger is clicked
- **THEN** a `.vd-theme-customizer-panel` opens, no
  `.vd-theme-customizer-fan` exists, and the trigger icon is
  `ph-paint-roller`

#### Scenario: swatches variant fans the restricted set

- **GIVEN** `variant="swatches"` with `:swatches="['blue', 'teal', 'pink']"`
- **WHEN** the trigger is clicked
- **THEN** a `.vd-theme-customizer-fan[role="listbox"]` holds exactly three
  `.tc-fan-item[role="option"]` blades in `PRIMARY_COLORS` order, no
  `.vd-theme-customizer-panel` exists, and the trigger icon is `ph-swatches`

#### Scenario: controlled mode does not write the singleton

- **GIVEN** `variant="swatches"` with `:primary="'blue'"` bound
- **WHEN** the `teal` blade is clicked
- **THEN** `update:primary` is emitted with `teal`,
  `localStorage["vanduo-primary-color"]` is untouched, and the active blade
  stays `blue` until the parent updates the prop

#### Scenario: preview restores on cancel

- **GIVEN** an open uncontrolled fan whose primary is `blue`
- **WHEN** the pointer enters the `pink` blade and then leaves the fan without
  clicking
- **THEN** `data-primary` is `pink` while hovered and back to `blue` after the
  pointer leaves

#### Scenario: fan closes like the panel

- **GIVEN** an open fan
- **WHEN** Escape is pressed, or a pointerdown lands outside the fan and
  trigger
- **THEN** the fan loses `is-open` and the primary captured at open time is
  restored

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

### Requirement: modal-focus-management

`VdModal` MUST manage focus for its `role="dialog"`/`aria-modal="true"` panel
via the existing `useFocusTrap` composable: on open it SHALL record the
previously-focused element, move focus into the panel (first focusable, or the
panel itself when none), and trap Tab/Shift+Tab so focus cycles within the
panel; on close it SHALL deactivate the trap and restore focus to the recorded
element. The `window` `keydown` (Escape) handler MUST be removed unconditionally
on teardown via `onBeforeUnmount`/`onScopeDispose` (SSR-guarded), so a modal
unmounted while open cannot leak a global handler that hijacks Escape. All
browser access stays inside lifecycle hooks (SSR-safe).

#### Scenario: Tab focus is trapped within the panel

- **GIVEN** an open `VdModal` with more than one focusable element
- **WHEN** Tab is pressed on the last focusable (or Shift+Tab on the first)
- **THEN** focus wraps to the first (respectively last) focusable inside the
  panel and never leaves it

#### Scenario: focus returns to the opener on close

- **GIVEN** an element focused before a `VdModal` opens
- **WHEN** the modal opens and then closes
- **THEN** focus moved into the dialog on open and is restored to that opener
  element on close

#### Scenario: no Escape leak after unmount-while-open

- **GIVEN** a `VdModal` mounted open
- **WHEN** it is unmounted without closing and Escape is dispatched on `window`
- **THEN** no `close` or `update:open` is emitted (the global handler was
  detached)

### Requirement: offcanvas-dialog-scroll-lock

`VdOffcanvas` MUST present its panel as a modal dialog — `role="dialog"`,
`aria-modal="true"`, focus-trapped via `useFocusTrap` with focus restored to
the opener on close, matching `VdModal`. It MUST also release the body scroll
lock it applies on open (`document.body.style.overflow`) in `onBeforeUnmount`
(SSR-guarded), so a panel unmounted while open never leaves the page
permanently unscrollable. Browser access stays inside lifecycle hooks.

#### Scenario: panel is a modal dialog

- **GIVEN** an open `VdOffcanvas`
- **WHEN** the `<aside>` is inspected
- **THEN** it carries `role="dialog"` and `aria-modal="true"`

#### Scenario: scroll lock is released on unmount

- **GIVEN** an open `VdOffcanvas` that set `document.body.style.overflow` to
  `"hidden"`
- **WHEN** it is unmounted while still open
- **THEN** `document.body.style.overflow` is reset to `""`

### Requirement: tabs-aria-keyboard

`VdTabs` MUST implement the WAI-ARIA tabs pattern: `role="tablist"` on the tab
buttons' direct parent (`.vd-tab-list`, not the outer wrapper); each tab a
`role="tab"` with a stable `id`, `aria-controls` referencing the panel, and a
roving `tabindex` (`0` on the active tab, `-1` on the rest); the panel container
a `role="tabpanel"` with an `id` and `aria-labelledby` referencing the active
tab. `@keydown` ArrowLeft/ArrowRight (wrapping), Home, and End MUST move both
selection (emitting `update:modelValue`) and DOM focus to the target tab. Click
selection is unchanged.

#### Scenario: ARIA wiring and roving tabindex

- **GIVEN** a `VdTabs` with the second tab active
- **WHEN** the rendered DOM is inspected
- **THEN** `.vd-tab-list` has `role="tablist"`, each tab has an `id` and
  `aria-controls` equal to the panel's `id`, the panel has `role="tabpanel"`
  with `aria-labelledby` equal to the active tab's `id`, and only the active
  tab has `tabindex="0"` (the rest `-1`)

#### Scenario: arrow keys move selection and focus

- **GIVEN** a `VdTabs` with the first tab active and focused
- **WHEN** ArrowRight (then ArrowLeft wrapping, Home, End) are pressed
- **THEN** `update:modelValue` emits the target tab id and DOM focus moves to
  that tab button

### Requirement: custom-select-active-descendant

`VdCustomSelect` MUST expose no dangling IDREF and MUST announce the active
option to assistive tech. Each option SHALL have a stable `id`; the trigger
button SHALL carry `aria-controls` referencing the listbox's `id` and, while
open, `aria-activedescendant` referencing the active option's `id` (absent when
closed). The former dangling `aria-labelledby` fallback MUST be removed (the
button's visible text is its accessible name).

#### Scenario: active descendant tracks the active option

- **GIVEN** a `VdCustomSelect` with no `id`/`name`
- **WHEN** it is opened and the active option moves with the arrow keys
- **THEN** the button's `aria-activedescendant` equals the active option's `id`
  and always resolves to an element that exists; when closed it is absent

#### Scenario: no dangling IDREF

- **GIVEN** a rendered `VdCustomSelect`
- **WHEN** the trigger's `aria-controls` is resolved
- **THEN** it points at the listbox element that exists, and no
  `aria-labelledby` references a non-existent id

### Requirement: rating-radiogroup-roving

`VdRating` MUST be a valid `role="radiogroup"`: `aria-checked="true"` on exactly
the star equal to `current` (all others `false`), and a roving `tabindex` — `0`
on the selected star (the first star when nothing is selected), `-1` on the
rest (all `-1` when `readonly`). Arrow keys MUST move DOM focus to the newly
active star as they change the value.

#### Scenario: exactly one checked radio

- **GIVEN** a `VdRating` with `modelValue` 3
- **WHEN** the stars are inspected
- **THEN** exactly one star has `aria-checked="true"` (the third) and exactly
  one star has `tabindex="0"`

#### Scenario: focus follows the arrow keys

- **GIVEN** a `VdRating` with `modelValue` 3 and its active star focused
- **WHEN** ArrowRight is pressed
- **THEN** `update:modelValue` emits 4 and DOM focus moves to the fourth star

### Requirement: vd-modal-component

`VdModal` SHALL render its dialog panel with a base `vd-modal-panel` class plus a
size modifier `vd-modal-panel-<size>` derived from a `size` prop whose type is
`"sm" | "md" | "lg" | "xl"` (default `"md"`). Each size modifier SHALL resolve the
panel's max width from the corresponding `--vd-modal-width-*` token, and every
size modifier the component can render MUST have a matching selector in the
shipped CSS (enforced by the class-coverage gate). Widening the union is additive
and MUST NOT change the default or the `sm` / `md` / `lg` behavior.

#### Scenario: size maps to a panel width class

- **GIVEN** a `VdModal` rendered with `size="xl"`
- **WHEN** the panel element is inspected
- **THEN** it carries `vd-modal-panel xl` as `vd-modal-panel vd-modal-panel-xl`, and `.vd-modal-panel-xl` resolves `--vd-modal-dialog-max-width` to `var(--vd-modal-width-xl)` (987px)

#### Scenario: default size is md

- **GIVEN** a `VdModal` rendered without a `size` prop
- **WHEN** the panel element is inspected
- **THEN** it carries `vd-modal-panel-md`

### Requirement: VdGlobalSearch command palette

The library SHALL export `VdGlobalSearch` — a Teleport dialog with overlay,
grouped results, optional AI toggle, and keyboard navigation.

#### Scenario: Opens with Cmd/Ctrl+K

- **WHEN** `shortcut` is enabled and the user presses Cmd/Ctrl+K outside an editable field
- **THEN** the modal SHALL open and focus the search input

### Requirement: useGlobalSearch adapter injection

The composable SHALL accept a `GlobalSearchAdapter` with async `search(query, { ai })`.

#### Scenario: Queries the injected adapter

- **WHEN** the user types a query and the debounce window elapses
- **THEN** the composable SHALL call `adapter.search(query, { ai })` and expose the
  returned groups as results, without importing any search engine itself

#### Scenario: AI stays opt-in

- **WHEN** the AI toggle has not been enabled by the user
- **THEN** the composable SHALL pass `ai: false` to the adapter and render no AI notice

### Requirement: vd-dock-tint-mode

`VdDock` MUST accept a **`tintMode` prop (`surface` | `accent`, default
`surface`)** controlling how `tint` is applied. `surface` MUST keep painting
the dock background from the tint hue (the 1.6.0 behavior). `accent` MUST add
`.vd-dock-tint-accent` alongside `.vd-dock-tint-{hue}` so the pill renders as
constant ink while `--vd-dock-tint` stays set for items and the `#brand` slot
to consume. An out-of-range `tintMode` MUST fall back to `surface`, and
`tintMode="accent"` without a `tint` MUST be a no-op.

The package root MUST export `DOCK_TINT_MODES` and `DockTintMode` alongside
the other `DOCK_*` constants and types.

#### Scenario: accent tint keeps the hue but not the surface

- **GIVEN** `VdDock` with `tint="blue"` and `tint-mode="accent"`
- **WHEN** the DOM is inspected
- **THEN** the root carries both `vd-dock-tint-blue` and
  `vd-dock-tint-accent`

#### Scenario: surface is the default tint mode

- **GIVEN** `VdDock` with `tint="blue"` and no `tint-mode`
- **WHEN** the DOM is inspected
- **THEN** the root carries `vd-dock-tint-blue` and does not carry
  `vd-dock-tint-accent`

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
