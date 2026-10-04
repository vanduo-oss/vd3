# Fix bright-fill contrast — Tasks

- [x] 1. Archive shipped `add-global-search` and `oola-swatches-dock-accent`
- [x] 2. Add semantic on-fill tokens + hue/theme matrix in DTCG and `tokens.css`
- [x] 3. Replace hardcoded white-on-bright paint on known filled families
- [x] 4. Add Vitest contrast/token contract tests (matrix + selector + negatives)
- [x] 5. Refresh README, SKILL, CONTRIBUTING, changelog; bump to 1.7.2
- [x] 6. `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm stylelint`, `pnpm build`
- [x] 7. Reconciled after release: vd3-docs already pins registry 1.7.4. On 2026-10-04, dogfood the current local successor build with 15 passing Chromium theme/contrast checks across both palettes and all 18 hues. The original 1.7.2-only installation step is superseded; newly reproduced RGB and Fibonacci hover gaps are tracked in fix-verified-quality-gaps.
