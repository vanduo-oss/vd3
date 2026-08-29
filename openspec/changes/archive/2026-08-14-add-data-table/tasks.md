# Add data table — Tasks

- [x] 1. Add `useTableState` (`src/composables/useTableState.ts`) +
      `tests/composables/use-table-state.spec.ts` (search, sort, page, manual,
      selection).
- [x] 2. Add `VdEmptyState` + CSS + mount spec.
- [x] 3. Add `VdDataTable` + table CSS (sticky header, sort button, toolbar,
      select column) + mount spec covering sort, search, selection, slots,
      aria-sort, loading, empty, pagination.
- [x] 4. Re-export types; barrel; SKILL.md; CHANGELOG (shared 1.4.0 entry).
- [x] 5. `tests/types/table-state.test-d.ts`.
- [x] 6. Coverage include paths for the new table files; 100% lines/branches.
- [x] 7. Confirm `VdTable` spec and SFC are byte-identical to pre-change
      (no edits).
- [x] 8. `pnpm build`, `pnpm test`, lint, stylelint, format:check, typecheck,
      `check:classes`.
- [x] 9. Docs sync: live table page with VdDataTable + dashboard recipe;
      fix the unused `columns.variant` lie.
- [x] 10. Do not push or open a PR until local gates are green and the human reviews.
