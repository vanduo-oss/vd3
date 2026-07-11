## MODIFIED Requirements

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

## ADDED Requirements

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
