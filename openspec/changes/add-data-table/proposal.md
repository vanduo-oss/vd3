# Add data table

## Why

`VdTable` is a presentational CSS table: text cells, no sort, filter, page,
selection, slots, or loading/empty states. A lite admin substrate needs a
headless row pipeline plus a slottable grid that still looks like `.vd-table`.
TanStack Table is rejected (no new runtime deps). A sibling package is deferred
until a real dataProvider exists.

## What Changes

- New `useTableState`: client search → sort → page, plus selection helpers;
  `manual: true` skips the pipeline for server-sliced rows.
- New `VdDataTable`: same visual language as `VdTable`, with sortable headers
  (`aria-sort`), cell/header slots, selection, sticky header, skeleton loading,
  empty state, and composed `VdPagination`.
- New `VdEmptyState` (icon / title / description / action) used by the table
  and reusable elsewhere.
- `VdTable` is **unchanged**.

## Capabilities

### New Capabilities

- `data-table`: headless table state + slottable data grid + empty chrome.

### Modified Capabilities

- _None._ (`VdTable` contract stays exactly as specified.)

## Semver

**Minor — additive.** `1.3.0 → 1.4.0` (shared with `add-auth-screens`).

## Migration note (`@vanduo-oss/vue` → vd3)

None. `VdTable` remains the presentational table. `VdDataTable` is new.

## Non-goals

- Virtualization, column resize / reorder / pin, grouping, Excel export,
  inline cell edit.
- TanStack Table or any new runtime dependency.
- Resource registry, dataProvider, List/Show/Edit/Create (future `vd3-admin`).
- Changing `VdTable` props, slots, or markup.
