## Architecture

`useGlobalSearch` owns modal state, debounce, keyboard shortcuts, AI opt-in
persistence, and grouping. It calls `adapter.search(query, { ai })` — no knowledge
of Fuse, Transformers, or HybridSearch.

`VdGlobalSearch` is a thin shell mapping composable state to `.vd-global-search*`
markup, matching the vd3-docs palette (listbox only when populated, AI footer).

## Cmd/Ctrl+K ownership

Both `VdDocSearch` and `VdGlobalSearch` can register global shortcuts. Document
that site-wide palettes should mount `VdGlobalSearch` with `shortcut: true` and
set `:keyboard-shortcut="false"` on any inline `VdDocSearch`.

## SSR

Browser listeners register in `onMounted`; guards on `typeof document`.
