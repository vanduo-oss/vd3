# Design — sync shipped canonical specs

## Approach

Copy the ADDED requirement blocks from the already-archived changes that were
moved without `openspec archive` promotion. Do not rewrite those requirements.
Archive this change immediately so the deltas land once in `openspec/specs/`.

## Source archives

- `2026-08-15-add-oola-dock`
- `2026-08-16-add-code-snippet-chrome`
- `2026-08-16-add-button-ink-variant`
- `2026-08-14-add-auth-screens`
- `2026-08-14-add-data-table`
- `2026-08-12-seemore-glass-surfaces`
- `2026-08-09-add-liquid-gradient-effect`
- `2026-08-09-fix-native-select-chevron-tiling`

## Decisions

- Keep archive history intact.
- Inventory counts in repo-scaffold / README / SKILL MUST say 63 / 40.
- Leave 1.7.0 deltas (global search, swatches, dock accent) to the
  `2026-09-04-*` archives already merged by `openspec archive`.
