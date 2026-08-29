# Add auth screens — Tasks

- [x] 1. Extend `VdInput`: prefix/suffix slots, `revealPassword`, `inputmode` /
      `enterkeyhint` / `autocapitalize` / `spellcheck`, credential defaults,
      `.label-required` when `required`. Extend `vd-input.spec.ts`.
- [x] 2. Add `VdCheckbox` (boolean v-model, `.vd-form-check` markup) + mount spec.
- [x] 3. Add `VdOtpInput` + CSS (`.vd-otp`, `.vd-otp-cell`) + mount spec
      (paste, backspace, autocomplete on first cell).
- [x] 4. Add `glass` to `VdCard`; extend `vd-card.spec.ts`.
- [x] 5. Add `VdAuthCard`, `VdLogin`, `VdSignUp`, `VdForgotPassword` + `auth.css`.
- [x] 6. Barrel exports, types, `SKILL.md` inventory, `VD3_VERSION` / package
      `1.4.0` (with data-table change), CHANGELOG, README status.
- [x] 7. `tests/types/auth-api.test-d.ts` locks for public props/emits.
- [x] 8. `pnpm test:coverage` with v8 thresholds 100% on the new/changed auth
      files only.
- [x] 9. `pnpm build` (includes `check:classes`), `pnpm test`, lint, stylelint,
      format:check, typecheck.
- [x] 10. Docs sync in vd3-docs (separate change): live auth page, forms reveal
      upgrade, security-guide Auth UI subsection.
- [x] 11. Do not push or open a PR until local gates are green and the human reviews.
