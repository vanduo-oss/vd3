## Why

The vd3-docs site ships a polished Cmd+K global search palette (overlay, grouped
results, AI opt-in) that was intentionally kept app-level. Promoting it to vd3
gives all Vanduo apps the same UX while keeping the search engine injectable.

## What Changes

- `VdGlobalSearch` component — Teleport dialog command palette
- `useGlobalSearch` composable — engine-agnostic via `GlobalSearchAdapter`
- `css/components/global-search.css` — `.vd-global-search*` contract
- Reverses the `vd3-new-components` non-goal that deferred GlobalSearchModal

## Capabilities

### New Capabilities

- `components`: `VdGlobalSearch`
- `composables`: `useGlobalSearch`

### Modified Capabilities

- `css-distribution`: global-search.css import in vd3.css

## Impact

- Additive minor release (1.7.0)
- Zero runtime npm dependencies — adapter injects HybridSearch or any backend
- `VdDocSearch` keeps Cmd/Ctrl+K; global search consumers should disable
  doc-search shortcut when both are mounted

## Non-goals

- Bundling `@vanduo-oss/vdl-hybrid-search` inside vd3
- Replacing `VdDocSearch` or `useSearch`
