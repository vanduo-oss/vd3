## Why

vd3 ships three button treatments — solid (`.vd-btn-primary` …), outlined (`.vd-btn-outline*`,
a transparent fill with a 1px border) and ghost (`.vd-btn-ghost*`, no border at all). All three
paint inside a single border box, so the strongest emphasis the system can express is "solid
fill, 1px border". There is no way to mark one action as *the* action on a screen that already
uses solid buttons for ordinary actions.

The common answer in a design system is a detached outer ring: the button keeps its normal fill,
and a second stroke is drawn a few pixels outside it with a transparent gap between. It reads as
a deliberate frame rather than a heavier button, so it stays legible next to the existing
variants instead of competing with them by getting darker or larger.

vd3 already has this shape elsewhere — `.vd-avatar-ring` (`css/components/avatar.css`) draws a
gap-plus-accent double ring with stacked `box-shadow`s — but buttons never got an equivalent,
and the avatar technique does not transfer (see `design.md`).

## What Changes

- A new opt-in modifier class **`.vd-btn-ring`**, composable with every existing variant, size
  and state. It draws a concentric outer stroke separated from the button by a transparent gap,
  using an absolutely positioned `::before`.
- Five `--vd-btn-ring-*` custom properties in the existing `buttons.css` `:root` block (stroke
  width, gap, per-size gaps, colour), so consumers can retune the ring without overriding rules.
- `VdButton` gains a **`ring?: boolean`** prop (default `false`) that emits the class, so the
  look is reachable from the component API and not only from hand-written markup.
- The ring is suppressed inside `.vd-btn-group` / `.vd-btn-group-vertical`, where buttons
  deliberately overlap by `-1px` and a per-button ring would be incoherent.

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `components`: adds a `vd-button-ring-modifier` requirement covering the `.vd-btn-ring` class,
  its composition with variants and sizes, the `VdButton` `ring` prop, the focus-ring
  interaction and the button-group suppression.

## Semver

**Minor — additive.** `1.1.0 → 1.2.0`. Consistent with `vd3-modal-xl-size`, which took a minor
for widening the `VdModal` `size` union: this adds a new optional prop and a new CSS class and
changes nothing that already exists. No button without `ring` renders differently, no existing
selector is modified, no token is renamed or revalued, nothing is deprecated.

## Migration note (`@vanduo-oss/vue` → vd3)

None required. vd3's `css/components/buttons.css` is the carried donor stylesheet from the old
framework line, and it contains no ring, double-border or offset-outline treatment — the old
line's emphasis ladder stopped at solid / outline / ghost, exactly as vd3's does today. So
`.vd-btn-ring` is new surface rather than a restoration, and no vd2 markup can collide with it.
Worth a line in the vd3-docs migration guide as a vd3-only addition.

## Non-goals

- **Not a new variant.** The ring is a modifier that layers onto whatever variant is already
  there. There is no `.vd-btn-ring-primary` family, and `variant="ring"` is not added to
  `VdButton` — that would double the variant matrix for a purely decorative axis.
- **Not the default button look.** `.vd-btn` is untouched; every existing button renders
  byte-identically.
- **No button-group support.** Grouped buttons share edges by design; the ring is explicitly
  suppressed there rather than half-working.
- **No new DTCG tokens.** The `--vd-btn-ring-*` properties live in `buttons.css`'s `:root`
  block alongside `--vd-btn-padding-*`, which are likewise component-local and outside
  `tokens/`. `tokens-sync.spec.ts` is unaffected.
- **No theme-customizer surface.** `tokens/customizer/options.json` has no button entries today
  and does not gain one here.
- **No new runtime dependency**, no JS-driven measurement, no change to the build pipeline.

## Impact

- `css/components/buttons.css` — ring custom properties, the `.vd-btn-ring` block, per-size
  radius, solid-variant ring colours, focus offset, sibling spacing.
- `css/components/button-group.css` — ring suppression inside groups.
- `src/components/VdButton.vue` — the `ring` prop.
- `tests/components/vd-button.spec.ts` — ring cases.
- Version bump: `package.json`, `VD3_VERSION` in `src/index.ts` (asserted by `tests/smoke.spec.ts`),
  `README.md` status line, `CHANGELOG.md`.
- **Docs sync (downstream):** vd3-docs consumes the published package, so the `/components/button`
  ring demo lands on its own branch and merges once `1.2.0` is published.
