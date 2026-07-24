# Tasks

## 1. Component

- [x] 1.1 `src/components/VdModal.vue`: widen `size` to `"sm" | "md" | "lg" | "xl"` (default `"md"` unchanged); `sizeClass` already maps to `vd-modal-panel-${size}`.

## 2. CSS

- [x] 2.1 `css/components/modals.css`: add `.vd-modal-panel-xl { --vd-modal-dialog-max-width: var(--vd-modal-width-xl); }` (the `--vd-modal-width-xl: 987px` token already exists), matching the `-sm`/`-md`/`-lg` rules.

## 3. Test

- [x] 3.1 `tests/components/vd-modal.spec.ts`: add `"xl"` to the parameterized size case so `size="xl"` → `.vd-modal-panel-xl` is asserted.

## 4. Version + docs

- [x] 4.1 Minor bump: `package.json` `1.0.1 → 1.1.0`, `VD3_VERSION`, README Status; rename the unreleased CHANGELOG entry to `1.1.0` and add the `xl` feature under `Added`.

## 5. Verify

- [x] 5.1 `pnpm typecheck` · `pnpm lint` · `pnpm stylelint` · `pnpm test` · `pnpm check:classes` (the new `vd-modal-panel-xl` class the component renders must have a selector) · `pnpm build` — all green.
- [x] 5.2 `openspec validate vd3-modal-xl-size`.

## 6. Downstream (deferred — after publish)

- [ ] 6.1 Restore the `/components/modal` XL demo in vd3-docs once vd3 `1.1.0` is published (docs dogfood the published package).
