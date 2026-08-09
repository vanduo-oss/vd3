# Fix native select chevron tiling — Tasks

## 1. CSS

- [x] 1.1 In `css/components/forms.css`, re-declare `background-repeat`,
  `background-position`, and `background-size` on select `:focus` and
  `:disabled` caret rules (and add a short comment on `:focus` explaining why).
- [x] 1.2 Re-declare the same longhands on `[data-theme="dark"]` select /
  `.custom-select-button` default, `:focus`, and `:disabled` caret rules.
- [x] 1.3 Leave multi-select `background-image: none` unchanged.

## 2. Tests

- [x] 2.1 Add a CSS regression spec (authored `forms.css` + built
  `dist/vd3.min.css`) asserting focus / dark / disabled caret image rules
  co-declare `background-repeat: no-repeat` with position and size.

## 3. Verify

- [x] 3.1 `pnpm build` (clean-dist → build-tokens → build-css → vite → vue-tsc →
  check-class-coverage).
- [x] 3.2 `pnpm test`.
- [x] 3.3 `pnpm check:classes` — CSS changed; class-coverage gate must stay green.
- [x] 3.4 `pnpm stylelint` on the CSS tree.

## 4. Release metadata

- [x] 4.1 Bump to `1.2.2` in `package.json` and `VD3_VERSION` (`src/index.ts`),
  update the README status line, and add a `Fixed` CHANGELOG entry for `1.2.2`.

## 5. Downstream / hygiene

- [x] 5.1 Docs sync in `vd3-docs`: add a short Forms note that tinting native
  selects should use `background-color` (or longhands), not the `background`
  shorthand.
- [x] 5.2 `pnpm update` dependencies and devDependencies; fix any fallout;
  local commits only (no push / PR until commanded).
