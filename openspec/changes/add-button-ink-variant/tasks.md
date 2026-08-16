# Add button ink variant — Tasks

- [x] 1. Add `.vd-btn-ink` (fat 2px outline, scheme-aware hover fill) and
      `.vd-btn .vd-visually-hidden` containment in `css/components/buttons.css`.
      Pin the loading spinner colour. Do not edit `outline` / `ghost` / `ring`
      selectors.
- [x] 2. Widen `VdButton` `variant` to include `"ink"` → `vd-btn-ink`.
- [x] 3. Extend `tests/components/vd-button.spec.ts` so `variant="ink"` maps
      to `vd-btn-ink`.
- [x] 4. CHANGELOG 1.6.0 bullet only — no `package.json` / `VD3_VERSION` bump.
- [x] 5. `pnpm test`, `pnpm build:css`, `pnpm check:classes`, stylelint on
      the CSS edit.
- [x] 6. Docs sync in vd3-docs (separate commit): Button page demo + home
      Oola / Seemore CTAs.
- [x] 7. Do not push, open a PR, or publish until the human reviews.
