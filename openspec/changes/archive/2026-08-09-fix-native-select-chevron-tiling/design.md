## Context

See proposal.md — Why. Today the base select rule sets:

```css
background-image: url("data:image/svg+xml,…");
background-repeat: no-repeat;
background-position: right 0.75rem center;
background-size: var(--vd-select-arrow-size) 12px;
```

`:focus`, `:disabled`, and `[data-theme="dark"]` variants swap only
`background-image` (stroke colour). Per CSS Backgrounds, a consumer
`background: <color>` resets all background longhands; when focus later
sets the image alone, `background-repeat` stays at the initial `repeat`
and the SVG tiles.

Affected selectors live in `css/components/forms.css` (native select +
`.custom-select-button` dark overrides). Multi-select already uses
`background-image: none` and must stay caret-free.

## Goals / Non-Goals

**Goals:**

- Make every caret image override self-contained for repeat / position /
  size so consumer `background` shorthand cannot produce tiling.
- Guard with a source + built-bundle regression test.
- Stay pure CSS; no component API change.

**Non-Goals:**

- Moving the caret off `background-image` (mask / pseudo).
- Tokenising stroke colours via `--vd-select-arrow-color*`.
- System dark (`prefers-color-scheme`) arrow colour parity.

## Decisions

### Re-declare longhands on every image override

**Chosen.** Duplicate the three longhands next to each `background-image`
swap (focus, disabled, dark default/focus/disabled). Matches Bootstrap-style
defensive form CSS and the Labs / flowchart consumer comments.

**Rejected: `!important` on `background-repeat`.** Too aggressive for
legitimate multi-layer consumer backgrounds; longhand re-declaration is
enough for the reported failure mode.

**Rejected: mask-image / ::after caret.** Larger visual surface area,
harder on native `<select>` (limited pseudo support), and out of patch
scope.

### Test against authored forms.css and minified bundle

Mirror `tests/generated-css.spec.ts`: read `css/components/forms.css` for
readable assertions, and after `build-css.mjs` assert minified co-occurrence
of caret `data:image/svg+xml` state overrides with `background-repeat:no-repeat`.

## Risks / Trade-offs

- **[Risk] CSS duplication across state rules** → Mitigation: short comment
  on the focus block explaining why longhands are repeated; regression test
  fails if someone strips them again.
- **[Risk] Size modifiers (`-sm` / `-lg`) change `background-size`** →
  Mitigation: state overrides keep the default size; size rules still set
  their own size on the base selector and cascade normally when no state
  override size is present. Do not shrink sm/lg carets on focus unless we
  later add size-specific focus rules (out of scope).

## Migration Plan

Ship as patch `1.2.2`. No consumer code change required; consumers that
already switched to `background-color` keep working. Rollback = revert the
forms.css longhand lines + version bump.
