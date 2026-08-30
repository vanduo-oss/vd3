# Oola swatches palette + dock accent — Tasks

- [ ] 1. Add `DOCK_TINT_MODES` / `DockTintMode` to `useDockOrientation.ts`;
      add `tintMode` to `VdDock` with `DOCK_TINTS`-style runtime validation.
- [ ] 2. Add `.vd-dock-tint-accent` to `css/components/dock.css` (must beat the
      surface tint rule without `!important`).
- [ ] 3. Add `variant` / `swatches` / `direction` / `preview` / controlled
      `primary` + `update:primary` to `VdThemeCustomizer`; port the hinged fan
      geometry (`FAN_SPREAD` 120, `FAN_SPREAD_MIN` 30, `HINGE_GAP` 26,
      `VIEWPORT_GAP` 12, `fitFanToViewport`, `--i` stagger).
- [ ] 4. Add `.vd-theme-customizer-fan` / `.tc-fan-*` to
      `css/components/theme-customizer.css` with `--vd-customizer-fan-*` vars,
      reduced-motion, and small-viewport rules.
- [ ] 5. Add `.vd-tooltip-dock` to `css/components/tooltips.css` (four arrow
      rules + light-scheme frost treatment).
- [ ] 6. Land the in-flight `useTooltips` `showDelay` /
      `data-tooltip-delay` / `MutationObserver` work.
- [ ] 7. Barrel exports (`DockTintMode`, customizer variant/direction types),
      `SKILL.md` inventory, `VD3_VERSION` + package `1.7.0`, CHANGELOG
      (undated — not released yet), README status.
- [ ] 8. Specs: `vd-theme-customizer.spec.ts` swatches variant (blade count
      from `swatches`, controlled emits without writing the singleton,
      uncontrolled writes it, preview restore on cancel, Escape /
      outside-click, direction classes, `panel` default unchanged);
      `vd-dock.spec.ts` accent tint mode; `use-tooltips.spec.ts` delay.
- [ ] 9. `tests/types/dock-api.test-d.ts` lock for `DockTintMode`;
      `tests/generated-css.spec.ts` for the new classes.
- [ ] 10. `pnpm build` (includes `check:classes`), `pnpm test`, lint,
      stylelint, format:check, typecheck.
- [ ] 11. Docs sync in vd3-docs (separate change `docs-oola-swatches`):
      adopt `tint-mode` + the swatches variant, retire the
      `useDocsDockTooltips` fork and the site-local fan / tooltip / dock
      background CSS, document all of it.
- [ ] 12. Local commit only. Do not push, open a PR, or publish — more
      component changes land before `1.7.0` ships.
