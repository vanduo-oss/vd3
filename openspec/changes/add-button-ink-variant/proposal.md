# Add a VdButton `ink` variant

## Why

vd3 already has three transparent-fill treatments: `.vd-btn-outline*` (1px
stroke, hover fills primary), `.vd-btn-ghost*` (no stroke), and the
`.vd-btn-ring` modifier (detached double stroke). Home marketing CTAs need a
fourth look that none of those can express without fighting the existing
rules: a **fat single outline** at rest, then a **scheme-aware fill** on
hover (black in light, primary in dark). That pair is now required in two
places (Oola live + Seemore), so a one-off docs class is the wrong home.

## What Changes

- New CSS variant **`.vd-btn-ink`**: transparent fill, 2px primary stroke,
  primary text. Hover fills `--vd-color-black` in light and
  `--vd-color-primary` in dark; label uses `--vd-text-on-primary`.
- `VdButton` `variant` union gains **`"ink"`** (alongside status colours and
  `"ghost"`), emitting `.vd-btn-ink`.
- `.vd-btn .vd-visually-hidden` is taken out of flow so an SR-only new-tab
  hint cannot wrap onto a second line and un-center the label.
- Existing `outline` / `ghost` / `ring` selectors are not modified.

## Capabilities

### New Capabilities

- _None._ This is another variant on the existing button.

### Modified Capabilities

- `components`: `vd-button-ink-variant` covering the class, the `VdButton`
  prop, scheme-aware hover, composition with size/ring/loading, and the
  visually-hidden child rule.

## Semver

**Additive on the unreleased 1.6.0 snippet-chrome cut.** No second version
bump. `outline` / `ghost` / `ring` rendering is unchanged.

## Migration note (`@vanduo-oss/vue` → vd3)

None. `.vd-btn-ink` is new surface.

## Non-goals

- Teaching `outline` as a `VdButton` prop (still CSS-only).
- Changing `.vd-btn-outline` hover to black / primary-by-scheme.
- Making ink the default, or a ring replacement.
- A second version number (1.6.1 / 1.7.0) while 1.6.0 is still unreleased.
- Theme-customizer surface or new DTCG tokens.

## Impact

- `css/components/buttons.css` — `.vd-btn-ink` + SR-child containment +
  loading spinner colour.
- `src/components/VdButton.vue` — `variant` union.
- `tests/components/vd-button.spec.ts` — `ink` maps to `.vd-btn-ink`.
- `CHANGELOG.md` — 1.6.0 bullet (no version bump).
- **Docs sync (downstream):** vd3-docs Button page demo + home CTAs.
