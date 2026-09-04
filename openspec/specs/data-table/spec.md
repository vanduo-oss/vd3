# data-table Specification

## Purpose
`useTableState`, `VdEmptyState`, and `VdDataTable` — client table pipeline and chrome.

## Requirements

### Requirement: use-table-state

The package root MUST export `useTableState`. Given `rows`, `getRowId`,
`pageSize`, and optional `searchKeys`, it SHALL expose `viewRows` produced by
search → sort → page (in that order), plus `total`, `totalPages`, `page`,
`search`, `sort` (`{ key, dir }` where `dir` is `asc` | `desc` | `none`),
and selection helpers (`selectedIds`, `toggle`, `toggleAll`,
`allVisibleSelected`, `someVisibleSelected`). When `manual` is true, `viewRows`
MUST equal the input `rows` (no client search/sort/page). The composable MUST
be SSR-safe (no `window` / `document` at call time).

#### Scenario: client pipeline order

- **GIVEN** eight rows, `search` matching four, `sort` ascending by `name`,
  `pageSize` 2, `page` 1
- **WHEN** `viewRows` is read
- **THEN** it SHALL contain the first two of the filtered, then sorted, rows

#### Scenario: manual mode

- **GIVEN** `manual: true` and three pre-sliced rows
- **WHEN** `search` and `sort` are set
- **THEN** `viewRows` SHALL still be those three rows

#### Scenario: selection toggle

- **GIVEN** a visible row id `"a"`
- **WHEN** `toggle("a")` is called twice
- **THEN** `selectedIds` SHALL contain `"a"` after the first call and not
  after the second

### Requirement: vd-empty-state-component

The package root MUST export `VdEmptyState` with optional `icon`, `title`,
`description`, and an `action` slot, rooted at `.vd-empty`.

#### Scenario: title and action

- **GIVEN** `title="No rows"` and an `#action` slot
- **WHEN** mounted
- **THEN** the title text and the action content SHALL both be present

### Requirement: vd-data-table-component

The package root MUST export `VdDataTable`. It SHALL render `.vd-table` inside
`.vd-data-table` / `.vd-data-table-scroll` / `.vd-table-responsive`, honour
`striped` / `bordered` / `hover` / `sm` / `caption`, apply `columns[].variant`
as `vd-table-{variant}` on the matching `th`, support `sortable` headers with
`aria-sort`, named slots `cell-{key}` and `header-{key}`, `toolbar`, `empty`,
`loading`, `footer`, `selectable` `'none' | 'single' | 'multiple'`,
`v-model:sort`, `v-model:selected`, `v-model:page`, `v-model:search`, sticky
header CSS, skeleton rows when `loading`, `VdEmptyState` when there are no
view rows and not loading, and `VdPagination` in the footer when
`totalPages > 1`. Emits MUST include `row-click`. `VdTable` MUST remain
unmodified.

#### Scenario: sort aria

- **GIVEN** a sortable column `name` currently ascending
- **WHEN** the header is inspected
- **THEN** that `th` SHALL have `aria-sort="ascending"`

#### Scenario: cell slot

- **GIVEN** slot `#cell-name`
- **WHEN** a row renders
- **THEN** the slot content SHALL replace the default text cell for `name`

#### Scenario: select-all

- **GIVEN** `selectable="multiple"` and two visible rows
- **WHEN** the select-all checkbox is checked
- **THEN** `update:selected` SHALL emit both row ids

#### Scenario: VdTable unchanged

- **GIVEN** `VdTable` source
- **WHEN** compared to the pre-change SFC
- **THEN** its props, markup, and lack of slots/events SHALL be identical
