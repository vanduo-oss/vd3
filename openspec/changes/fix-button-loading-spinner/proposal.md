## Why

`.vd-btn.is-loading` blanks the label with `color: transparent` so the `::after`
spinner can sit in its place. The spinner border uses `currentColor`, which
therefore also becomes transparent — unless a solid-variant override forces a
visible colour (white / black). Outline and ghost treatments never got those
overrides, so a CSS-only loading outline/ghost button paints an invisible
spinner. Caught in vd3-docs on `/components/button` (outline loading demo).

## What Changes

- Add spinner-colour rules for every transparent-fill treatment
  (`.vd-btn-outline*`, `.vd-btn-ghost*`, and the plain `.vd-btn` base) so the
  legacy `::after` spinner and the real `.vd-btn-spinner` element stay visible
  while the label is blanked.
- Colours track each treatment's accent (primary / secondary / success /
  warning / error / info / muted), matching how solid variants already pin
  white or black.
- Patch bump `1.2.0 → 1.2.1`.

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `components`: adds a `vd-button-loading-spinner-visibility` requirement so
  outline, ghost, and plain buttons keep a visible loading spinner under
  `.is-loading`.

## Semver

**Patch — bug fix.** `1.2.0 → 1.2.1`. No API, prop, class, or token change.
Buttons that already showed a spinner (solid variants) keep the same colours;
outline/ghost/plain gain the missing colour so the spinner is no longer
invisible. Safe for any consumer on `^1.2.0`.

## Migration note (`@vanduo-oss/vue` → vd3)

None. The donor stylesheet's loading treatment had the same solid-only spinner
colour overrides; this closes a parity gap rather than changing migration
guidance.

## Non-goals

- **No change to how loading is triggered.** `.is-loading`, `VdButton`'s
  `loading` prop, and the `.vd-btn-spinner` span stay as they are.
- **No redesign of the spinner.** Size, animation, and reduced-motion behaviour
  are untouched.
- **No new modifier or variant.** Outline/ghost already exist; they only gain
  the colour rules solids already had.
- **No docs-site content in this package.** vd3-docs can drop its temporary CSS
  compensate once `1.2.1` is published and consumed.
- **No new runtime dependency**, no JS change, no token pipeline change.

## Impact

- `css/components/buttons.css` — outline / ghost / plain spinner colour rules
  for both `::after` and `.vd-btn-spinner`.
- Version bump: `package.json`, `VD3_VERSION` in `src/index.ts`, README status
  line, `CHANGELOG.md`.
- **Docs sync (downstream):** vd3-docs removes the temporary
  `.vd-btn-outline*.is-loading::after` / ghost compensate in `docs.css` once it
  depends on `@vanduo-oss/vd3@^1.2.1`.
