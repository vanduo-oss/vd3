# Add Oola Dock — Tasks

- [x] 1. Add instance-scoped `useDockOrientation` + `use-dock-orientation.spec.ts`
      (playTo square waypoint, reduced-motion snap, narrow force, persist key,
      instance isolation).
- [x] 2. Add `css/components/dock.css` and import it in Layer 4 of `css/vd3.css`.
- [x] 3. Add `VdDock` + `VdDockItem` with mount specs (slots, v-model, brand
      toggle, phase classes, tint / glass / radius / itemLayout, contained/fixed,
      a11y).
- [x] 4. Barrel exports, dock types, `SKILL.md` inventory, `VD3_VERSION` /
      package `1.5.0`, CHANGELOG, README status.
- [x] 5. `tests/types/dock-api.test-d.ts` locks for public types.
- [x] 6. `pnpm test:coverage` with v8 thresholds 100% on the new dock files.
- [x] 7. `pnpm build` (includes `check:classes`), `pnpm test`, lint, stylelint,
      format:check, typecheck.
- [x] 8. Docs sync in vd3-docs (separate change): `/components/dock` live
      customizer + home `#home-oola` story.
- [x] 9. Do not push, open a PR, or publish until the human reviews.
