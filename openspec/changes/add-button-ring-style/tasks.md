# Add a button ring modifier (`.vd-btn-ring`) — Tasks

- [x] 1. In `css/components/buttons.css`, extend the existing `:root` block with the ring custom
  properties — `--vd-btn-ring-width` (2px), `--vd-btn-ring-gap` (4px), `--vd-btn-ring-gap-sm`
  (2px), `--vd-btn-ring-gap-lg` (6px) and `--vd-btn-ring-color` — following the file's literal-rem
  plus `/* Npx - fib */` comment convention.
- [x] 2. Add the `.vd-btn-ring` block: `position: relative`, the derived `--vd-btn-ring-offset`
  and `--vd-btn-ring-radius`, the margin reservation, and the `::before` ring itself.
- [x] 3. Add the per-size overrides (`.vd-btn-ring.vd-btn-sm`, `.vd-btn-ring.vd-btn-lg`) so the
  gap and the ring radius track `--vd-btn-border-radius-sm` / `-lg`.
- [x] 4. Add the solid-variant ring colours (primary, secondary, success, warning, danger/error,
  info); leave `currentcolor` as the default for plain, outline and ghost treatments.
- [x] 5. Add `.vd-btn + .vd-btn-ring { margin-left: … }` so a ring button preceded by any button
  keeps its clearance, and `.vd-btn-ring:focus-visible` so the focus outline clears the ring.
- [x] 6. In `css/components/button-group.css`, suppress the ring and zero its margins inside
  `.vd-btn-group` and `.vd-btn-group-vertical`, keeping the `-1px` edge-sharing intact.
- [x] 7. In `src/components/VdButton.vue`, add `ring?: boolean` (default `false`) to `Props` and
  emit the static `vd-btn-ring` class from the `:class` binding.
- [x] 8. Extend `tests/components/vd-button.spec.ts`: absent by default, present when `ring`,
  and composing with variant plus size.
- [x] 9. Verify visually across all variants, all three sizes, disabled, loading, icon buttons and
  inside a button group, on both a plain surface and a card, in light and dark themes.
- [x] 10. `pnpm build` (clean-dist → build-tokens → build-css → vite → vue-tsc →
  check-class-coverage) and `pnpm test`.
- [x] 11. `pnpm check:classes` — components and CSS both changed, so the class-coverage gate must
  run and must resolve `vd-btn-ring` against `dist/vd3.min.css`.
- [x] 12. `pnpm lint`, `pnpm stylelint`, `pnpm format:check`, `pnpm typecheck`.
- [x] 13. Bump to `1.2.0` in `package.json` and `VD3_VERSION` (`src/index.ts`, asserted by
  `tests/smoke.spec.ts`), update the README status line, and add the CHANGELOG entry (packages
  only — no docs-site content).
- [ ] 14. Docs sync in `vd3-docs`: a ring demo on `/components/button`, the class-reference and
  component-API rows, nav keywords, the `1.2.0` changelog card, and a refreshed visual baseline.
- [ ] 15. Open the PR `dev-v1.2.0 → main` and wait for the auto-review agent (do not merge).
