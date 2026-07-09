# components Specification

## Purpose
TBD - created by archiving change vd3-carryover. Update Purpose after archive.
## Requirements
### Requirement: carried-component-surface

The package root MUST export the 37 carried SFC components (`VdAccordion`,
`VdAlert`, `VdAvatar`, `VdBadge`, `VdButton`, `VdButtonGroup`, `VdCard`,
`VdCheckboxGroup`, `VdChip`, `VdCodeSnippet`, `VdCollection`,
`VdCustomSelect`, `VdFlow`, `VdIcon`, `VdInput`, `VdModal`, `VdOffcanvas`,
`VdPagination`, `VdPreloader`, `VdProgress`, `VdRadioGroup`, `VdRating`,
`VdSelect`, `VdSeparator`, `VdSidenav`, `VdSkeleton`, `VdSlider`,
`VdSpinner`, `VdSwitch`, `VdTable`, `VdTabs`, `VdToast`, `VdToastContainer`,
`VdTooltip`, `VdTransfer`, `VdTree`, `VdTreeNode`) and the 7 layout
primitives (`VdBox`, `VdCenter`, `VdCover`, `VdFrame`, `VdInline`, `VdStack`,
`VdSwitcher`), carried from the old `@vanduo-oss/vue` package with identical
props, emits, slots, and rendered `vd-*` markup. The shared `StatusVariant`
type (`danger` canonical) and the `TreeNode` type SHALL be re-exported from
the root. `VdMenu` MUST NOT be exported — it depends on the delegating
`useDropdown` and is deferred to the `vd3-rewrites` change.

#### Scenario: barrel exports the carried surface

- **GIVEN** the built package
- **WHEN** the root module's named exports are enumerated
- **THEN** all 44 carried SFC exports are present and `VdMenu` and
  `loadVanduoRuntime` are absent

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

