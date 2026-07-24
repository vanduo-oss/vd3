## Why

vd3's CSS already ships an extra-large modal width — the `--vd-modal-width-xl` token (987px / fib-16) and a legacy `.vd-modal-xl` dialog modifier — but the `VdModal` **component** never exposed it: its `size` prop is `sm` / `md` / `lg` only, and it renders `.vd-modal-panel-<size>`, for which no `-xl` rule exists. The docs even demoed an XL modal via hand-rolled vanilla `.vd-modal-dialog.vd-modal-xl` markup, which was removed in the docs reality-fix (it wasn't a real component API). This wires XL into the component so it's a real, dogfoodable size.

## What Changes

- `VdModal`'s `size` prop gains **`"xl"`** → `size?: "sm" | "md" | "lg" | "xl"` (default stays `"md"`). `size="xl"` renders the `vd-modal-panel-xl` class.
- A new `.vd-modal-panel-xl` rule maps that class to the pre-existing `--vd-modal-width-xl` (987px) token, matching the `-sm`/`-md`/`-lg` pattern.
- Additive and backward-compatible → **minor** bump `1.0.x → 1.1.0`.

## Capabilities

### New Capabilities
- _None._

### Modified Capabilities
- `components`: adds a `vd-modal-component` requirement documenting the `VdModal` `size` tiers (`sm`/`md`/`lg`/`xl`, default `md`) and their `vd-modal-panel-*` mapping.

## Impact

- `src/components/VdModal.vue` (prop type), `css/components/modals.css` (new `.vd-modal-panel-xl`), `tests/components/vd-modal.spec.ts` (xl case), version bump (`package.json`, `VD3_VERSION`, README, CHANGELOG).
- Semver: additive minor. **vd2 → vd3 migration:** none — this only widens the size union, so existing `sm`/`md`/`lg` usage is unaffected, and it restores the XL width the old `@vanduo-oss/vue` / vanilla modal offered via `.vd-modal-xl`.
- **Docs sync (downstream, deferred):** the `/components/modal` XL demo returns once vd3 `1.1.0` is published (vd3-docs consumes the published package).
