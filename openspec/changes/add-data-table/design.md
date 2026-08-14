# Data table — design

## Keep VdTable, add VdDataTable

Widening `VdTable` to TanStack-level features would break the "plain text
`<table>`" contract and every existing snapshot of that markup. A second
component shares `.vd-table` classes so the visual language is one, while the
API can grow (slots, events, selection) without a breaking change.

## Headless state is a composable

`useTableState` is pure Vue (`computed` / `ref`), SSR-safe, no DOM. Pipeline:

1. Filter `rows` by `search` against `searchKeys` (case-insensitive substring).
2. Sort by `sort.key` / `sort.dir` (`asc` | `desc` | `none`).
3. Slice to the current `page` / `pageSize`.

`manual: true` returns `rows` as `viewRows` unchanged (parent already sliced).
Selection (`selectedIds`, `toggle`, `toggleAll`, `allVisibleSelected`) is
always local to the current `viewRows` unless the parent binds
`v-model:selected` on `VdDataTable`.

`VdDataTable` uses the composable internally when `manual` is false, and
exposes the same v-models (`sort`, `selected`, `page`, `search`) for
controlled use.

## Column variant is real here

`VdTable`'s `columns.variant` is documented but never applied. `VdDataTable`
applies `vd-table-{variant}` on the header cell (and body cells inherit via
the existing cell-state CSS when the class is on `th`/`td`).

## Sticky header

`.vd-data-table-scroll` is a max-height overflow container; `thead th` is
`position: sticky; top: 0` with an opaque background so stripes do not show
through. No JS.

## Empty / loading

Loading replaces the body with `VdSkeleton` rows matching column count.
Empty (zero `viewRows`, not loading) renders one `td[colspan]` hosting
`VdEmptyState` (overridable with `#empty`).

## Visualization without a kit

Cell slots (`#cell-{key}`) render whatever the app puts there — `VdAvatar`,
`VdBadge`, `VdProgress`. Docs may sit a cbun `VdChart` *above* the table.
The table itself does not import cbun.

## Pagination API quirk

Existing `VdPagination.total` is **total pages**, not total items. The data
table passes `totalPages` into that prop and keeps its own `pageSize` /
row `total` internally.
