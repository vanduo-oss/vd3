# Fix outline/ghost loading spinner visibility — Tasks

## 1. CSS

- [x] 1.1 In `css/components/buttons.css`, after the solid `.is-loading::after`
  colour rules, add accent colour rules for plain `.vd-btn`, every
  `.vd-btn-outline*`, and every `.vd-btn-ghost*` so the legacy `::after`
  spinner stays visible (accent border + transparent trailing segment).
- [x] 1.2 Add the matching `.vd-btn-spinner` colour rules for the same
  treatments so the real spinner element tracks the accent when present.
- [x] 1.3 Confirm solid primary/secondary/success/warning/danger/error/info
  spinner colours are untouched.

## 2. Verify

- [x] 2.1 `pnpm build` (clean-dist → build-tokens → build-css → vite → vue-tsc →
  check-class-coverage).
- [x] 2.2 `pnpm test`.
- [x] 2.3 `pnpm check:classes` — CSS changed; class-coverage gate must stay green.
- [x] 2.4 `pnpm lint`, `pnpm stylelint`, `pnpm format:check`, `pnpm typecheck`.
- [x] 2.5 Spot-check outline / ghost / plain `.is-loading` buttons in light and
  dark themes (spinner visible; solid variants unchanged).

## 3. Release metadata

- [x] 3.1 Bump to `1.2.1` in `package.json` and `VD3_VERSION` (`src/index.ts`),
  update the README status line, and add a `Fixed` CHANGELOG entry for `1.2.1`.

## 4. Downstream

- [ ] 4.1 Docs sync in `vd3-docs`: bump `@vanduo-oss/vd3` to `^1.2.1` and remove
  the temporary outline/ghost loading compensate from `src/styles/docs.css`.
- [ ] 4.2 Open the PR `dev-v121 → main` and wait for the auto-review agent (do
  not merge).
