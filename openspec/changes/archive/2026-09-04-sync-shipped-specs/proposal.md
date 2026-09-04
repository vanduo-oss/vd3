# Sync shipped canonical specs

## Why

Several 1.3–1.6 changes were folder-moved into `openspec/changes/archive/`
without promoting their spec deltas into `openspec/specs/`. Canonical specs
still describe the carryover surface (52 components, TBD Purpose lines) while
the package ships Dock, snippet chrome, button ink, auth screens, data table,
Seemore glass, liquid gradient, and the native-select chevron fix.

## What Changes

- Promote the archived ADDED requirements for those shipped capabilities
  into canonical specs (components, composables, css-distribution, and a new
  `data-table` spec).
- Refresh repo-scaffold inventory counts to **63 components / 40 composables**
  and drop the stale `1.0.0` version pin from the version-constant scenario.
- Replace leftover `Purpose: TBD` framing with a one-line purpose on the
  specs this change touches.

## Capabilities

### New Capabilities

- `data-table`: `useTableState`, `VdEmptyState`, `VdDataTable`.

### Modified Capabilities

- `components`, `composables`, `css-distribution`, `repo-scaffold`,
  `design-tokens`, `theme-runtime`.

## Semver

**None.** Documentation-only reconciliation of already-shipped 1.3–1.6
behavior. No package API or CSS change.

## Migration note (`@vanduo-oss/vue` → vd3)

None.

## Non-goals

- Changing runtime code, tokens, or CSS.
- Rewriting historical archive proposals.
- The 1.7.2 on-fill contrast work (`fix-bright-fill-contrast`).
